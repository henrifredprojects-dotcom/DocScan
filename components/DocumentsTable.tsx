"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { format } from "date-fns";

import { StatusBadge } from "@/components/StatusBadge";
import { WorkspaceBadge } from "@/components/WorkspaceBadge";
import type { DocumentRow, DocumentStatus, Workspace } from "@/lib/types";

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  );
}

function getExtracted(doc: DocumentRow) {
  return { ...(doc.extracted_data ?? {}), ...(doc.validated_data ?? {}) } as Record<string, unknown>;
}

export function DocumentsTable({
  documents,
  workspace,
  page = 1,
  total = 0,
  pageSize = 50,
  countsByStatus,
  search = "",
  activeStatus,
}: {
  documents: DocumentRow[];
  workspace?: Pick<Workspace, "id" | "name" | "color" | "currency">;
  page?: number;
  total?: number;
  pageSize?: number;
  countsByStatus?: Record<DocumentStatus, number>;
  search?: string;
  activeStatus?: DocumentStatus;
}) {
  const router = useRouter();
  const [srcFilter, setSrcFilter] = useState<"all" | "upload" | "photo" | "email" | "whatsapp">("all");
  const [searchInput, setSearchInput] = useState(search);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const workspaceId = workspace?.id;
  const workspaceCurrency = workspace?.currency ?? "PHP";
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const totalCounts = countsByStatus ?? {
    pending: documents.filter((d) => d.status === "pending").length,
    validated: documents.filter((d) => d.status === "validated").length,
    rejected: documents.filter((d) => d.status === "rejected").length,
  };

  const exportableCount = totalCounts.validated; // not yet exported — approximation from total validated

  async function exportAll() {
    if (!workspaceId) return;
    setExporting(true);
    setExportMsg(null);
    try {
      const res = await fetch("/api/export/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const payload = (await res.json()) as { ok?: boolean; exported?: number; sheetUrl?: string; error?: string };
      if (payload.ok) {
        const n = payload.exported ?? 0;
        if (n === 0) {
          setExportMsg({ ok: false, text: "Nothing to export. If documents are stuck, use Re-export to reset." });
        } else {
          setExportMsg({ ok: true, text: `${n} document${n > 1 ? "s" : ""} exported ✓` });
          if (payload.sheetUrl) window.open(payload.sheetUrl, "_blank");
        }
        router.refresh();
      } else {
        setExportMsg({ ok: false, text: payload.error ?? "Export failed." });
      }
    } catch {
      setExportMsg({ ok: false, text: "Network error." });
    } finally {
      setExporting(false);
    }
  }

  async function resetAndReExport() {
    if (!workspaceId) return;
    setExporting(true);
    setExportMsg(null);
    try {
      // Reset exported_at on all validated docs
      await fetch("/api/export/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      // Then batch export
      const res = await fetch("/api/export/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const payload = (await res.json()) as { ok?: boolean; exported?: number; sheetUrl?: string; errors?: string[]; error?: string };
      if (payload.ok) {
        const n = payload.exported ?? 0;
        setExportMsg({ ok: n > 0, text: n === 0 ? "No documents exported. Check Settings → Google Sheets." : `${n} document${n > 1 ? "s" : ""} exported ✓` });
        if (n > 0 && payload.sheetUrl) window.open(payload.sheetUrl, "_blank");
        router.refresh();
      } else {
        setExportMsg({ ok: false, text: payload.error ?? "Export failed." });
      }
    } catch {
      setExportMsg({ ok: false, text: "Network error." });
    } finally {
      setExporting(false);
    }
  }

  function buildUrl(overrides: { page?: number; q?: string; status?: DocumentStatus | "all" }) {
    const params = new URLSearchParams();
    const p = overrides.page ?? 1;
    if (p > 1) params.set("page", String(p));
    const q = overrides.q !== undefined ? overrides.q : searchInput.trim();
    if (q) params.set("q", q);
    const st = overrides.status !== undefined ? overrides.status : activeStatus;
    if (st && st !== "all") params.set("status", st);
    const qs = params.toString();
    return `/documents${qs ? `?${qs}` : ""}`;
  }

  function goToPage(p: number) { router.push(buildUrl({ page: p })); }

  function doSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(buildUrl({ q: searchInput.trim(), page: 1 }));
  }

  const filtered = documents.filter((d) => {
    if (srcFilter !== "all" && d.source !== srcFilter) return false;
    return true;
  });

  const statusPills: Array<{ key: DocumentStatus | "all"; label: string }> = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "validated", label: "Validated" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <div>
      <div className="screen-h">
        <div>
          <h1>Documents</h1>
          <p>Accounting pipeline — AI extraction, manual review, Sheets export.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {workspace && <WorkspaceBadge workspace={workspace as Workspace} />}
          {exportMsg && (
            <span style={{ fontSize: 12.5, fontWeight: 500, color: exportMsg.ok ? "oklch(0.4 0.14 160)" : "var(--err)" }}>
              {exportMsg.text}
            </span>
          )}
          <button
            className="btn btn-secondary"
            onClick={exportAll}
            disabled={exporting || !workspaceId || exportableCount === 0}
            title={exportableCount === 0 ? "No validated documents pending export" : "Export validated documents to Sheets"}
          >
            <DownloadIcon /> {exporting ? "Exporting…" : `Export all${exportableCount > 0 ? ` (${exportableCount})` : ""}`}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={resetAndReExport}
            disabled={exporting || !workspaceId}
            title="Reset export status and re-export all validated documents"
            style={{ color: "var(--ink-500)" }}
          >
            {exporting ? "…" : "Re-export all"}
          </button>
          <Link href="/documents/new" className="btn btn-primary">
            <PlusIcon /> Capture
          </Link>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={doSearch} style={{ marginBottom: 12, display: "flex", gap: 8, maxWidth: 420 }}>
        <input
          className="ds-input"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search vendor, reference…"
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-secondary btn-sm">Search</button>
        {search && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => { setSearchInput(""); router.push(buildUrl({ q: "", page: 1 })); }}
          >
            Clear
          </button>
        )}
      </form>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {/* Status pills — link-based for SSR pagination */}
        {statusPills.map(({ key, label }) => {
          const count = key === "all" ? total : totalCounts[key as DocumentStatus];
          const isActive = key === "all" ? !activeStatus : activeStatus === key;
          const href = buildUrl({ status: key as DocumentStatus | "all", page: 1 });
          return (
            <Link
              key={key}
              href={href}
              className="filter-pill"
              style={{
                textDecoration: "none",
                ...(isActive && { background: "var(--blue-600)", color: "#fff", borderColor: "var(--blue-600)" }),
              }}
            >
              {label}
              <span className="c" style={isActive ? { background: "rgba(255,255,255,.2)", color: "#fff" } : undefined}>
                {count}
              </span>
            </Link>
          );
        })}

        <div style={{ width: 1, height: 22, background: "var(--ink-200)", margin: "0 4px" }} />

        {(["all", "upload", "photo", "email", "whatsapp"] as const).map((s) => (
          <button
            key={s}
            className={`filter-pill${srcFilter === s ? " active" : ""}`}
            onClick={() => setSrcFilter(s)}
          >
            {s === "all" ? "All sources" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}

        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "var(--ink-500)" }}>
          {total} total · page {page}/{totalPages}
        </span>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input type="checkbox" style={{ accentColor: "var(--blue-600)" }} />
                </th>
                <th>Vendor</th>
                <th style={{ width: 110 }}>Date</th>
                <th style={{ width: 90 }}>Source</th>
                <th style={{ width: 110, textAlign: "right" }}>Amount</th>
                <th style={{ width: 90, textAlign: "right" }}>VAT</th>
                <th style={{ width: 130 }}>Category</th>
                <th style={{ width: 130 }}>Status</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => {
                const ext = getExtracted(doc);
                return (
                  <tr key={doc.id} className="clickable" onClick={() => router.push(`/documents/${doc.id}/review`)}>
                    <td>
                      <input
                        type="checkbox"
                        style={{ accentColor: "var(--blue-600)" }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td>
                      <strong>{String(ext.vendor ?? "—")}</strong>
                      <div className="mono" style={{ fontSize: 11, color: "var(--ink-500)" }}>
                        {String(ext.reference_number ?? doc.id.slice(0, 8))}
                      </div>
                    </td>
                    <td className="mono" style={{ color: "var(--ink-600)", fontSize: 12.5 }}>
                      {String(ext.date ?? format(new Date(doc.created_at), "yyyy-MM-dd"))}
                    </td>
                    <td>
                      <span className="src-badge">{doc.source}</span>
                    </td>
                    <td className="mono" style={{ textAlign: "right" }}>
                      <strong>
                        {String(ext.currency ?? workspaceCurrency)}
                        {typeof ext.total_amount === "number" ? ext.total_amount.toFixed(2) : "—"}
                      </strong>
                    </td>
                    <td className="mono" style={{ color: "var(--ink-600)", textAlign: "right", fontSize: 12.5 }}>
                      {typeof ext.vat_amount === "number"
                        ? `${ext.currency ?? workspaceCurrency}${ext.vat_amount.toFixed(2)}`
                        : "—"}
                    </td>
                    <td style={{ color: "var(--ink-800)", fontSize: 12.5 }}>
                      {String(ext.category_name ?? ext.suggested_category ?? "—")}
                    </td>
                    <td>
                      <StatusBadge status={doc.status} />
                      {doc.exported_at && (
                        <span className="chip exported" style={{ marginLeft: 4 }}>✓ Sheet</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/documents/${doc.id}/review`);
                        }}
                      >
                        <ChevronRightIcon />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: "40px 20px", textAlign: "center" }}>
                    {total === 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                        <p style={{ margin: 0, color: "var(--ink-500)", fontSize: 13.5 }}>No documents yet in this workspace.</p>
                        <Link href="/documents/new" className="btn btn-primary btn-sm"><PlusIcon /> Capture your first document</Link>
                      </div>
                    ) : (
                      <p style={{ margin: 0, color: "var(--ink-500)", fontSize: 13 }}>No documents match this filter.</p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px",
            borderTop: "1px solid var(--ink-200)",
          }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeftIcon /> Previous
            </button>

            <div style={{ display: "flex", gap: 4 }}>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let p: number;
                if (totalPages <= 7) {
                  p = i + 1;
                } else if (page <= 4) {
                  p = i + 1;
                } else if (page >= totalPages - 3) {
                  p = totalPages - 6 + i;
                } else {
                  p = page - 3 + i;
                }
                return (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    style={{
                      width: 32, height: 32, borderRadius: 7, border: "1px solid",
                      borderColor: p === page ? "var(--blue-600)" : "var(--ink-200)",
                      background: p === page ? "var(--blue-600)" : "transparent",
                      color: p === page ? "#fff" : "var(--ink-700)",
                      fontSize: 13, fontWeight: p === page ? 700 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <button
              className="btn btn-ghost btn-sm"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
            >
              Next <ChevronRightIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
