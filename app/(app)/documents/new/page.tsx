import { UploadZone } from "@/components/UploadZone";
import { getCurrentUser, listUserWorkspaces } from "@/lib/data/workspaces";
import { getActiveWorkspaceIdFromCookie, resolveActiveWorkspace } from "@/lib/workspace";

function ConfRingIcon() {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "4px 10px",
      borderRadius: 999,
      background: "var(--blue-100)",
      border: "1px solid var(--blue-200)",
      color: "var(--blue-ink)",
      fontSize: 12,
      fontWeight: 600,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--blue-600)", display: "inline-block" }} />
      Active workspace: locked
    </span>
  );
}

export default async function NewDocumentPage() {
  const user = await getCurrentUser();
  if (!user) return <p>Please login.</p>;

  const workspaces = await listUserWorkspaces(user);
  const activeWorkspace = resolveActiveWorkspace(
    workspaces,
    await getActiveWorkspaceIdFromCookie(),
  );

  if (!activeWorkspace) {
    return <p>Create a workspace before uploading documents.</p>;
  }

  return (
    <div>
      <div className="screen-h">
        <div>
          <h1>Capture a document</h1>
          <p>Destination locked to <strong>{activeWorkspace.name}</strong> · AI pre-fills, you validate.</p>
        </div>
        <ConfRingIcon />
      </div>
      <UploadZone workspaceId={activeWorkspace.id} />
    </div>
  );
}
