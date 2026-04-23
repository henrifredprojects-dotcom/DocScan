import { NextResponse } from "next/server";

import { updateWorkspace } from "@/lib/data/workspaces";
import { createAndShareSheet } from "@/lib/sheets";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: workspaceId } = await params;
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    if (!user.email) return NextResponse.json({ error: "User has no email." }, { status: 400 });

    // Owner-only — only the workspace owner can create a sheet
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id, name, sheets_template")
      .eq("id", workspaceId)
      .eq("owner_id", user.id)
      .single();

    if (!workspace) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    const { sheetId, tabName } = await createAndShareSheet(
      workspace.name as string,
      user.email,
      workspace.sheets_template as string | null,
    );

    const updated = await updateWorkspace(workspaceId, user.id, {
      sheetsId: sheetId,
      sheetsTab: tabName,
    });

    return NextResponse.json({ ok: true, workspace: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
