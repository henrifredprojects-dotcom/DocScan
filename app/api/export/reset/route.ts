import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Resets exported_at to null for all validated docs in a workspace
// so they can be re-exported after fixing the Google Sheet config.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { workspaceId: string };
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id")
      .eq("id", body.workspaceId)
      .eq("owner_id", user.id)
      .single();
    if (!workspace) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { count, error } = await supabase
      .from("documents")
      .update({ exported_at: null })
      .eq("workspace_id", body.workspaceId)
      .eq("status", "validated")
      .not("exported_at", "is", null);

    if (error) throw error;
    return NextResponse.json({ ok: true, reset: count ?? 0 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error" }, { status: 500 });
  }
}
