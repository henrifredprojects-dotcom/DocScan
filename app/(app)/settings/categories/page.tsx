import { WorkspaceBadge } from "@/components/WorkspaceBadge";
import { listWorkspaceCategories } from "@/lib/data/categories";
import { getCurrentUser, listUserWorkspaces } from "@/lib/data/workspaces";
import { getActiveWorkspaceIdFromCookie, resolveActiveWorkspace } from "@/lib/workspace";
import { CategoriesManager } from "./CategoriesManager";

export default async function CategoriesPage() {
  const user = await getCurrentUser();
  if (!user) return <p>Please login.</p>;

  const workspaces = await listUserWorkspaces(user);
  const activeId = await getActiveWorkspaceIdFromCookie();
  const activeWorkspace = resolveActiveWorkspace(workspaces, activeId);

  if (!activeWorkspace) {
    return (
      <div style={{ padding: "40px 0" }}>
        <p style={{ color: "var(--ink-500)" }}>Create a workspace first.</p>
      </div>
    );
  }

  const categories = await listWorkspaceCategories(activeWorkspace.id).catch(() => []);

  return (
    <div>
      <div className="screen-h">
        <div>
          <h1>Categories</h1>
          <p>
            Accounting categories for{" "}
            <strong>{activeWorkspace.name}</strong> — isolated from other workspaces.
          </p>
        </div>
        <WorkspaceBadge workspace={activeWorkspace} />
      </div>

      <CategoriesManager
        key={activeWorkspace.id}
        initialCategories={categories}
        workspaceId={activeWorkspace.id}
      />
    </div>
  );
}
