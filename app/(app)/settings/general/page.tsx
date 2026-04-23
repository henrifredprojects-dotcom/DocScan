import { WorkspaceBadge } from "@/components/WorkspaceBadge";
import { getCurrentUser, listUserWorkspaces } from "@/lib/data/workspaces";
import { getActiveWorkspaceIdFromCookie, resolveActiveWorkspace } from "@/lib/workspace";
import { GeneralSettingsForm } from "./GeneralSettingsForm";

export default async function GeneralSettingsPage() {
  const user = await getCurrentUser();
  if (!user) return <p>Please login.</p>;

  const workspaces = await listUserWorkspaces(user);
  const activeId = await getActiveWorkspaceIdFromCookie();
  const activeWorkspace = resolveActiveWorkspace(workspaces, activeId);

  if (!activeWorkspace) {
    return (
      <div>
        <div className="screen-h"><div><h1>General</h1></div></div>
        <div className="card" style={{ padding: 24 }}>
          <p style={{ color: "var(--ink-500)", fontSize: 13 }}>No workspace selected.</p>
        </div>
      </div>
    );
  }

  const isOwner = activeWorkspace.owner_id === user.id;

  return (
    <div>
      <div className="screen-h">
        <div>
          <h1>General</h1>
          <p>Workspace identity and danger zone — <strong>{activeWorkspace.name}</strong>.</p>
        </div>
        <WorkspaceBadge workspace={activeWorkspace} />
      </div>

      {isOwner ? (
        <GeneralSettingsForm workspace={activeWorkspace} />
      ) : (
        <div className="card" style={{ padding: 24 }}>
          <p style={{ color: "var(--ink-600)", fontSize: 13 }}>Only the workspace owner can edit these settings.</p>
        </div>
      )}
    </div>
  );
}
