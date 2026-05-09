import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function parseAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return parseAdminEmails().includes(email.toLowerCase());
}

export async function isInvited(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  if (isAdmin(email)) return true;

  const supabase = await getSupabaseServerClient();
  // RLS lets the user read their own invite row only.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("beta_invites")
    .select("id, accepted_at")
    .ilike("email", email)
    .maybeSingle();

  if (!data) return false;

  // First time: stamp accepted_at so we can track activations.
  if (!data.accepted_at) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("beta_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", data.id);
  }

  return true;
}

// Admin-only: list all invites (uses service role, bypasses RLS)
export async function adminListInvites() {
  const admin = getSupabaseAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("beta_invites")
    .select("id, email, invited_at, accepted_at, note")
    .order("invited_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Array<{
    id: string;
    email: string;
    invited_at: string;
    accepted_at: string | null;
    note: string | null;
  }>;
}

export async function adminAddInvite(email: string, invitedBy: string, note: string | null) {
  const admin = getSupabaseAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from("beta_invites").insert({
    email: email.trim().toLowerCase(),
    invited_by: invitedBy,
    note: note?.trim() || null,
  });
  if (error) throw error;
}

export async function adminRemoveInvite(id: string) {
  const admin = getSupabaseAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from("beta_invites").delete().eq("id", id);
  if (error) throw error;
}
