"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requirePublicEnv } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/workspace";

const DEFAULT_CATEGORIES = [
  "Transport", "Meals & Entertainment", "Medical supplies",
  "Equipment", "Rent", "Utilities", "Marketing", "Salaries",
  "Bank fees", "Other",
];

export async function createWorkspaceAction(
  _prevState: { error: string | null; redirect?: string },
  formData: FormData,
): Promise<{ error: string | null; redirect?: string }> {
  // Verify the user is authenticated using the anon client + cookies
  const env = requirePublicEnv();
  const cookieStore = await cookies();

  const anonClient = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => toSet.forEach(({ name, value, options }) =>
        cookieStore.set(name, value, options)
      ),
    },
  });

  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Workspace name is required." };

  // Use admin client (service role) for DB writes — bypasses RLS
  // Safe because we already verified the user above
  const admin = getSupabaseAdminClient();

  const { data: workspace, error: wsError } = await admin
    .from("workspaces")
    .insert({
      owner_id: user.id,
      name,
      color: String(formData.get("color") ?? "#1A56DB"),
      currency: String(formData.get("currency") ?? "PHP"),
      sheets_id: (() => { const raw = String(formData.get("sheets_id") ?? "").trim(); const m = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/); return (m ? m[1] : raw) || null; })(),
      sheets_tab: String(formData.get("sheets_tab") ?? "").trim() || null,
    })
    .select("*")
    .single();

  if (wsError) return { error: wsError.message };

  await Promise.allSettled(
    DEFAULT_CATEGORIES.map((cat) =>
      admin.from("categories").insert({
        workspace_id: workspace.id,
        name: cat,
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
