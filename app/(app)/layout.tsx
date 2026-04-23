import { redirect } from "next/navigation";

import { WorkspaceSidebar } from "@/components/WorkspaceSidebar";
import { getCurrentUser, listUserWorkspaces } from "@/lib/data/workspaces";
import {
  getActiveWorkspaceIdFromCookie,
  resolveActiveWorkspace,
} from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const workspaces = await listUserWorkspaces(user);
  const activeWorkspaceCookie = await getActiveWorkspaceIdFromCookie();
  const activeWorkspace = resolveActiveWorkspace(workspaces, activeWorkspaceCookie);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <WorkspaceSidebar
        workspaces={workspaces}
        initialActiveWorkspaceId={activeWorkspace?.id ?? null}
        userEmail={user.email ?? ""}
      />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <main style={{ flex: 1, padding: "28px 32px 80px", maxWidth: 1320, width: "100%", margin: "0 auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
