import { format } from "date-fns";
import { notFound } from "next/navigation";

import { getReportData } from "@/lib/data/documents";
import { getCurrentUser, listUserWorkspaces } from "@/lib/data/workspaces";
import { getActiveWorkspaceIdFromCookie, resolveActiveWorkspace } from "@/lib/workspace";
import { AutoPrint } from "./AutoPrint";

function getExtracted(doc: { extracted_data?: unknown; validated_data?: unknown }) {
  return { ...(doc.extracted_data ?? {}), ...(doc.validated_data ?? {}) } as Record<string, unknown>;
}

export default async function ReportsPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) notFound();

  const workspaces = await listUserWorkspaces(user);
  const activeId = await getActiveWorkspaceIdFromCookie();
  const activeWorkspace = resolveActiveWorkspace(workspaces, activeId);
  if (!activeWorkspace) notFound();

  const now = new Date();
  const { month } = await searchParams;
  const selectedMonth = month ?? format(now, "yyyy-MM");
  const [yearStr, monthStr] = selectedMonth.split("-");
  const displayMonth = format(new Date(Number(yearStr), Number(monthStr) - 1, 1), "MMMM yyyy");
  const currency = activeWorkspace.currency ?? "PHP";

  const monthDocs = await getReportData(activeWorkspace.id, selectedMonth);

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

  return (
    <>
      <AutoPrint />
      <div className="page">
        <div className="header">
          <h1>{activeWorkspace.name}</h1>
          <h2>Expense Report — {displayMonth}</h2>
          <p className="muted" style={{ marginTop: 4, fontSize: 11 }}>
            Generated {format(now, "yyyy-MM-dd HH:mm")} · {monthDocs.length} documents
          </p>
        </div>

        {monthDocs.length === 0 ? (
          <p className="muted">No validated documents for {displayMonth}.</p>
        ) : (
          <>
            <div className="section">
              <div className="section-title">Summary by category</div>
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th className="text-right">Docs</th>
                    <th className="text-right">Total ({currency})</th>
                    <th className="text-right">% of spend</th>
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
                        <td className="mono text-right muted">{count}</td>
                        <td className="mono text-right">{amt.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="mono text-right muted">{grandTotal > 0 ? ((amt / grandTotal) * 100).toFixed(1) : "0"}%</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td className="mono text-right">{monthDocs.length}</td>
                    <td className="mono text-right">{grandTotal.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="mono text-right">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="section">
              <div className="section-title">Document detail</div>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Vendor</th>
                    <th>Category</th>
                    <th>Ref #</th>
                    <th>Payment</th>
                    <th className="text-right">Amount ({currency})</th>
                  </tr>
                </thead>
                <tbody>
                  {monthDocs.map((doc) => {
                    const ext = getExtracted(doc);
                    return (
                      <tr key={doc.id}>
                        <td className="mono muted">{String(ext.date ?? format(new Date(doc.created_at), "yyyy-MM-dd"))}</td>
                        <td><strong>{String(ext.vendor ?? "—")}</strong></td>
                        <td className="muted">{String(ext.suggested_category ?? "—")}</td>
                        <td className="mono muted" style={{ fontSize: 10 }}>{String(ext.reference_number ?? "—")}</td>
                        <td className="muted">{String(ext.payment_method ?? "—")}</td>
                        <td className="mono text-right">
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
          </>
        )}
      </div>
    </>
  );
}
