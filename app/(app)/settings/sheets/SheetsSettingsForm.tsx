"use client";

import { useEffect, useState } from "react";

import { SHEET_TEMPLATES, DEFAULT_TEMPLATE_ID } from "@/lib/sheets-templates";
import type { Workspace } from "@/lib/types";

type RowState = {
  sheetsId: string;
  sheetsTab: string;
  sheetsTemplate: string;
  saving: boolean;
  saved: boolean;
  creating: boolean;
  testing: boolean;
  testResult: { ok: boolean; message: string } | null;
  error: string | null;
};

function parseSheetId(raw: string): string {
  const match = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : raw.trim();
}

function initRow(w: Workspace): RowState {
  return {
    sheetsId: parseSheetId(w.sheets_id ?? ""),
    sheetsTab: w.sheets_tab ?? "",
    sheetsTemplate: w.sheets_template ?? DEFAULT_TEMPLATE_ID,
    saving: false,
    saved: false,
    creating: false,
    testing: false,
    testResult: null,
    error: null,
  };
}

export function SheetsSettingsForm({ workspaces }: { workspaces: Workspace[] }) {
  const [rows, setRows] = useState<Record<string, RowState>>(
    () => Object.fromEntries(workspaces.map((w) => [w.id, initRow(w)])),
  );
  const [serviceAccountEmail, setServiceAccountEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d: { serviceAccountEmail?: string }) => {
        if (d.serviceAccountEmail) setServiceAccountEmail(d.serviceAccountEmail);
      })
      .catch(() => null);
  }, []);

  function update(id: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function testConnection(workspace: Workspace) {
    update(workspace.id, { testing: true, testResult: null, error: null });
    const response = await fetch(`/api/workspaces/${workspace.id}/test-sheet`, { method: "POST" });
    const payload = (await response.json()) as { ok?: boolean; message?: string; error?: string };
    update(workspace.id, {
      testing: false,
      testResult: payload.ok
        ? { ok: true, message: payload.message ?? "Connection OK" }
        : { ok: false, message: payload.error ?? "Unknown error" },
    });
  }

  async function createSheet(workspace: Workspace) {
    update(workspace.id, { creating: true, error: null });
    const response = await fetch(`/api/workspaces/${workspace.id}/create-sheet`, { method: "POST" });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      update(workspace.id, { creating: false, error: payload.error ?? "Sheet creation failed." });
      return;
    }
    const payload = (await response.json()) as { workspace?: { sheets_id?: string; sheets_tab?: string } };
    update(workspace.id, {
      creating: false,
      saved: true,
      error: null,
      sheetsId: payload.workspace?.sheets_id ?? "",
      sheetsTab: payload.workspace?.sheets_tab ?? "",
    });
    setTimeout(() => update(workspace.id, { saved: false }), 4000);
  }

  async function save(workspace: Workspace) {
    const row = rows[workspace.id];
    update(workspace.id, { saving: true, saved: false, error: null });

    const response = await fetch(`/api/workspaces/${workspace.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sheets_id: row.sheetsId.trim() || null,
        sheets_tab: row.sheetsTab.trim() || null,
        sheets_template: row.sheetsTemplate,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      update(workspace.id, { saving: false, error: payload.error ?? "Save failed." });
      return;
    }

    update(workspace.id, { saving: false, saved: true, error: null });
    setTimeout(() => update(workspace.id, { saved: false }), 3000);
  }

  if (workspaces.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {workspaces.map((workspace) => {
        const row = rows[workspace.id];
        const activeTemplate = SHEET_TEMPLATES.find((t) => t.id === row.sheetsTemplate) ?? SHEET_TEMPLATES[0];

        return (
          <div key={workspace.id} style={{
            background: "var(--paper)",
            border: "1px solid var(--ink-200)",
            borderRadius: "var(--radius-lg)",
            padding: 16,
          }}>
            {/* Workspace header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{
                width: 26, height: 26, borderRadius: 7,
                background: workspace.color ?? "var(--blue-600)",
                display: "grid", placeItems: "center",
                fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0,
              }}>
                {workspace.name.slice(0, 2).toUpperCase()}
              </span>
              <strong style={{ fontSize: 13.5, color: "var(--ink-900)" }}>{workspace.name}</strong>
            </div>

            {/* Sheet ID + Tab */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div className="field">
                <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-600)" }}>
                  Google Sheet ID
                </label>
                <input
                  type="text"
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                  value={row.sheetsId}
                  onChange={(e) => update(workspace.id, { sheetsId: parseSheetId(e.target.value) })}
                  className="ds-input mono"
                  style={{ fontSize: 12 }}
                />
              </div>
              <div className="field">
                <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-600)" }}>
                  Tab name
                </label>
                <input
                  type="text"
                  placeholder="Sheet1"
                  value={row.sheetsTab}
                  onChange={(e) => update(workspace.id, { sheetsTab: e.target.value })}
                  className="ds-input mono"
                  style={{ fontSize: 12 }}
                />
              </div>
            </div>

            {/* Template selector */}
            <div className="field" style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-600)" }}>
                Sheet template
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginTop: 6 }}>
                {SHEET_TEMPLATES.map((tpl) => {
                  const isActive = row.sheetsTemplate === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => update(workspace.id, { sheetsTemplate: tpl.id })}
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        borderRadius: "var(--radius)",
                        border: isActive ? "2px solid var(--blue-600)" : "1px solid var(--ink-200)",
                        background: isActive ? "var(--blue-100)" : "var(--paper)",
                        cursor: "pointer",
                        transition: "all .12s ease",
                      }}
                    >
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: isActive ? "var(--blue-600)" : "var(--ink-900)", marginBottom: 2 }}>
                        {tpl.label}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-500)", lineHeight: 1.4 }}>
                        {tpl.description}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink-400)", marginTop: 4 }}>
                        {tpl.columns.length} colonnes
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preview colonnes du template actif */}
            <div style={{
              padding: "10px 12px",
              background: "var(--ink-100)",
              borderRadius: "var(--radius)",
              marginBottom: 14,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-500)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>
                Colonnes exportées — {activeTemplate.label}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {activeTemplate.columns.map((col, i) => (
                  <span key={col.field + i} className="mono" style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 5,
                    background: col.numeric ? "var(--blue-100)" : "#fff",
                    border: `1px solid ${col.numeric ? "var(--blue-200)" : "var(--ink-200)"}`,
                    color: col.numeric ? "var(--blue-ink)" : "var(--ink-700)",
                  }}>
                    {col.header}
                  </span>
                ))}
              </div>
            </div>

            {/* Service account hint */}
            {serviceAccountEmail && (
              <div style={{
                padding: "8px 12px",
                background: "var(--blue-100)",
                borderRadius: "var(--radius)",
                marginBottom: 12,
                fontSize: 12,
                color: "var(--blue-ink)",
                lineHeight: 1.5,
              }}>
                <strong>Option A — Create automatically:</strong> Click "Create new Sheet" below — a Google Sheet is created for you and shared with your account.<br />
                <strong>Option B — Use your own sheet:</strong> Share your existing Google Sheet with <code style={{ background: "rgba(0,0,0,.07)", padding: "1px 5px", borderRadius: 4 }}>{serviceAccountEmail}</code> (as Editor), then paste its ID above.
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => save(workspace)}
                disabled={row.saving || row.creating || row.testing}
              >
                {row.saving ? "Saving…" : "Save"}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => testConnection(workspace)}
                disabled={row.testing || row.saving || row.creating}
              >
                {row.testing ? "Testing…" : "Test connection"}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => createSheet(workspace)}
                disabled={row.creating || row.saving || row.testing}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                {row.creating ? "Creating…" : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    {row.sheetsId ? "Replace Sheet" : "Create new Sheet"}
                  </>
                )}
              </button>
              {row.saved && (
                <span style={{ fontSize: 12.5, color: "oklch(0.4 0.14 160)", fontWeight: 500 }}>
                  {row.sheetsId ? "Sheet created ✓ — shared with your Google account" : "Saved ✓"}
                </span>
              )}
              {row.error && (
                <span style={{ fontSize: 12.5, color: "var(--err)", fontWeight: 500 }}>{row.error}</span>
              )}
            </div>
            {row.testResult && (
              <div style={{
                marginTop: 10,
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 12.5,
                lineHeight: 1.5,
                background: row.testResult.ok ? "oklch(0.96 0.05 160)" : "oklch(0.97 0.03 25)",
                color: row.testResult.ok ? "oklch(0.4 0.14 160)" : "var(--err)",
                border: `1px solid ${row.testResult.ok ? "oklch(0.85 0.06 160)" : "oklch(0.85 0.08 25)"}`,
              }}>
                {row.testResult.ok ? "✓ " : "✗ "}{row.testResult.message}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
