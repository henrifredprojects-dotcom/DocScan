import { revalidatePath } from "next/cache";

import { adminAddInvite, adminListInvites, adminRemoveInvite, isAdmin } from "@/lib/auth/invite";
import { getCurrentUser } from "@/lib/data/workspaces";

export const dynamic = "force-dynamic";

async function addInviteAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.email)) throw new Error("Forbidden");

  const email = String(formData.get("email") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Invalid email");
  }
  await adminAddInvite(email, user.id, note);
  revalidatePath("/admin/invites");
}

async function removeInviteAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.email)) throw new Error("Forbidden");

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");
  await adminRemoveInvite(id);
  revalidatePath("/admin/invites");
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function AdminInvitesPage() {
  const invites = await adminListInvites();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 4px" }}>
          Beta invites
        </h1>
        <p style={{ margin: 0, color: "var(--ink-500)", fontSize: 13.5 }}>
          Manage who can sign in. Only emails listed below (plus admins) can access the app.
        </p>
      </header>

      <form
        action={addInviteAction}
        style={{
          background: "var(--paper)",
          border: "1px solid var(--ink-200)",
          borderRadius: "var(--radius-lg)",
          padding: 16,
          display: "grid",
          gridTemplateColumns: "1fr 1fr auto",
          gap: 10,
          alignItems: "end",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div className="field">
          <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-600)" }}>Email</label>
          <input
            name="email"
            type="email"
            required
            placeholder="friend@example.com"
            className="ds-input"
          />
        </div>
        <div className="field">
          <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-600)" }}>Note (optional)</label>
          <input name="note" type="text" placeholder="Dental clinic owner" className="ds-input" />
        </div>
        <button type="submit" className="btn btn-primary">
          Add invite
        </button>
      </form>

      <div
        style={{
          background: "var(--paper)",
          border: "1px solid var(--ink-200)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: "var(--ink-50)", color: "var(--ink-600)" }}>
              <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 600, fontSize: 11.5 }}>Email</th>
              <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 600, fontSize: 11.5 }}>Invited</th>
              <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 600, fontSize: 11.5 }}>Accepted</th>
              <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 600, fontSize: 11.5 }}>Note</th>
              <th style={{ padding: "10px 14px", width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {invites.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "24px 14px", textAlign: "center", color: "var(--ink-500)" }}>
                  No invites yet. Add one above.
                </td>
              </tr>
            )}
            {invites.map((inv) => (
              <tr key={inv.id} style={{ borderTop: "1px solid var(--ink-200)" }}>
                <td style={{ padding: "10px 14px", fontWeight: 500 }}>{inv.email}</td>
                <td style={{ padding: "10px 14px", color: "var(--ink-500)" }}>{formatDate(inv.invited_at)}</td>
                <td style={{ padding: "10px 14px", color: inv.accepted_at ? "oklch(0.4 0.14 160)" : "var(--ink-500)" }}>
                  {inv.accepted_at ? formatDate(inv.accepted_at) : "Pending"}
                </td>
                <td style={{ padding: "10px 14px", color: "var(--ink-500)" }}>{inv.note ?? "—"}</td>
                <td style={{ padding: "10px 14px", textAlign: "right" }}>
                  <form action={removeInviteAction}>
                    <input type="hidden" name="id" value={inv.id} />
                    <button
                      type="submit"
                      className="btn btn-ghost btn-sm"
                      style={{ color: "var(--err)" }}
                    >
                      Remove
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
