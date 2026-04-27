"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Workspace } from "@/lib/types";

const CURRENCIES = [
  { value: "PHP", label: "PHP — Philippine Peso" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "SGD", label: "SGD — Singapore Dollar" },
  { value: "AUD", label: "AUD — Australian Dollar" },
  { value: "GBP", label: "GBP — British Pound" },
];

export function GeneralSettingsForm({ workspace }: { workspace: Workspace }) {
  const router = useRouter();
  const [name, setName] = useState(workspace.name);
  const [color, setColor] = useState(workspace.color ?? "#1A56DB");
  const [currency, setCurrency] = useState(workspace.currency ?? "PHP");
  const [logoUrl, setLogoUrl] = useState(workspace.logo_url ?? "");
  const [threshold, setThreshold] = useState(Math.round((workspace.confidence_threshold ?? 0.9) * 100));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState<"ok" | "err">("ok");
  const [deleting, setDeleting] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  async function save() {
    if (!name.trim()) { setMsgType("err"); setMessage("Name is required."); return; }
    setSaving(true);
    setMessage("");
    const res = await fetch(`/api/workspaces/${workspace.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), color, currency, logo_url: logoUrl.trim() || null, confidence_threshold: threshold / 100 }),
    });
    const payload = await res.json() as { ok?: boolean; error?: string };
    setSaving(false);
    if (payload.ok) {
      setMsgType("ok");
      setMessage("Workspace updated.");
      router.refresh();
    } else {
      setMsgType("err");
      setMessage(payload.error ?? "Update failed.");
    }
  }

  async function deleteWorkspace() {
    if (confirmName !== workspace.name) return;
    setDeleting(true);
    const res = await fetch(`/api/workspaces/${workspace.id}`, { method: "DELETE" });
    const payload = await res.json() as { ok?: boolean; error?: string };
    if (payload.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setDeleting(false);
      setMsgType("err");
      setMessage(payload.error ?? "Delete failed.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Main settings card */}
      <div className="card">
        <div className="card-h">
          <div>
            <div className="card-title">Workspace settings</div>
            <div className="card-sub">Name, color, currency and logo for this workspace.</div>
          </div>
        </div>
        <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          <div className="field">
            <label>Workspace name <span className="req">*</span></label>
            <input
              className="ds-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Clinique Makati"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label>Identification color</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  style={{
                    width: 40, height: 40, borderRadius: 8,
                    border: "1px solid var(--ink-200)",
                    padding: 3, cursor: "pointer", background: "var(--paper)",
                    flexShrink: 0,
                  }}
                />
                <div style={{
                  width: 32, height: 32, borderRadius: 9,
                  background: color,
                  display: "grid", placeItems: "center",
                  color: "#fff", fontSize: 11, fontWeight: 700,
                }}>
                  {name.slice(0, 2).toUpperCase() || "WS"}
                </div>
                <span className="mono" style={{ fontSize: 12, color: "var(--ink-500)" }}>{color}</span>
              </div>
            </div>
            <div className="field">
              <label>Currency</label>
              <select className="ds-select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label>
              AI confidence threshold
              <span style={{ marginLeft: "auto", fontFamily: "monospace", fontWeight: 700, color: "var(--blue-600)", fontSize: 13 }}>
                {threshold}%
              </span>
            </label>
            <input
              type="range"
              min={50}
              max={99}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--blue-600)" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-400)", marginTop: 2 }}>
              <span>50% — lenient</span>
              <span>99% — strict</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--ink-500)", margin: "4px 0 0" }}>
              Documents with AI confidence below this threshold appear in Reports → À vérifier.
            </p>
          </div>

          <div className="field">
            <label>Logo URL <span style={{ fontSize: 11, color: "var(--ink-400)", fontWeight: 400 }}>(optional)</span></label>
            <input
              className="ds-input"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              type="url"
            />
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Logo preview"
                style={{ marginTop: 8, height: 40, borderRadius: 6, objectFit: "contain", border: "1px solid var(--ink-200)" }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            )}
          </div>

          {message && (
            <div style={{
              padding: "10px 14px", borderRadius: 9, fontSize: 13, fontWeight: 500,
              background: msgType === "ok" ? "oklch(0.96 0.05 160)" : "oklch(0.97 0.03 25)",
              color: msgType === "ok" ? "oklch(0.4 0.14 160)" : "var(--err)",
              border: `1px solid ${msgType === "ok" ? "oklch(0.85 0.06 160)" : "oklch(0.85 0.08 25)"}`,
            }}>
              {message}
            </div>
          )}

          <div>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="card" style={{ borderColor: "oklch(0.85 0.08 25)" }}>
        <div className="card-h" style={{ borderColor: "oklch(0.9 0.04 25)" }}>
          <div>
            <div className="card-title" style={{ color: "var(--err)" }}>Danger zone</div>
            <div className="card-sub">Deleting a workspace permanently removes all documents, categories, and settings. This cannot be undone.</div>
          </div>
        </div>
        <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="field">
            <label>Type <strong>{workspace.name}</strong> to confirm deletion</label>
            <input
              className="ds-input"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={workspace.name}
              style={{ borderColor: confirmName === workspace.name ? "var(--err)" : undefined }}
            />
          </div>
          <div>
            <button
              className="btn btn-danger"
              disabled={confirmName !== workspace.name || deleting}
              onClick={deleteWorkspace}
            >
              {deleting ? "Deleting…" : "Delete workspace permanently"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
