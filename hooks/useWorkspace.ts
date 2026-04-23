"use client";

import { useMemo, useState } from "react";

import type { Workspace } from "@/lib/types";

interface WorkspaceHookArgs {
  workspaces: Workspace[];
  initialActiveWorkspaceId: string | null;
}

export function useWorkspace({
  workspaces,
  initialActiveWorkspaceId,
}: WorkspaceHookArgs) {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(
    initialActiveWorkspaceId ?? workspaces[0]?.id ?? null,
  );

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null,
    [activeWorkspaceId, workspaces],
  );

  function switchWorkspace(nextWorkspaceId: string) {
    setActiveWorkspaceId(nextWorkspaceId);
    localStorage.setItem("docscan_active_workspace", nextWorkspaceId);
    document.cookie = `docscan_active_workspace=${nextWorkspaceId};path=/;max-age=2592000`;
  }

  return {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    switchWorkspace,
  };
}
