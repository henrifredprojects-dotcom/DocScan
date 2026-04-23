import { cookies } from "next/headers";

import type { Workspace } from "@/lib/types";

export const ACTIVE_WORKSPACE_COOKIE = "docscan_active_workspace";

export async function getActiveWorkspaceIdFromCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value ?? null;
}

export async function setActiveWorkspaceCookie(workspaceId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function resolveActiveWorkspace(
  workspaces: Workspace[],
  activeWorkspaceId: string | null,
) {
  if (workspaces.length === 0) {
    return null;
  }

  if (!activeWorkspaceId) {
    return workspaces[0];
  }

  return workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? workspaces[0];
}
