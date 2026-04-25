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

function createClient() {
  const env = requirePublicEnv();
  // Create a fresh (non-cached) client so the session cookies are always current
  return cookies().then((cookieStore) =>
    createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        ),
      },
    })
  );
}

export async function createWorkspaceAction(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
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

  // Insert default categories
  const catResults = await Promise.allSettled(
    DEFAULT_CATEGORIES.map((catName) =>
      supabase.from("categories").insert({
        workspace_id: workspace.id,
        name: catName,
        is_default: true,
        account_code: null,
      })
    ),
  );

  const catError = catResults.find((r) => r.status === "rejected");
  if (catError && catError.status === "rejected") {
    console.error("Category insert error:", catError.reason);
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspace.id, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/dashboard");
}
