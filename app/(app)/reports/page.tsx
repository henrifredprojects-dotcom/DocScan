import { format } from "date-fns";

import { PdfButton } from "@/components/PdfButton";
import { getReportData } from "@/lib/data/documents";
import { getCurrentUser, listUserWorkspaces } from "@/lib/data/workspaces";
import { getActiveWorkspaceIdFromCookie, resolveActiveWorkspace } from "@/lib/workspace";

function getExtracted(doc: { extracted_data?: unknown; validated_data?: unknown }) {
  return { ...(doc.extracted_data ?? {}), ...(doc.validated_data ?? {}) } as Record<string, unknown>;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;

  const user = await getCurrentUser();
  if (!user) return <p>Please login.</p>;

  const workspaces = await listUserWorkspaces(user);
  const activeId = await getActiveWorkspaceIdFromCookie();
  const activeWorkspace = resolveActiveWorkspace(workspaces, activeId);

  const now = new Date();
  const selectedMonth = month ?? format(now, "yyyy-MM");
  const [yearStr, monthStr] = selectedMonth.split("-");
  const displayMonth = format(new Date(Number(yearStr), Number(monthStr) - 1, 1), "MMMM yyyy");

  const monthDocs = activeWorkspace ? await getReportData(activeWorkspace.id, selectedMonth) : [];
  const currency = activeWorkspace?.currency ?? "PHP";

  // Totals by category
  const catMap = new Map<string, number>();
  let grandTotal = 0;
  for (const doc of monthDocs) {
    const ext = getExtracted(doc);
    const cat = String(ext.suggested_category ?? "Uncategorized");
    const amt = typeof ext.total_amount === "number" ? ext.total_amount : 0;
    catMap.set(cat, (catMap.get(cat) ?? 0) + amt);
    grandTotal += amt;
  }
  const catTotals = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);

  // Build month options — last 12 months
  const monthOptions: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push({ value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") });
  }

  return (
    <>
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .card { border: 1px solid #ddd !important; box-shadow: none !important; }
        }
      `}</style>

      <div>
        {/* Header */}
        <div className="screen-h no-print">
          <div>
            <h1>Reports</h1>
            <p>Monthly expense summary — ready to print or save as PDF</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <form>
              <select
                name="month"
                defaultValue={selectedMonth}
                className="ds-select"
                style={{ width: "auto" }}
                onChange={(e) => {
                  // server-side navigation via form submit
                }}
              >
                {monthOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </form>
            <PdfButton month={selectedMonth} />
          </div>
        </div>

        {/* Print header (only visible in print) */}
        <div style={{ display: "none" }} className="print-only">
          <h2 style={{ margin: "0 0 4px" }}>{activeWorkspace?.name ?? "DocScan"}</h2>
          <p style={{ margin: "0 0 20px", color: "#666" }}>
            Expense Report — {displayMonth}
          </p>
        </div>

        {/* Month selector that actually works */}
        <div className="no-print" style={{ marginBottom: 24 }}>
          <form method="GET">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, color: "var(--ink-600)", fontWeight: 500 }}>Period:</span>
              <select
                name="month"
                defaultValue={selectedMonth}
                className="ds-select"
                style={{ width: "auto" }}
                onChangeCapture={undefined}
              >
                {monthOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn btn-secondary btn-sm">Apply</button>
            </div>
          </form>
        </div>

        {/* Report title */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>
              {displayMonth}
            </h2>
            <span style={{ fontSize: 13, color: "var(--ink-500)" }}>
              {activeWorkspace?.name ?? ""}
            </span>
          </div>
        </div>

        {monthDocs.length === 0 ? (
          <div className="card" style={{ padding: "48px 24px", textAlign: "center", color: "var(--ink-500)" }}>
            No validated documents for {displayMonth}.
          </div>
        ) : (
          <>
            {/* Summary by category */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-h">
                <div className="card-title">Summary by category</div>
              </div>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th style={{ textAlign: "right" }}>Documents</th>
                    <th style={{ textAlign: "right" }}>Total ({currency})</th>
                    <th style={{ textAlign: "right" }}>% of spend</th>
                  </tr>
                </thead>
                <tbody>
                  {catTotals.map(([cat, amt]) => {
                    const count = monthDocs.filter((d) => {
                      const ext = getExtracted(d);
                      return String(ext.suggested_category ?? "Uncategorized") === cat;
                    }).length;
                    return (
                      <tr key={cat}>
                        <td><strong>{cat}</strong></td>
                        <td className="mono" style={{ textAlign: "right", color: "var(--ink-600)" }}>{count}</td>
                        <td className="mono" style={{ textAlign: "right", fontWeight: 600 }}>
                          {amt.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="mono" style={{ textAlign: "right", color: "var(--ink-600)" }}>
                          {grandTotal > 0 ? ((amt / grandTotal) * 100).toFixed(1) : "0"}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: "var(--ink-100)" }}>
                    <td style={{ fontWeight: 700, fontSize: 13 }}>Total</td>
                    <td className="mono" style={{ textAlign: "right", fontWeight: 700 }}>{monthDocs.length}</td>
                    <td className="mono" style={{ textAlign: "right", fontWeight: 700, fontSize: 14 }}>
                      {grandTotal.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="mono" style={{ textAlign: "right", fontWeight: 700 }}>100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Document detail */}
            <div className="card">
              <div className="card-h">
                <div className="card-title">Document detail</div>
              </div>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Vendor</th>
                    <th>Category</th>
                    <th>Ref #</th>
                    <th style={{ textAlign: "right" }}>Amount ({currency})</th>
                  </tr>
                </thead>
                <tbody>
                  {monthDocs.map((doc) => {
                    const ext = getExtracted(doc);
                    return (
                      <tr key={doc.id}>
                        <td className="mono" style={{ fontSize: 12.5, color: "var(--ink-600)", whiteSpace: "nowrap" }}>
                          {String(ext.date ?? format(new Date(doc.created_at), "yyyy-MM-dd"))}
                        </td>
                        <td><strong>{String(ext.vendor ?? "—")}</strong></td>
                        <td style={{ color: "var(--ink-600)", fontSize: 13 }}>
                          {String(ext.suggested_category ?? "—")}
                        </td>
                        <td className="mono" style={{ fontSize: 12, color: "var(--ink-500)" }}>
                          {String(ext.reference_number ?? "—")}
                        </td>
                        <td className="mono" style={{ textAlign: "right", fontWeight: 600 }}>
                          {typeof ext.total_amount === "number"
                            ? ext.total_amount.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer note */}
            <div style={{ marginTop: 16, fontSize: 12, color: "var(--ink-500)", textAlign: "right" }}>
              Generated by DocScan · {format(now, "yyyy-MM-dd HH:mm")}
            </div>
          </>
        )}
      </div>
    </>
  );
}
