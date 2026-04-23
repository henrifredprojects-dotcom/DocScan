"use client";

import { useState } from "react";

import type { Category } from "@/lib/types";
import type { VendorRuleWithCategory } from "@/lib/data/vendor_rules";

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  );
}

export function RulesManager({
  initialRules,
  categories,
  workspaceId,
}: {
  initialRules: VendorRuleWithCategory[];
  categories: Category[];
  workspaceId: string;
}) {
  const [rules, setRules] = useState<VendorRuleWithCategory[]>(initialRules);
  const [adding, setAdding] = useState(false);
  const [vendorMatch, setVendorMatch] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  async function addRule() {
    if (!vendorMatch.trim()) { setAddError("Vendor pattern is required"); return; }
    if (!categoryId) { setAddError("Select a category"); return; }
    setAddSaving(true);
    setAddError("");
    const res = await fetch("/api/vendor_rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: workspaceId, vendor_match: vendorMatch.trim(), category_id: categoryId }),
    });
    const payload = (await res.json()) as { ok?: boolean; rule?: { id: string; workspace_id: string; vendor_match: string; category_id: string; created_at: string }; error?: string };
    setAddSaving(false);
    if (!payload.ok || !payload.rule) { setAddError(payload.error ?? "Failed to add"); return; }
    const catName = categories.find((c) => c.id === categoryId)?.name ?? "";
    setRules((prev) => [...prev, { ...payload.rule!, category_name: catName }].sort((a, b) => a.vendor_match.localeCompare(b.vendor_match)));
    setVendorMatch("");
    setCategoryId(categories[0]?.id ?? "");
    setAdding(false);
  }

  async function deleteRule(ruleId: string) {
    setDeletingId(ruleId);
    setDeleteError("");
    const res = await fetch(`/api/vendor_rules/${ruleId}`, { method: "DELETE" });
    const payload = (await res.json()) as { ok?: boolean; error?: string };
    setDeletingId(null);
    if (payload.ok) {
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    } else {
      setDeleteError(payload.error ?? "Delete failed.");
    }
  }

  return (
    <div>
      {/* Info banner */}
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "12px 16px",
        background: "var(--blue-100)",
        border: "1px solid var(--blue-200)",
        borderRadius: "var(--radius-lg)",
        marginBottom: 16,
        fontSize: 13,
        color: "var(--blue-ink)",
      }}>
        <ZapIcon />
        <span>
          When a document is scanned and the vendor name <strong>contains</strong> the pattern (case-insensitive),
          the category is pre-filled automatically in the review screen.
        </span>
      </div>

      <div className="card" style={{ overflow: "hidden", marginBottom: 16 }}>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl" style={{ minWidth: 500 }}>
            <thead>
              <tr>
                <th>Vendor pattern</th>
                <th style={{ width: 24, textAlign: "center" }}></th>
                <th>Category</th>
                <th style={{ width: 60, textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td>
                    <code className="mono" style={{
                      background: "var(--blue-100)",
                      border: "1px solid var(--blue-200)",
                      borderRadius: 5,
                      padding: "2px 7px",
                      fontSize: 12.5,
                      color: "var(--blue-ink)",
                    }}>
                      {rule.vendor_match}
                    </code>
                  </td>
                  <td style={{ textAlign: "center", color: "var(--ink-400)" }}>
                    <ArrowRightIcon />
                  </td>
                  <td>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: "oklch(0.96 0.05 160)",
                      border: "1px solid oklch(0.85 0.06 160)",
                      color: "oklch(0.4 0.14 160)",
                      fontSize: 12.5,
                      fontWeight: 500,
                    }}>
                      {rule.category_name || "—"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={deletingId === rule.id}
                      onClick={() => deleteRule(rule.id)}
                      style={{ color: "var(--err)" }}
                    >
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              ))}
              {rules.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 32, textAlign: "center", color: "var(--ink-500)" }}>
                    No rules yet. Add one to auto-assign categories.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteError && (
        <p style={{ color: "var(--err)", fontSize: 12.5, margin: "0 0 12px", padding: "8px 12px", background: "oklch(0.97 0.03 25)", border: "1px solid oklch(0.85 0.08 25)", borderRadius: 8 }}>
          {deleteError}
        </p>
      )}

      {/* Add form */}
      {adding ? (
        <div className="card" style={{ padding: 16 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>Add vendor rule</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div className="field">
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-600)" }}>
                Vendor pattern <span className="req">*</span>
              </label>
              <input
                className="ds-input mono"
                value={vendorMatch}
                onChange={(e) => setVendorMatch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addRule(); if (e.key === "Escape") setAdding(false); }}
                placeholder="e.g. Grab, Mercury Drug"
                autoFocus
              />
              <span style={{ fontSize: 11, color: "var(--ink-500)", marginTop: 3, display: "block" }}>
                Contains match, case-insensitive
              </span>
            </div>
            <div className="field">
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-600)" }}>
                Category <span className="req">*</span>
              </label>
              <select
                className="ds-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {categories.length === 0 && (
                  <option value="">No categories — create them first</option>
                )}
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          {addError && <p style={{ color: "var(--err)", fontSize: 12, margin: "0 0 10px" }}>{addError}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-primary btn-sm"
              disabled={addSaving || categories.length === 0}
              onClick={addRule}
            >
              {addSaving ? "Adding…" : "Add rule"}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setAddError(""); setVendorMatch(""); }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-secondary" onClick={() => setAdding(true)}>
          <PlusIcon /> Add rule
        </button>
      )}
    </div>
  );
}
