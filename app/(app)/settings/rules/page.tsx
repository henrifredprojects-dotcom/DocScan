import { WorkspaceBadge } from "@/components/WorkspaceBadge";
import { listWorkspaceCategories } from "@/lib/data/categories";
import { listVendorRules } from "@/lib/data/vendor_rules";
import { getCurrentUser, listUserWorkspaces } from "@/lib/data/workspaces";
import { getActiveWorkspaceIdFromCookie, resolveActiveWorkspace } from "@/lib/workspace";
import { RulesManager } from "./RulesManager";

export default async function RulesPage() {
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

  const [categories, rules] = await Promise.all([
    listWorkspaceCategories(activeWorkspace.id).catch(() => []),
    listVendorRules(activeWorkspace.id).catch(() => []),
  ]);

  return (
    <div>
      <div className="screen-h">
        <div>
          <h1>Vendor rules</h1>
          <p>
            Auto-assign categories when a vendor name matches a pattern —{" "}
            <strong>{activeWorkspace.name}</strong>.
          </p>
        </div>
        <WorkspaceBadge workspace={activeWorkspace} />
      </div>

      <RulesManager
        key={activeWorkspace.id}
        initialRules={rules}
        categories={categories}
        workspaceId={activeWorkspace.id}
      />
    </div>
  );
}
