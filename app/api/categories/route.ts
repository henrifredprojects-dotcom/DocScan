import { NextResponse } from "next/server";

import { createCategory } from "@/lib/data/categories";
import { hasWorkspaceAccess } from "@/lib/data/workspaces";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as {
      workspace_id: string;
      name: string;
      account_code?: string;
    };

    if (!body.workspace_id || !body.name?.trim()) {
      return NextResponse.json({ error: "workspace_id and name are required" }, { status: 400 });
    }

    const allowed = await hasWorkspaceAccess(supabase, body.workspace_id, user.id);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const category = await createCategory({
      workspaceId: body.workspace_id,
      name: body.name.trim(),
      accountCode: body.account_code?.trim() || undefined,
    });

    return NextResponse.json({ ok: true, category });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
