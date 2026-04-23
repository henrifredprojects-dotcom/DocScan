import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { VendorRule } from "@/lib/types";

export interface VendorRuleWithCategory extends VendorRule {
  category_name: string;
}

export async function listVendorRules(workspaceId: string): Promise<VendorRuleWithCategory[]> {
  const supabase = await getSupabaseServerClient();
  type Row = { id: string; workspace_id: string; vendor_match: string; category_id: string; created_at: string; categories: { name: string } | null };
  const { data, error } = await supabase
    .from("vendor_rules")
    .select("id, workspace_id, vendor_match, category_id, created_at, categories(name)")
    .eq("workspace_id", workspaceId)
    .order("vendor_match", { ascending: true }) as unknown as { data: Row[] | null; error: Error | null };

  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    workspace_id: r.workspace_id,
    vendor_match: r.vendor_match,
    category_id: r.category_id,
    created_at: r.created_at,
    category_name: r.categories?.name ?? "",
  }));
}

export async function createVendorRule(params: {
  workspaceId: string;
  vendorMatch: string;
  categoryId: string;
}): Promise<VendorRule> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("vendor_rules")
    .insert({
      workspace_id: params.workspaceId,
      vendor_match: params.vendorMatch.trim(),
      category_id: params.categoryId,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as VendorRule;
}

export async function deleteVendorRule(ruleId: string, workspaceId: string): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("vendor_rules")
    .delete()
    .eq("id", ruleId)
    .eq("workspace_id", workspaceId);

  if (error) throw error;
}
