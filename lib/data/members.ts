import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { WorkspaceInvite, WorkspaceMember } from "@/lib/types";

export async function listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("joined_at", { ascending: true });

  if (!data) return [];

  // Fetch each member's email individually to avoid listUsers() pagination limits
  const admin = getSupabaseAdminClient();
  const enriched = await Promise.all(
    data.map(async (m) => {
      const { data: authUser } = await admin.auth.admin.getUserById(m.user_id as string);
      return { ...m, user_email: authUser.user?.email ?? "" };
    }),
  );

  return enriched as WorkspaceMember[];
}

export async function listWorkspaceInvites(workspaceId: string): Promise<WorkspaceInvite[]> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("workspace_invites")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  return (data ?? []) as WorkspaceInvite[];
}

export async function createInvite(params: {
  workspaceId: string;
  email: string;
  invitedBy: string;
}): Promise<WorkspaceInvite> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspace_invites")
    .insert({
      workspace_id: params.workspaceId,
      email: params.email.toLowerCase().trim(),
      invited_by: params.invitedBy,
      role: "member",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as WorkspaceInvite;
}

export async function getInviteByToken(token: string): Promise<WorkspaceInvite | null> {
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("workspace_invites")
    .select("*")
    .eq("token", token)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  return (data as WorkspaceInvite | null) ?? null;
}

export async function acceptInvite(token: string, userId: string): Promise<{ workspaceId: string }> {
  const admin = getSupabaseAdminClient();

  const invite = await getInviteByToken(token);
  if (!invite) throw new Error("Invite not found, expired, or already used.");

  // Upsert member (idempotent in case they click twice)
  const { error: memberError } = await admin
    .from("workspace_members")
    .upsert(
      {
        workspace_id: invite.workspace_id,
        user_id: userId,
        invited_by: invite.invited_by,
        role: invite.role,
      },
      { onConflict: "workspace_id,user_id" },
    );

  if (memberError) throw memberError;

  // Mark invite as accepted
  await admin
    .from("workspace_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("token", token);

  return { workspaceId: invite.workspace_id };
}

export async function revokeInvite(inviteId: string, workspaceId: string): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("workspace_invites")
    .delete()
    .eq("id", inviteId)
    .eq("workspace_id", workspaceId);

  if (error) throw error;
}

export async function removeMember(memberId: string, workspaceId: string): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("id", memberId)
    .eq("workspace_id", workspaceId);

  if (error) throw error;
}
