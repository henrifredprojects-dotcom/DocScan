import { cache } from "react";
import type { User } from "@supabase/supabase-js";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Workspace } from "@/lib/types";

// React cache() deduplicates within a single request — layout + page calling getCurrentUser()
// triggers only one Supabase auth.getUser() call per render cycle.
export const getCurrentUser = cache(async () => {
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch {
    return null;
  }
});

// Deduplicates within a request — layout fetches workspaces, dashboard page does too:
// only one DB call happens since the User object reference is stable (returned by cached getCurrentUser).
export const listUserWorkspaces = cache(async (user: User): Promise<Workspace[]> => {
  try {
    const supabase = await getSupabaseServerClient();

    const { data: owned } = await supabase
      .from("workspaces")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true });

    const { data: memberships } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id);

    const memberIds = (memberships ?? []).map((m) => m.workspace_id as string);
    let memberWorkspaces: Workspace[] = [];

    if (memberIds.length > 0) {
      const { data: mws } = await supabase
        .from("workspaces")
        .select("*")
        .in("id", memberIds)
        .order("created_at", { ascending: true });
      memberWorkspaces = (mws ?? []) as Workspace[];
    }

    const seen = new Set<string>();
    return [...(owned ?? []), ...memberWorkspaces].filter((ws) => {
      if (seen.has(ws.id)) return false;
      seen.add(ws.id);
      return true;
    }) as Workspace[];
  } catch {
    return [];
  }
});

// Returns true if userId is the owner OR an accepted member of workspaceId.
export async function hasWorkspaceAccess(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").getSupabaseServerClient>>,
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const { data: asOwner } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (asOwner) return true;

  const { data: asMember } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  return !!asMember;
}

export async function getWorkspaceById(workspaceId: string): Promise<Workspace | null> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.from("workspaces").select("*").eq("id", workspaceId).single();
  return (data as Workspace | null) ?? null;
}

export async function updateWorkspace(
  workspaceId: string,
  userId: string,
  payload: {
    name?: string;
    color?: string;
    currency?: string;
    logoUrl?: string | null;
    sheetsId?: string | null;
    sheetsTab?: string | null;
    sheetsTemplate?: string | null;
  },
): Promise<Workspace> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspaces")
    .update({
      ...(payload.name !== undefined && { name: payload.name }),
      ...(payload.color !== undefined && { color: payload.color }),
      ...(payload.currency !== undefined && { currency: payload.currency }),
      ...(payload.logoUrl !== undefined && { logo_url: payload.logoUrl }),
      ...(payload.sheetsId !== undefined && { sheets_id: payload.sheetsId }),
      ...(payload.sheetsTab !== undefined && { sheets_tab: payload.sheetsTab }),
      ...(payload.sheetsTemplate !== undefined && { sheets_template: payload.sheetsTemplate }),
    })
    .eq("id", workspaceId)
    .eq("owner_id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data as Workspace;
}

export async function deleteWorkspace(workspaceId: string, userId: string): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", workspaceId)
    .eq("owner_id", userId);
  if (error) throw error;
}

export async function createWorkspace(payload: {
  userId: string;
  name: string;
  color: string;
  currency: string;
  sheetsId?: string;
  sheetsTab?: string;
}) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspaces")
    .insert({
      owner_id: payload.userId,
      name: payload.name,
      color: payload.color,
      currency: payload.currency,
      sheets_id: payload.sheetsId ?? null,
      sheets_tab: payload.sheetsTab ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Workspace;
}
