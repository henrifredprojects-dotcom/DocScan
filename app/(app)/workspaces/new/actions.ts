"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createCategory } from "@/lib/data/categories";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/workspace";

const DEFAULT_CATEGORIES = [
  "Transport", "Meals & Entertainment", "Medical supplies",
  "Equipment", "Rent", "Utilities", "Marketing", "Salaries",
  "Bank fees", "Other",
];

export async function createWorkspaceAction(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Workspace name is required." };

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .insert({
      owner_id: user.id,
      name,
      color: String(formData.get("color") ?? "#1A56DB"),
      currency: String(formData.get("currency") ?? "PHP"),
      sheets_id: String(formData.get("sheets_id") ?? "").trim() || null,
      sheets_tab: String(formData.get("sheets_tab") ?? "").trim() || null,
    })
    .select("*")
    .single();

  if (error) return { error: error.message };

  await Promise.all(
    DEFAULT_CATEGORIES.map((catName) =>
      createCategory({ workspaceId: workspace.id, name: catName, isDefault: true }),
    ),
  );

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspace.id, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/dashboard");
}
