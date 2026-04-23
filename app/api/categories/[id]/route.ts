import { NextResponse } from "next/server";

import { deleteCategory, updateCategory } from "@/lib/data/categories";
import { getSupabaseServerClient } from "@/lib/supabase/server";

async function getWorkspaceForCategory(supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>, categoryId: string, userId: string) {
  const { data } = await supabase
    .from("categories")
    .select("workspace_id, workspaces!inner(owner_id)")
    .eq("id", categoryId)
    .single() as unknown as { data: { workspace_id: string; workspaces: { owner_id: string } | null } | null; error: Error | null };

  if (!data) return null;
  if (data.workspaces?.owner_id !== userId) return null;
  return data.workspace_id;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceForCategory(supabase, id, user.id);
    if (!workspaceId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = (await request.json()) as { name?: string; account_code?: string | null };

    const updated = await updateCategory({
      categoryId: id,
      workspaceId,
      name: body.name?.trim(),
      accountCode: body.account_code ?? undefined,
    });

    return NextResponse.json({ ok: true, category: updated });
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
    const { id } = await params;
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceForCategory(supabase, id, user.id);
    if (!workspaceId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await deleteCategory(id, workspaceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
