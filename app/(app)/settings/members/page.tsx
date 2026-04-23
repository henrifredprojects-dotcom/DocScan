import { MembersManager } from "@/components/MembersManager";
import { listWorkspaceInvites, listWorkspaceMembers } from "@/lib/data/members";
import { getCurrentUser, listUserWorkspaces } from "@/lib/data/workspaces";
import { requirePublicEnv } from "@/lib/env";
import { getActiveWorkspaceIdFromCookie, resolveActiveWorkspace } from "@/lib/workspace";

export default async function MembersSettingsPage() {
  const user = await getCurrentUser();
  if (!user) return <p>Please login.</p>;

  const workspaces = await listUserWorkspaces(user);
  const activeId = await getActiveWorkspaceIdFromCookie();
  const activeWorkspace = resolveActiveWorkspace(workspaces, activeId);

  const { appUrl } = requirePublicEnv();

  if (!activeWorkspace) {
    return (
      <div>
        <div className="screen-h"><div><h1>Members</h1></div></div>
        <div className="card" style={{ padding: 24 }}>
          <p style={{ color: "var(--ink-500)", fontSize: 13 }}>No workspace selected.</p>
        </div>
      </div>
    );
  }

  // Only the owner can manage members
  const isOwner = activeWorkspace.owner_id === user.id;

  const [members, invites] = await Promise.all([
    listWorkspaceMembers(activeWorkspace.id).catch(() => []),
    isOwner ? listWorkspaceInvites(activeWorkspace.id).catch(() => []) : Promise.resolve([]),
  ]);

  return (
    <div>
      <div className="screen-h">
        <div>
          <h1>Members</h1>
          <p>
            Manage access to <strong>{activeWorkspace.name}</strong>.
            {!isOwner && " You are a member of this workspace."}
          </p>
        </div>
        <span style={{
          padding: "4px 12px",
          borderRadius: 999,
          background: "var(--blue-100)",
          color: "var(--blue-ink)",
          fontSize: 12,
          fontWeight: 600,
          border: "1px solid var(--blue-200)",
        }}>
          {members.length + 1} {members.length + 1 === 1 ? "person" : "people"} (incl. owner)
        </span>
      </div>

      {isOwner ? (
        <MembersManager
          workspaceId={activeWorkspace.id}
          appUrl={appUrl}
          members={members}
          invites={invites}
        />
      ) : (
        <div className="card" style={{ padding: 24 }}>
          <p style={{ color: "var(--ink-600)", fontSize: 13 }}>Only the workspace owner can invite or remove members.</p>
        </div>
      )}
    </div>
  );
}
