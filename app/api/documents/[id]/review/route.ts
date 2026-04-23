import { NextResponse } from "next/server";

import { hasWorkspaceAccess } from "@/lib/data/workspaces";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      status: "pending" | "validated" | "rejected";
      validated_data: Record<string, unknown>;
      category_id?: string | null;
    };

    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: current, error: currentError } = await supabase
      .from("documents")
      .select("id, workspace_id, status")
      .eq("id", id)
      .single();

    if (currentError || !current) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const allowed = await hasWorkspaceAccess(supabase, current.workspace_id, user.id);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const safeCategoryId =
      body.category_id && UUID_RE.test(body.category_id) ? body.category_id : null;

    const { error } = await supabase
      .from("documents")
      .update({
        status: body.status,
        validated_data: body.validated_data,
        category_id: safeCategoryId,
      })
      .eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
