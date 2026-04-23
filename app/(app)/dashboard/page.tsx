import Link from "next/link";
import { format, subMonths } from "date-fns";

import { StatusBadge } from "@/components/StatusBadge";
import { getDashboardData } from "@/lib/data/documents";
import { getCurrentUser, listUserWorkspaces } from "@/lib/data/workspaces";
import { getActiveWorkspaceIdFromCookie, resolveActiveWorkspace } from "@/lib/workspace";
import type { DocumentRow } from "@/lib/types";

// ── Icons ─────────────────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

function CapturedIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  );
}

function ValidatedIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function ExportedIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getExtracted(doc: DocumentRow) {
  return { ...(doc.extracted_data ?? {}), ...(doc.validated_data ?? {}) } as Record<string, unknown>;
}

function fmtAmount(n: number, currency: string) {
  return `${currency} ${n.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Delta({ current, previous, unit = "", invert = false }: {
  current: number;
  previous: number;
  unit?: string;
  invert?: boolean;
}) {
  const diff = current - previous;
  if (previous === 0 && current === 0) return <span style={{ fontSize: 11.5, color: "var(--ink-400)" }}>No data last month</span>;
  const pct = pctChange(current, previous);
  const isUp = diff >= 0;
  const isGood = invert ? !isUp : isUp;
  const color = diff === 0 ? "var(--ink-400)" : isGood ? "oklch(0.45 0.14 160)" : "var(--err)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11.5, fontWeight: 600, color }}>
      {diff !== 0 && (isUp ? <ArrowUpIcon /> : <ArrowDownIcon />)}
      {diff > 0 ? "+" : ""}{unit}{Math.abs(diff).toLocaleString("en-PH", { maximumFractionDigits: 0 })}
      {pct !== null && <span style={{ fontWeight: 400, color: "var(--ink-400)" }}>({pct > 0 ? "+" : ""}{pct}%)</span>}
      {" "}vs {format(subMonths(new Date(), 1), "MMM")}
    </span>
  );
}

function KpiCard({ label, value, sub, accent = false, action, delta }: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  action?: React.ReactNode;
  delta?: React.ReactNode;
}) {
  return (
    <div className="kpi" style={accent ? { borderColor: "var(--blue-300)", background: "var(--blue-100)" } : {}}>
      <div className="kpi-label" style={accent ? { color: "var(--blue-ink)" } : {}}>{label}</div>
      <div className="kpi-value" style={accent ? { color: "var(--blue-600)" } : {}}>{value}</div>
      {delta && <div style={{ marginTop: 4 }}>{delta}</div>}
      {sub && !delta && <div className="kpi-delta">{sub}</div>}
      {action && <div style={{ marginTop: 10 }}>{action}</div>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return <p>Please login to continue.</p>;

  const workspaces = await listUserWorkspaces(user);
  const activeId = await getActiveWorkspaceIdFromCookie();
  const activeWorkspace = resolveActiveWorkspace(workspaces, activeId);

  if (workspaces.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16, textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--blue-100)", display: "grid", placeItems: "center", color: "var(--blue-600)" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
            <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
            <rect x="7" y="7" width="10" height="10" rx="1"/>
          </svg>
        </div>
        <div>
          <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700 }}>Welcome to DocScan</h2>
          <p style={{ margin: 0, color: "var(--ink-500)", fontSize: 14 }}>Create your first workspace to start capturing documents.</p>
        </div>
        <Link href="/workspaces/new" className="btn btn-primary" style={{ marginTop: 4 }}>
          <PlusIcon /> Create workspace
        </Link>
      </div>
    );
  }

  const data = activeWorkspace ? await getDashboardData(activeWorkspace.id) : null;
  const currency = activeWorkspace?.currency ?? "PHP";
  const now = new Date();

  if (!data) {
    return <p style={{ color: "var(--ink-500)" }}>No active workspace.</p>;
  }

  const {
    pendingCount,
    readyToExportCount,
    exportedTotalCount,
    exportedThisWeekCount,
    exportedThisMonthAmount,
    thisMonthCount,
    thisMonthAmount,
    lastMonthCount,
    lastMonthAmount,
    topCategories,
    pendingDocs,
    recentActivity,
  } = data;

  const avgPerDoc = thisMonthCount > 0 ? thisMonthAmount / thisMonthCount : 0;
  const maxCatAmount = topCategories[0]?.amount ?? 1;

  return (
    <div>
      {/* Header */}
      <div className="screen-h">
        <div>
          <h1>Dashboard</h1>
          <p>{activeWorkspace?.name ?? "No workspace"} — {format(now, "MMMM yyyy")}</p>
        </div>
        <Link href="/documents/new" className="btn btn-primary">
          <PlusIcon /> Capture
        </Link>
      </div>

      {/* Row 1 — Pipeline KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 16 }}>
        <KpiCard
          label="Pending review"
          value={pendingCount}
          sub="awaiting manual review"
        />
        <KpiCard
          label="Ready to export"
          value={readyToExportCount}
          sub="validated, not yet in Sheets"
          accent={readyToExportCount > 0}
          action={
            readyToExportCount > 0 ? (
              <Link href="/documents" className="btn btn-primary btn-sm" style={{ width: "100%", justifyContent: "center" }}>
                <SendIcon /> Export all ({readyToExportCount})
              </Link>
            ) : undefined
          }
        />
        <KpiCard
          label={`Invoices — ${format(now, "MMM")}`}
          value={thisMonthCount}
          delta={<Delta current={thisMonthCount} previous={lastMonthCount} />}
          sub={avgPerDoc > 0 ? `avg ${fmtAmount(avgPerDoc, currency)} / invoice` : undefined}
        />
        <KpiCard
          label={`Total — ${format(now, "MMM")}`}
          value={fmtAmount(thisMonthAmount, currency)}
          delta={
            <Delta
              current={Math.round(thisMonthAmount)}
              previous={Math.round(lastMonthAmount)}
              unit={`${currency} `}
            />
          }
        />
      </div>

      {/* Row 2 — Exported strip */}
      <div style={{
        display: "flex", alignItems: "center", gap: 24,
        padding: "14px 20px",
        background: "var(--paper)",
        border: "1px solid var(--ink-200)",
        borderRadius: "var(--radius-lg)",
        marginBottom: 24,
      }}>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: ".06em" }}>Exported to Sheets</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--ink-900)", lineHeight: 1.2, marginTop: 2 }}>{exportedTotalCount}</div>
        </div>
        <div style={{ width: 1, height: 36, background: "var(--ink-200)" }} />
        <div style={{ fontSize: 13, color: "var(--ink-600)" }}>
          <strong>{exportedThisWeekCount}</strong> this week
        </div>
        <div style={{ width: 1, height: 36, background: "var(--ink-200)" }} />
        <div style={{ fontSize: 13, color: "var(--ink-600)" }}>
          <strong>{fmtAmount(exportedThisMonthAmount, currency)}</strong> exported this month
        </div>
        <div style={{ flex: 1 }} />
        <Link href="/documents" className="btn btn-secondary btn-sm">
          All documents <ChevronRightIcon />
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>

        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Priority queue */}
          <div className="card">
            <div className="card-h">
              <div>
                <div className="card-title">Priority queue</div>
                <div className="card-sub">{pendingCount} document{pendingCount !== 1 ? "s" : ""} awaiting review</div>
              </div>
              <Link href="/documents" className="btn btn-ghost btn-sm">See all <ChevronRightIcon /></Link>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th style={{ width: 110 }}>Date</th>
                    <th style={{ width: 120, textAlign: "right" }}>Amount</th>
                    <th style={{ width: 90 }}>Status</th>
                    <th style={{ width: 80 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {pendingDocs.map((doc) => {
                    const ext = getExtracted(doc);
                    return (
                      <tr key={doc.id} className="clickable">
                        <td>
                          <strong>{String(ext.vendor ?? "—")}</strong>
                          <div style={{ fontSize: 11, color: "var(--ink-500)" }}>
                            {String(ext.document_type ?? doc.source)} · {doc.source}
                          </div>
                        </td>
                        <td className="mono" style={{ color: "var(--ink-600)", fontSize: 12.5 }}>
                          {String(ext.date ?? format(new Date(doc.created_at), "yyyy-MM-dd"))}
                        </td>
                        <td className="mono" style={{ textAlign: "right" }}>
                          <strong>
                            {String(ext.currency ?? currency)}
                            {typeof ext.total_amount === "number" ? ext.total_amount.toFixed(2) : "—"}
                          </strong>
                        </td>
                        <td><StatusBadge status={doc.status} /></td>
                        <td style={{ textAlign: "right" }}>
                          <Link href={`/documents/${doc.id}/review`} className="btn btn-secondary btn-sm">
                            Review
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {pendingDocs.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: 40, textAlign: "center", color: "var(--ink-500)" }}>
                        All caught up — no documents pending review.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top categories */}
          <div className="card">
            <div className="card-h">
              <div>
                <div className="card-title">Top categories — {format(now, "MMMM")}</div>
                <div className="card-sub">Spending breakdown by category (validated docs)</div>
              </div>
            </div>
            <div style={{ padding: "8px 20px 16px" }}>
              {topCategories.length === 0 && (
                <p style={{ color: "var(--ink-400)", fontSize: 13, margin: "12px 0" }}>No validated documents this month.</p>
              )}
              {topCategories.map((cat) => {
                const pct = Math.round((cat.amount / maxCatAmount) * 100);
                return (
                  <div key={cat.name} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-800)" }}>{cat.name}</span>
                      <span style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                        <span className="mono" style={{ fontSize: 12, color: "var(--ink-500)" }}>
                          {cat.count} doc{cat.count !== 1 ? "s" : ""}
                        </span>
                        <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-900)" }}>
                          {fmtAmount(cat.amount, currency)}
                        </span>
                      </span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: "var(--ink-100)", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${pct}%`, borderRadius: 3,
                        background: "var(--blue-600)", transition: "width .3s ease",
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column — recent activity */}
        <div className="card" style={{ alignSelf: "start" }}>
          <div className="card-h">
            <div className="card-title">Recent activity</div>
          </div>
          <div style={{ padding: "4px 20px" }}>
            {recentActivity.map((doc) => {
              const ext = getExtracted(doc);
              const isExported = doc.exported_at !== null;
              const isValidated = doc.status === "validated";
              const isRejected = doc.status === "rejected";
              const actionTime = isExported && doc.exported_at ? new Date(doc.exported_at) : new Date(doc.created_at);
              const label = isExported ? "Exported" : isValidated ? "Validated" : isRejected ? "Rejected" : "Captured";
              const iconBg = isExported ? "var(--blue-100)" : isValidated ? "oklch(0.96 0.05 160)" : isRejected ? "oklch(0.97 0.03 25)" : "var(--ink-100)";
              const iconColor = isExported ? "var(--blue-600)" : isValidated ? "oklch(0.4 0.14 160)" : isRejected ? "var(--err)" : "var(--ink-500)";

              return (
                <Link key={doc.id} href={`/documents/${doc.id}/review`} style={{ display: "flex", gap: 12, padding: "11px 0", borderBottom: "1px solid var(--ink-200)", textDecoration: "none", color: "inherit" }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: "grid", placeItems: "center", background: iconBg, color: iconColor }}>
                    {isExported ? <ExportedIcon /> : isValidated ? <ValidatedIcon /> : <CapturedIcon />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-900)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {String(ext.vendor ?? "Document")}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--ink-500)", margin: "2px 0 0" }}>{label}</p>
                  </div>
                  <span style={{ fontSize: 11.5, color: "var(--ink-400)", whiteSpace: "nowrap", alignSelf: "center" }}>
                    {format(actionTime, "MMM d")}
                  </span>
                </Link>
              );
            })}
            {recentActivity.length === 0 && (
              <p style={{ padding: "20px 0", color: "var(--ink-500)", fontSize: 13 }}>No activity yet.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
