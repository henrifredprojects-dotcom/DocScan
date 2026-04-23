import { format, subMonths } from "date-fns";

import { getAnalyticsData } from "@/lib/data/documents";
import { getCurrentUser, listUserWorkspaces } from "@/lib/data/workspaces";
import { getActiveWorkspaceIdFromCookie, resolveActiveWorkspace } from "@/lib/workspace";
function getExtracted(doc: { extracted_data?: unknown; validated_data?: unknown }) {
  return { ...(doc.extracted_data ?? {}), ...(doc.validated_data ?? {}) } as Record<string, unknown>;
}

// ── SVG Charts ────────────────────────────────────────────────────────────────

function CategoryChart({ data, max, currency }: { data: [string, number][]; max: number; currency: string }) {
  const BAR_H = 20;
  const GAP = 12;
  const LABEL_W = 120;
  const BAR_W = 210;
  const W = LABEL_W + BAR_W + 110;
  const H = data.length * (BAR_H + GAP) + 4;

  if (data.length === 0) {
    return <p style={{ color: "var(--ink-500)", fontSize: 13, padding: "20px 0" }}>No validated documents yet.</p>;
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }}>
      {data.map(([cat, amt], i) => {
        const y = i * (BAR_H + GAP);
        const barW = max > 0 ? (amt / max) * BAR_W : 0;
        const label = cat.length > 16 ? cat.slice(0, 15) + "…" : cat;
        return (
          <g key={cat}>
            <text x={LABEL_W - 8} y={y + BAR_H / 2 + 4} textAnchor="end" fontSize="11.5" fill="oklch(0.48 0.03 255)">
              {label}
            </text>
            <rect x={LABEL_W} y={y} width={BAR_W} height={BAR_H} rx="5" fill="oklch(0.975 0.006 245)" />
            <rect x={LABEL_W} y={y} width={Math.max(barW, barW > 0 ? 8 : 0)} height={BAR_H} rx="5" fill="oklch(0.6 0.2 255)" />
            <text x={LABEL_W + BAR_W + 10} y={y + BAR_H / 2 + 4} fontSize="11.5" fill="oklch(0.28 0.04 255)" fontWeight="600" fontFamily="monospace">
              {currency} {amt.toLocaleString("en", { maximumFractionDigits: 0 })}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function TrendChart({ data }: { data: { label: string; total: number }[] }) {
  const W = 400;
  const H = 90;
  const PT = 10;
  const PB = 22;
  const PL = 8;
  const PR = 8;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;

  const max = Math.max(...data.map((d) => d.total), 1);
  const n = data.length;
  const xStep = n > 1 ? chartW / (n - 1) : 0;

  const points = data.map((d, i) => ({
    x: PL + (n > 1 ? i * xStep : chartW / 2),
    y: PT + chartH - (d.total / max) * chartH,
    label: d.label,
    total: d.total,
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area =
    `${points[0].x},${PT + chartH} ` + polyline + ` ${points[points.length - 1].x},${PT + chartH}`;

  const allZero = data.every((d) => d.total === 0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.6 0.2 255)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="oklch(0.6 0.2 255)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* baseline */}
      <line x1={PL} y1={PT + chartH} x2={W - PR} y2={PT + chartH} stroke="oklch(0.94 0.01 245)" strokeWidth="1" />
      {!allZero && (
        <>
          <polygon points={area} fill="url(#trendGrad)" />
          <polyline
            points={polyline}
            fill="none"
            stroke="oklch(0.52 0.21 258)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3} fill="oklch(0.52 0.21 258)" />
          ))}
        </>
      )}
      {points.map((p, i) => (
        <text key={i} x={p.x} y={H - 2} textAnchor="middle" fontSize="10" fill="oklch(0.58 0.025 255)">
          {p.label}
        </text>
      ))}
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) return <p>Please login.</p>;

  const workspaces = await listUserWorkspaces(user);
  const activeId = await getActiveWorkspaceIdFromCookie();
  const activeWorkspace = resolveActiveWorkspace(workspaces, activeId);

  const { validatedDocs, allDocs } = activeWorkspace
    ? await getAnalyticsData(activeWorkspace.id)
    : { validatedDocs: [], allDocs: [] };
  const currency = activeWorkspace?.currency ?? "PHP";

  // Category spending
  const catSpendingMap = new Map<string, number>();
  for (const doc of validatedDocs) {
    const ext = getExtracted(doc);
    const cat = String(ext.suggested_category ?? "Uncategorized");
    const amt = typeof ext.total_amount === "number" ? ext.total_amount : 0;
    catSpendingMap.set(cat, (catSpendingMap.get(cat) ?? 0) + amt);
  }
  const catData = Array.from(catSpendingMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7);
  const catMax = Math.max(...catData.map(([, v]) => v), 1);

  // Monthly trend (last 6 months)
  const now = new Date();
  const monthData: { label: string; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i);
    const monthStr = format(d, "yyyy-MM");
    const total = validatedDocs
      .filter((doc) => (doc.created_at ?? "").startsWith(monthStr))
      .reduce((sum, doc) => {
        const ext = getExtracted(doc);
        return sum + (typeof ext.total_amount === "number" ? ext.total_amount : 0);
      }, 0);
    monthData.push({ label: format(d, "MMM"), total });
  }

  // Top vendors
  const vendorMap = new Map<string, number>();
  for (const doc of validatedDocs) {
    const ext = getExtracted(doc);
    const vendor = String(ext.vendor ?? "Unknown");
    if (!vendor || vendor === "Unknown") continue;
    const amt = typeof ext.total_amount === "number" ? ext.total_amount : 0;
    vendorMap.set(vendor, (vendorMap.get(vendor) ?? 0) + amt);
  }
  const vendorData = Array.from(vendorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const vendorMax = Math.max(...vendorData.map(([, v]) => v), 1);

  // Source breakdown
  const sourceCounts: Record<string, number> = {};
  for (const doc of allDocs) {
    sourceCounts[doc.source] = (sourceCounts[doc.source] ?? 0) + 1;
  }

  const sourceColors: Record<string, string> = {
    upload: "var(--blue-600)",
    photo: "oklch(0.55 0.14 160)",
    email: "oklch(0.6 0.18 290)",
    whatsapp: "oklch(0.55 0.18 145)",
  };

  const totalValidatedAmount = validatedDocs.reduce((sum, doc) => {
    const ext = getExtracted(doc);
    return sum + (typeof ext.total_amount === "number" ? ext.total_amount : 0);
  }, 0);

  return (
    <div>
      <div className="screen-h">
        <div>
          <h1>Analytics</h1>
          <p>{activeWorkspace ? `${activeWorkspace.name} — all time` : "Select a workspace"}</p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <div className="kpi">
          <div className="kpi-label">Validated docs</div>
          <div className="kpi-value">{validatedDocs.length}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Total spend</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>
            {currency} {totalValidatedAmount.toLocaleString("en", { maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Avg per doc</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>
            {currency}{" "}
            {validatedDocs.length > 0
              ? (totalValidatedAmount / validatedDocs.length).toLocaleString("en", { maximumFractionDigits: 0 })
              : "0"}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 20, marginBottom: 20 }}>
        {/* Category chart */}
        <div className="card">
          <div className="card-h">
            <div>
              <div className="card-title">Spending by category</div>
              <div className="card-sub">Validated documents only</div>
            </div>
          </div>
          <div className="card-b">
            <CategoryChart data={catData} max={catMax} currency={currency} />
          </div>
        </div>

        {/* Top vendors */}
        <div className="card">
          <div className="card-h">
            <div className="card-title">Top vendors</div>
          </div>
          <div className="card-b" style={{ padding: "0 0 4px" }}>
            {vendorData.length === 0 ? (
              <p style={{ padding: "20px", color: "var(--ink-500)", fontSize: 13 }}>No validated documents yet.</p>
            ) : (
              vendorData.map(([vendor, amt], i) => (
                <div
                  key={vendor}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 20px",
                    borderBottom: i < vendorData.length - 1 ? "1px solid var(--ink-200)" : "none",
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: "var(--ink-100)",
                      color: "var(--ink-500)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {vendor}
                    </div>
                    <div
                      style={{
                        height: 4,
                        borderRadius: 2,
                        background: "var(--ink-100)",
                        marginTop: 5,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${(amt / vendorMax) * 100}%`,
                          background: "var(--blue-500)",
                          borderRadius: 2,
                        }}
                      />
                    </div>
                  </div>
                  <span
                    className="mono"
                    style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-700)", flexShrink: 0 }}
                  >
                    {currency} {amt.toLocaleString("en", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 20 }}>
        {/* Monthly trend */}
        <div className="card">
          <div className="card-h">
            <div>
              <div className="card-title">Monthly spend trend</div>
              <div className="card-sub">Last 6 months — validated documents</div>
            </div>
          </div>
          <div className="card-b">
            <TrendChart data={monthData} />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 10,
                padding: "10px 0 0",
                borderTop: "1px solid var(--ink-200)",
              }}
            >
              {monthData.map((m) => (
                <div key={m.label} style={{ textAlign: "center", flex: 1 }}>
                  <div className="mono" style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-700)" }}>
                    {m.total > 0
                      ? `${(m.total / 1000).toFixed(1)}k`
                      : "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Source breakdown */}
        <div className="card">
          <div className="card-h">
            <div className="card-title">Capture sources</div>
          </div>
          <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {allDocs.length === 0 ? (
              <p style={{ color: "var(--ink-500)", fontSize: 13 }}>No documents yet.</p>
            ) : (
              Object.entries(sourceCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([source, count]) => (
                  <div
                    key={source}
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: sourceColors[source] ?? "var(--ink-400)",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          height: 8,
                          borderRadius: 4,
                          background: "var(--ink-100)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${(count / allDocs.length) * 100}%`,
                            background: sourceColors[source] ?? "var(--ink-400)",
                            borderRadius: 4,
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink-700)", textTransform: "capitalize" }}>
                        {source}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          background: "var(--ink-100)",
                          color: "var(--ink-600)",
                          padding: "1px 7px",
                          borderRadius: 5,
                        }}
                      >
                        {count}
                      </span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
