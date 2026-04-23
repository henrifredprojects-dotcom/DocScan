import Link from "next/link";
import { notFound } from "next/navigation";

import { ReviewPanel } from "@/components/ReviewPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { WorkspaceBadge } from "@/components/WorkspaceBadge";
import { listWorkspaceCategories } from "@/lib/data/categories";
import { getDocumentById } from "@/lib/data/documents";
import { getSignedDocumentUrl } from "@/lib/supabase/storage";
import { getWorkspaceById } from "@/lib/data/workspaces";

function ChevronLeftIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  );
}

export default async function ReviewDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const document = await getDocumentById(id).catch(() => null);
  if (!document) notFound();

  const [categories, workspace, fileUrl] = await Promise.all([
    listWorkspaceCategories(document.workspace_id).catch(() => []),
    getWorkspaceById(document.workspace_id).catch(() => null),
    getSignedDocumentUrl(document.file_url, 3600).catch(() => document.file_url),
  ]);

  const extracted = { ...(document.extracted_data ?? {}), ...(document.validated_data ?? {}) } as Record<string, unknown>;
  const vendor = String(extracted.vendor ?? "Document");
  const ref = String(extracted.reference_number ?? document.id.slice(0, 8));

  const suggestedName = String(extracted.suggested_category ?? "").toLowerCase().trim();
  const initialCategoryId =
    document.category_id ??
    categories.find((c) => c.name.toLowerCase() === suggestedName)?.id ??
    categories.find((c) => {
      const n = c.name.toLowerCase();
      return suggestedName.includes(n) || n.includes(suggestedName);
    })?.id ??
    "";

  return (
    <div>
      {/* Screen header */}
      <div className="screen-h">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <Link href="/documents" className="btn btn-ghost btn-sm">
              <ChevronLeftIcon /> Documents
            </Link>
            <StatusBadge status={document.status} />
            <span className="src-badge">{document.source}</span>
          </div>
          <h1>{vendor}</h1>
          <p>
            <span className="mono">{ref}</span> · captured {new Date(document.created_at).toLocaleDateString()}
          </p>
        </div>
        <WorkspaceBadge workspace={workspace} />
      </div>

      {/* Split view */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 20, alignItems: "stretch" }}>
        {/* Document viewer */}
        <div style={{
          background: "var(--paper)",
          border: "1px solid var(--ink-200)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minHeight: 640,
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderBottom: "1px solid var(--ink-200)",
            background: "var(--ink-100)",
          }}>
            <div style={{ flex: 1 }} />
            <Link
              href={fileUrl}
              target="_blank"
              className="btn btn-ghost btn-sm"
            >
              <ExternalIcon /> Original
            </Link>
          </div>

          <div style={{
            flex: 1,
            background: "var(--ink-100)",
            position: "relative",
            overflow: "hidden",
          }}>
            <iframe
              title="document preview"
              src={fileUrl}
              style={{ width: "100%", height: "100%", minHeight: 560, border: 0 }}
            />
          </div>
        </div>

        {/* Review form */}
        <ReviewPanel
          document={document}
          categories={categories}
          initialCategoryId={initialCategoryId}
          workspaceName={workspace?.name}
        />
      </div>
    </div>
  );
}
