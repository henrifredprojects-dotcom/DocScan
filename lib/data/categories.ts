import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";

export async function listWorkspaceCategories(workspaceId: string): Promise<Category[]> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, account_code, is_default, workspace_id, created_at")
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function createCategory(payload: {
  workspaceId: string;
  name: string;
  accountCode?: string;
  isDefault?: boolean;
}): Promise<Category> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({
      workspace_id: payload.workspaceId,
      name: payload.name,
      account_code: payload.accountCode ?? null,
      is_default: payload.isDefault ?? false,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Category;
}

export async function updateCategory(params: {
  categoryId: string;
  workspaceId: string;
  name?: string;
  accountCode?: string | null;
}): Promise<Category> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .update({
      ...(params.name !== undefined && { name: params.name }),
      ...(params.accountCode !== undefined && { account_code: params.accountCode }),
    })
    .eq("id", params.categoryId)
    .eq("workspace_id", params.workspaceId)
    .select("*")
    .single();
  if (error) throw error;
  return data as Category;
}

export async function deleteCategory(categoryId: string, workspaceId: string): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("workspace_id", workspaceId);

  if (error) throw error;
}
