import { NextResponse } from "next/server";

import { deleteWorkspace, updateWorkspace } from "@/lib/data/workspaces";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: workspaceId } = await params;
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as {
      name?: string;
      color?: string;
      currency?: string;
      logo_url?: string | null;
      sheets_id?: string | null;
      sheets_tab?: string | null;
      sheets_template?: string | null;
      confidence_threshold?: number | null;
    };

    const updated = await updateWorkspace(workspaceId, user.id, {
      name: body.name,
      color: body.color,
      currency: body.currency,
      logoUrl: body.logo_url,
      sheetsId: body.sheets_id,
      sheetsTab: body.sheets_tab,
      sheetsTemplate: body.sheets_template,
      confidenceThreshold: body.confidence_threshold,
    });

    return NextResponse.json({ ok: true, workspace: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: workspaceId } = await params;
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    await deleteWorkspace(workspaceId, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
