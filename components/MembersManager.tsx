"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { WorkspaceInvite, WorkspaceMember } from "@/lib/types";

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/>
      <path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

export function MembersManager({
  workspaceId,
  appUrl,
  members,
  invites,
}: {
  workspaceId: string;
  appUrl: string;
  members: WorkspaceMember[];
  invites: WorkspaceInvite[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  async function sendInvite() {
    if (!email.trim()) { setError("Enter an email address."); return; }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId, email }),
      });
      const payload = await res.json() as { ok?: boolean; invite?: WorkspaceInvite; emailSent?: boolean; emailError?: string | null; error?: string };
      if (!payload.ok) { setError(payload.error ?? "Failed to create invite."); return; }
      if (payload.emailSent) {
        setSuccess(`Invitation email sent to ${email}.`);
      } else {
        setSuccess(`Invite created for ${email}. Copy the link below and share it manually.${payload.emailError ? ` (Email error: ${payload.emailError})` : ""}`);
      }
      setEmail("");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function revokeInvite(inviteId: string) {
    const res = await fetch(`/api/invites/${inviteId}?workspace_id=${workspaceId}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  async function removeMember(memberId: string) {
    const res = await fetch(`/api/members/${memberId}?workspace_id=${workspaceId}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(`${appUrl}/invite/${token}`);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Invite form */}
      <div className="card">
        <div className="card-h">
          <div>
            <div className="card-title">Invite a member</div>
            <div className="card-sub">They will receive a link valid for 7 days. Role: viewer (can see documents, cannot manage settings).</div>
          </div>
        </div>
        <div className="card-b" style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendInvite()}
              className="ds-input"
              placeholder="colleague@clinic.com"
            />
          </div>
          <button className="btn btn-primary" onClick={sendInvite} disabled={loading}>
            {loading ? "Sending…" : "Create invite link"}
          </button>
        </div>
        {error && (
          <div style={{ margin: "0 20px 16px", padding: "10px 14px", background: "oklch(0.97 0.03 25)", border: "1px solid oklch(0.85 0.08 25)", borderRadius: 9, fontSize: 13, color: "var(--err)" }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ margin: "0 20px 16px", padding: "10px 14px", background: "oklch(0.96 0.05 160)", border: "1px solid oklch(0.85 0.06 160)", borderRadius: 9, fontSize: 13, color: "oklch(0.4 0.14 160)" }}>
            {success}
          </div>
        )}
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="card">
          <div className="card-h"><div className="card-title">Pending invites</div></div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Email</th>
                <th>Expires</th>
                <th>Invite link</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invites.map((inv) => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 500 }}>{inv.email}</td>
                  <td style={{ color: "var(--ink-500)", fontSize: 12.5 }}>
                    {new Date(inv.expires_at).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => copyLink(inv.token)}
                      style={{ gap: 5 }}
                    >
                      <CopyIcon />
                      {copiedToken === inv.token ? "Copied!" : "Copy link"}
                    </button>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => revokeInvite(inv.id)}
                    >
                      <TrashIcon /> Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Active members */}
      <div className="card">
        <div className="card-h"><div className="card-title">Members</div></div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td style={{ fontWeight: 500 }}>{m.user_email ?? m.user_id}</td>
                <td>
                  <span className="chip validated">{m.role}</span>
                </td>
                <td style={{ color: "var(--ink-500)", fontSize: 12.5 }}>
                  {new Date(m.joined_at).toLocaleDateString()}
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => removeMember(m.id)}
                  >
                    <TrashIcon /> Remove
                  </button>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 40, textAlign: "center", color: "var(--ink-500)", fontSize: 13 }}>
                  No members yet. Invite someone above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
