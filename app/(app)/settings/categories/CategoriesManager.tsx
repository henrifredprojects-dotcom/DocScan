"use client";

import { useState } from "react";

import type { Category } from "@/lib/types";

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

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

type EditState = { name: string; accountCode: string; saving: boolean; error: string };

export function CategoriesManager({
  initialCategories,
  workspaceId,
}: {
  initialCategories: Category[];
  workspaceId: string;
}) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ name: "", accountCode: "", saving: false, error: "" });
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAccountCode, setNewAccountCode] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditState({ name: cat.name, accountCode: cat.account_code ?? "", saving: false, error: "" });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState({ name: "", accountCode: "", saving: false, error: "" });
  }

  async function saveEdit(categoryId: string) {
    if (!editState.name.trim()) {
      setEditState((s) => ({ ...s, error: "Name is required" }));
      return;
    }
    setEditState((s) => ({ ...s, saving: true, error: "" }));
    const res = await fetch(`/api/categories/${categoryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editState.name.trim(), account_code: editState.accountCode.trim() || null }),
    });
    const payload = (await res.json()) as { ok?: boolean; category?: Category; error?: string };
    if (!payload.ok) {
      setEditState((s) => ({ ...s, saving: false, error: payload.error ?? "Save failed" }));
      return;
    }
    setCategories((prev) => prev.map((c) => c.id === categoryId ? payload.category! : c));
    setEditingId(null);
  }

  async function addCategory() {
    if (!newName.trim()) { setAddError("Name is required"); return; }
    setAddSaving(true);
    setAddError("");
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: workspaceId, name: newName.trim(), account_code: newAccountCode.trim() || undefined }),
    });
    const payload = (await res.json()) as { ok?: boolean; category?: Category; error?: string };
    setAddSaving(false);
    if (!payload.ok) { setAddError(payload.error ?? "Failed to add"); return; }
    setCategories((prev) => [...prev, payload.category!]);
    setNewName("");
    setNewAccountCode("");
    setAdding(false);
  }

  async function deleteCategory(categoryId: string) {
    setDeletingId(categoryId);
    setDeleteError("");
    const res = await fetch(`/api/categories/${categoryId}`, { method: "DELETE" });
    const payload = (await res.json()) as { ok?: boolean; error?: string };
    setDeletingId(null);
    if (payload.ok) {
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    } else {
      setDeleteError(payload.error ?? "Delete failed — the category may still be in use by documents.");
    }
  }

  return (
    <div>
      <div className="card" style={{ overflow: "hidden", marginBottom: 16 }}>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl" style={{ minWidth: 600 }}>
            <thead>
              <tr>
                <th>Category name</th>
                <th style={{ width: 160 }}>Account code</th>
                <th style={{ width: 90 }}>Type</th>
                <th style={{ width: 100, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) =>
                editingId === cat.id ? (
                  <tr key={cat.id}>
                    <td>
                      <input
                        className="ds-input"
                        value={editState.name}
                        onChange={(e) => setEditState((s) => ({ ...s, name: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(cat.id); if (e.key === "Escape") cancelEdit(); }}
                        autoFocus
                        style={{ width: "100%" }}
                      />
                      {editState.error && <p style={{ color: "var(--err)", fontSize: 11.5, margin: "4px 0 0" }}>{editState.error}</p>}
                    </td>
                    <td>
                      <input
                        className="ds-input mono"
                        value={editState.accountCode}
                        onChange={(e) => setEditState((s) => ({ ...s, accountCode: e.target.value }))}
                        placeholder="e.g. 6200"
                        style={{ width: "100%", fontSize: 12 }}
                      />
                    </td>
                    <td />
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                        <button
                          className="btn btn-success btn-sm"
                          disabled={editState.saving}
                          onClick={() => saveEdit(cat.id)}
                        >
                          <CheckIcon />
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>
                          <XIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={cat.id}>
                    <td><strong>{cat.name}</strong></td>
                    <td className="mono" style={{ color: "var(--ink-600)", fontSize: 12.5 }}>
                      {cat.account_code ?? "—"}
                    </td>
                    <td>
                      <span className={`chip ${cat.is_default ? "pending" : "validated"}`}>
                        {cat.is_default ? "Default" : "Custom"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => startEdit(cat)}>
                          <EditIcon />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={deletingId === cat.id}
                          onClick={() => deleteCategory(cat.id)}
                          style={{ color: "var(--err)" }}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 32, textAlign: "center", color: "var(--ink-500)" }}>
                    No categories yet.
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
          <div className="card-title" style={{ marginBottom: 12 }}>Add category</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 10, marginBottom: 10 }}>
            <div className="field">
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-600)" }}>Name <span className="req">*</span></label>
              <input
                className="ds-input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addCategory(); if (e.key === "Escape") setAdding(false); }}
                placeholder="e.g. Medical supplies"
                autoFocus
              />
            </div>
            <div className="field">
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-600)" }}>Account code</label>
              <input
                className="ds-input mono"
                value={newAccountCode}
                onChange={(e) => setNewAccountCode(e.target.value)}
                placeholder="e.g. 6200"
                style={{ fontSize: 12 }}
              />
            </div>
          </div>
          {addError && <p style={{ color: "var(--err)", fontSize: 12, margin: "0 0 10px" }}>{addError}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-sm" disabled={addSaving} onClick={addCategory}>
              {addSaving ? "Adding…" : "Add"}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setAddError(""); setNewName(""); setNewAccountCode(""); }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-secondary" onClick={() => setAdding(true)}>
          <PlusIcon /> Add category
        </button>
      )}
    </div>
  );
}
