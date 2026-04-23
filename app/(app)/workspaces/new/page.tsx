import { redirect } from "next/navigation";

import { createCategory } from "@/lib/data/categories";
import { createWorkspace, getCurrentUser } from "@/lib/data/workspaces";
import { setActiveWorkspaceCookie } from "@/lib/workspace";

const DEFAULT_CATEGORIES = [
  "Transport", "Meals & Entertainment", "Medical supplies",
  "Equipment", "Rent", "Utilities", "Marketing", "Salaries",
  "Bank fees", "Other",
];

async function createWorkspaceAction(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const workspace = await createWorkspace({
    userId: user.id,
    name,
    color: String(formData.get("color") ?? "#1A56DB"),
    currency: String(formData.get("currency") ?? "PHP"),
    sheetsId: String(formData.get("sheets_id") ?? "").trim() || undefined,
    sheetsTab: String(formData.get("sheets_tab") ?? "").trim() || undefined,
  });

  await Promise.all(
    DEFAULT_CATEGORIES.map((catName) =>
      createCategory({ workspaceId: workspace.id, name: catName, isDefault: true }),
    ),
  );

  await setActiveWorkspaceCookie(workspace.id);
  redirect("/dashboard");
}

export default function NewWorkspacePage() {
  return (
    <div>
      <div className="screen-h">
        <div>
          <h1>Create workspace</h1>
          <p>One workspace = one company = one Google Sheet.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
        {/* Form */}
        <form action={createWorkspaceAction}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              <div className="field">
                <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-600)" }}>
                  Workspace name <span className="req">*</span>
                </label>
                <input name="name" required placeholder="Clinique Makati" className="ds-input" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field">
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-600)" }}>
                    Color
                  </label>
                  <input
                    name="color"
                    type="color"
                    defaultValue="#1A56DB"
                    style={{
                      width: "100%", height: 40, borderRadius: 8,
                      border: "1px solid var(--ink-200)",
                      padding: 4, cursor: "pointer", background: "var(--paper)",
                    }}
                  />
                </div>
                <div className="field">
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-600)" }}>
                    Currency
                  </label>
                  <select name="currency" defaultValue="PHP" className="ds-select">
                    <option value="PHP">PHP — Philippine Peso</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="SGD">SGD — Singapore Dollar</option>
                  </select>
                </div>
              </div>

              <div style={{ height: 1, background: "var(--ink-200)" }} />

              <div className="field">
                <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-600)" }}>
                  Google Sheet ID
                </label>
                <input
                  name="sheets_id"
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                  className="ds-input mono"
                  style={{ fontSize: 12 }}
                />
              </div>

              <div className="field">
                <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-600)" }}>
                  Tab name
                </label>
                <input name="sheets_tab" placeholder="Sheet1" className="ds-input mono" />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                Create workspace
              </button>
            </div>
          </div>
        </form>

        {/* Info panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="card" style={{ padding: 16 }}>
            <div className="card-title" style={{ marginBottom: 8 }}>Default categories</div>
            <div className="card-sub" style={{ marginBottom: 10 }}>
              These categories will be created automatically. You can edit them in Settings.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {DEFAULT_CATEGORIES.map((cat) => (
                <span key={cat} style={{
                  fontSize: 11.5, padding: "3px 8px", borderRadius: 6,
                  background: "var(--blue-100)", border: "1px solid var(--blue-200)",
                  color: "var(--blue-ink)", fontWeight: 500,
                }}>
                  {cat}
                </span>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div className="card-title" style={{ marginBottom: 6 }}>How to get the Sheet ID</div>
            <div className="card-sub" style={{ lineHeight: 1.6 }}>
              Open your Google Sheet. The ID is in the URL between{" "}
              <code className="mono" style={{ background: "var(--blue-100)", padding: "1px 4px", borderRadius: 4, color: "var(--blue-ink)" }}>
                /d/
              </code>{" "}
              and{" "}
              <code className="mono" style={{ background: "var(--blue-100)", padding: "1px 4px", borderRadius: 4, color: "var(--blue-ink)" }}>
                /edit
              </code>.
              Share the sheet with the service account email visible in Settings → Google Sheets.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
