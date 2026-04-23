import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: rule } = await supabase
      .from("vendor_rules")
      .select("workspace_id, workspaces!inner(owner_id)")
      .eq("id", id)
      .single() as unknown as { data: { workspace_id: string; workspaces: { owner_id: string } | null } | null; error: Error | null };

    if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const owner = rule.workspaces?.owner_id;
    if (owner !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { error } = await supabase.from("vendor_rules").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
