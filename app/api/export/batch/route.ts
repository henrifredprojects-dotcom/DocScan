import { NextResponse } from "next/server";

import { exportToWorkspaceSheet } from "@/lib/sheets";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { DocumentRow, Workspace } from "@/lib/types";

const CONCURRENCY = 5;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { workspaceId: string };
    if (!body.workspaceId) {
      return NextResponse.json({ error: "Missing workspaceId." }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", body.workspaceId)
      .eq("owner_id", user.id)
      .single();

    if (wsError || !workspace) {
      return NextResponse.json({ error: "Forbidden workspace access." }, { status: 403 });
    }

    if (!workspace.sheets_id || !workspace.sheets_tab) {
      return NextResponse.json(
        { error: "Workspace has no Google Sheet configured. Go to Settings → Google Sheets." },
        { status: 422 },
      );
    }

    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("*")
      .eq("workspace_id", body.workspaceId)
      .eq("status", "validated")
      .is("exported_at", null)
      .order("created_at", { ascending: true });

    if (docsError) throw docsError;
    if (!documents || documents.length === 0) {
      return NextResponse.json({ ok: true, exported: 0 });
    }

    const nowIso = new Date().toISOString();
    const errors: string[] = [];
    let exported = 0;

    async function processDoc(doc: Record<string, unknown>) {
      const validatedData = {
        ...((doc.extracted_data ?? {}) as Record<string, unknown>),
        ...((doc.validated_data ?? {}) as Record<string, unknown>),
        user_email: user!.email ?? "",
      };

      await exportToWorkspaceSheet({
        workspace: workspace as Workspace,
        document: doc as unknown as DocumentRow,
        validatedData,
      });

      const { error: updateErr } = await supabase
        .from("documents")
        .update({ exported_at: nowIso })
        .eq("id", doc.id as string);

      if (updateErr) {
        errors.push(`${doc.id}: exported to Sheets but failed to mark in DB — ${updateErr.message}`);
      } else {
        exported++;
      }
    }

    // Process first document sequentially to ensure header row is written if sheet is empty.
    // Then process remaining documents in concurrent batches to maximise throughput.
    const [first, ...rest] = documents;
    try {
      await processDoc(first);
    } catch (err) {
      errors.push(`${first.id}: ${err instanceof Error ? err.message : "Error"}`);
    }

    for (let i = 0; i < rest.length; i += CONCURRENCY) {
      const chunk = rest.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(chunk.map((doc) => processDoc(doc)));
      results.forEach((result, idx) => {
        if (result.status === "rejected") {
          const doc = chunk[idx];
          errors.push(`${doc.id}: ${result.reason instanceof Error ? result.reason.message : "Error"}`);
        }
      });
    }

    return NextResponse.json({ ok: true, exported, errors: errors.length > 0 ? errors : undefined });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
