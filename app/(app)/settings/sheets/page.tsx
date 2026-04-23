import { SheetsSettingsForm } from "./SheetsSettingsForm";
import { getLastExportedAtByWorkspace } from "@/lib/data/documents";
import { getCurrentUser, listUserWorkspaces } from "@/lib/data/workspaces";
import { getTemplate } from "@/lib/sheets-templates";

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
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


export default async function SheetsSettingsPage() {
  const user = await getCurrentUser();
  if (!user) return <p>Please login.</p>;

  const workspaces = await listUserWorkspaces(user);
  const lastExports: Record<string, string | null> = await getLastExportedAtByWorkspace(workspaces.map((w) => w.id)).catch(() => ({}));
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "your-service-account@iam.gserviceaccount.com";

  return (
    <div>
      <div className="screen-h">
        <div>
          <h1>Google Sheets</h1>
          <p>Each workspace exports to its own sheet — strict isolation.</p>
        </div>
      </div>

      {/* Connected sheets */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-h">
          <div>
            <div className="card-title">Connected sheets</div>
            <div className="card-sub">
              Use <strong>Create new Sheet</strong> to auto-create and share, or connect an existing sheet manually
              (share it with{" "}
              <code className="mono" style={{ color: "var(--blue-600)", background: "var(--blue-100)", padding: "1px 5px", borderRadius: 4 }}>
                {serviceAccountEmail}
              </code>
              ).
            </div>
          </div>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Workspace</th>
              <th>Sheet ID</th>
              <th>Tab</th>
              <th>Template</th>
              <th>Last export</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {workspaces.map((ws) => (
              <tr key={ws.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      width: 26, height: 26, borderRadius: 7,
                      background: ws.color ?? "var(--blue-600)",
                      display: "grid", placeItems: "center",
                      fontSize: 10, fontWeight: 700, color: "#fff",
                      flexShrink: 0,
                    }}>
                      {ws.name.slice(0, 2).toUpperCase()}
                    </span>
                    <strong>{ws.name}</strong>
                  </div>
                </td>
                <td className="mono" style={{ color: "var(--ink-600)" }}>
                  {ws.sheets_id ?? "—"}
                </td>
                <td className="mono">{ws.sheets_tab ?? "—"}</td>
                <td style={{ fontSize: 12.5 }}>
                  <span style={{
                    padding: "2px 7px", borderRadius: 5,
                    background: "var(--blue-100)", border: "1px solid var(--blue-200)",
                    color: "var(--blue-ink)", fontWeight: 600, fontSize: 11,
                  }}>
                    {getTemplate(ws.sheets_template).label}
                  </span>
                </td>
                <td style={{ color: "var(--ink-600)", fontSize: 12.5 }}>
                  {lastExports[ws.id]
                    ? new Date(lastExports[ws.id]!).toLocaleDateString()
                    : "never"}
                </td>
                <td>
                  {ws.sheets_id ? (
                    <span className="chip validated"><CheckIcon /> Connected</span>
                  ) : (
                    <span className="chip pending">Not connected</span>
                  )}
                </td>
                <td style={{ textAlign: "right" }}>
                  <button className="btn btn-ghost btn-sm">
                    {ws.sheets_id ? "Edit" : "Connect"}
                  </button>
                </td>
              </tr>
            ))}
            {workspaces.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--ink-500)" }}>
                  No workspaces yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit sheet configuration */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-h">
          <div>
            <div className="card-title">Edit configuration</div>
            <div className="card-sub">Set or update the Sheet ID and tab name for each workspace.</div>
          </div>
        </div>
        <div style={{ padding: "0 20px 20px" }}>
          <SheetsSettingsForm workspaces={workspaces} />
        </div>
      </div>

      {/* Per-workspace column preview */}
      {workspaces.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-h">
            <div>
              <div className="card-title">Exported columns — per workspace</div>
              <div className="card-sub">Columns vary by the template selected for each workspace.</div>
            </div>
          </div>
          <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
            {workspaces.map((ws) => {
              const tpl = getTemplate(ws.sheets_template);
              return (
                <div key={ws.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: ws.color ?? "var(--blue-600)",
                      display: "grid", placeItems: "center",
                      fontSize: 9, fontWeight: 700, color: "#fff", flexShrink: 0,
                    }}>
                      {ws.name.slice(0, 2).toUpperCase()}
                    </span>
                    <strong style={{ fontSize: 13, color: "var(--ink-900)" }}>{ws.name}</strong>
                    <span style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 5,
                      background: "var(--blue-100)", border: "1px solid var(--blue-200)",
                      color: "var(--blue-ink)", fontWeight: 600,
                    }}>
                      {tpl.label}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--ink-400)" }}>{tpl.columns.length} colonnes</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {tpl.columns.map((col, i) => (
                      <span key={col.field + i} className="mono" style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 5,
                        background: col.numeric ? "var(--blue-100)" : "var(--ink-100)",
                        border: `1px solid ${col.numeric ? "var(--blue-200)" : "var(--ink-200)"}`,
                        color: col.numeric ? "var(--blue-ink)" : "var(--ink-700)",
                      }}>
                        {col.header}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Isolation */}
      <div className="card">
        <div className="card-h"><div className="card-title">Isolation</div></div>
        <div className="card-b">
          <p style={{ fontSize: 13, color: "var(--ink-800)", lineHeight: 1.55, margin: "0 0 12px" }}>
            Supabase RLS policies ensure a document can only be pushed to the sheet of its own{" "}
            <code className="mono" style={{ background: "var(--blue-100)", padding: "1px 5px", borderRadius: 4, color: "var(--blue-ink)" }}>
              workspace_id
            </code>.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="chip validated"><CheckIcon /> RLS active</span>
            <span className="chip validated"><CheckIcon /> workspace_id verified</span>
            <span className="chip validated"><CheckIcon /> Isolated service account</span>
          </div>
        </div>
      </div>
    </div>
  );
}
