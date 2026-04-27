"use server";

import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { requirePublicEnv } from "@/lib/env";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/workspace";

const DEFAULT_CATEGORIES = [
  "Transport", "Meals & Entertainment", "Medical supplies",
  "Equipment", "Rent", "Utilities", "Marketing", "Salaries",
  "Bank fees", "Other",
];

export async function createWorkspaceAction(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null; redirect?: string }> {
  const env = requirePublicEnv();
  const cookieStore = await cookies();

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => toSet.forEach(({ name, value, options }) =>
        cookieStore.set(name, value, options)
      ),
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Workspace name is required." };

  const { data: workspace, error: wsError } = await supabase
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

  if (wsError) return { error: wsError.message };

  await Promise.allSettled(
    DEFAULT_CATEGORIES.map((catName) =>
      supabase.from("categories").insert({
        workspace_id: workspace.id,
        name: catName,
        is_default: true,
        account_code: null,
      })
    ),
  );

  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspace.id, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  });

  return { error: null, redirect: "/dashboard" };
}
