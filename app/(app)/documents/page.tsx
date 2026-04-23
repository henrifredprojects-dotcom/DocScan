import Link from "next/link";

import { DocumentsTable } from "@/components/DocumentsTable";
import { listWorkspaceDocumentsPaginated } from "@/lib/data/documents";
import { getCurrentUser, listUserWorkspaces } from "@/lib/data/workspaces";
import type { DocumentStatus } from "@/lib/types";
import { getActiveWorkspaceIdFromCookie, resolveActiveWorkspace } from "@/lib/workspace";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return <p>Please login.</p>;

  const workspaces = await listUserWorkspaces(user);
  const activeId = await getActiveWorkspaceIdFromCookie();
  const activeWorkspace = resolveActiveWorkspace(workspaces, activeId);

  if (!activeWorkspace) {
    return (
      <div style={{ padding: "40px 0" }}>
        <div className="card" style={{ padding: 24, maxWidth: 480 }}>
          <p className="card-sub" style={{ marginBottom: 12 }}>No workspace found. Create one to get started.</p>
          <Link href="/workspaces/new" className="btn btn-primary">Create workspace</Link>
        </div>
      </div>
    );
  }

  const { page: pageStr, q, status: statusParam } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
  const search = q?.trim() ?? "";
  const validStatuses: DocumentStatus[] = ["pending", "validated", "rejected"];
  const statusFilter = validStatuses.includes(statusParam as DocumentStatus)
    ? (statusParam as DocumentStatus)
    : undefined;

  const { documents, total, pageSize, countsByStatus } = await listWorkspaceDocumentsPaginated(
    activeWorkspace.id,
    page,
    search || undefined,
    statusFilter,
  );

  return (
    <DocumentsTable
      documents={documents}
      workspace={activeWorkspace}
      page={page}
      total={total}
      pageSize={pageSize}
      countsByStatus={countsByStatus}
      search={search}
      activeStatus={statusFilter}
    />
  );
}
