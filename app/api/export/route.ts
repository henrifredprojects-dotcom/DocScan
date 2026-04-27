import { NextResponse } from "next/server";

import { exportToWorkspaceSheet } from "@/lib/sheets";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { DocumentRow, Workspace } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { documentId: string };
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", body.documentId)
      .single();

    if (documentError || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Allow re-export if forced (e.g. sheet was misconfigured before)
    const force = (body as { documentId: string; force?: boolean }).force === true;
    if (document.exported_at && !force) {
      return NextResponse.json({ error: "Document already exported." }, { status: 409 });
    }

    // RLS allows both owners and members to read their workspace.
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", document.workspace_id)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: "Forbidden workspace access" }, { status: 403 });
    }

    const validatedData = {
      ...((document.extracted_data ?? {}) as Record<string, unknown>),
      ...((document.validated_data ?? {}) as Record<string, unknown>),
      user_email: user.email ?? "",
    };

    if (!workspace.sheets_id || !workspace.sheets_tab) {
      // No sheet configured — just validate, don't set exported_at
      await supabase.from("documents").update({ status: "validated", validated_data: validatedData }).eq("id", body.documentId);
      return NextResponse.json({ ok: true, exported_at: null, warning: "No Google Sheet configured for this workspace. Document validated but not exported. Configure a sheet in Settings → Google Sheets." });
    }

    // Try sheets export — only set exported_at if it succeeds
    try {
      await exportToWorkspaceSheet({
        workspace: workspace as Workspace,
        document: document as DocumentRow,
        validatedData,
      });
    } catch (sheetsErr) {
      const raw = sheetsErr instanceof Error ? sheetsErr.message : String(sheetsErr);
      // Save as validated but do NOT set exported_at so it can be re-exported later
      await supabase.from("documents").update({ status: "validated", validated_data: validatedData }).eq("id", body.documentId);
      return NextResponse.json({ ok: true, exported_at: null, warning: `Document validated but not exported to Sheets: ${raw}` });
    }

    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("documents")
      .update({ status: "validated", exported_at: nowIso, validated_data: validatedData })
      .eq("id", body.documentId);

    if (updateError) throw updateError;

    return NextResponse.json({ ok: true, exported_at: nowIso });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
