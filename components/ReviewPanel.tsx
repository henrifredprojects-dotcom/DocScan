"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { Category, DocumentRow } from "@/lib/types";

function SparkleIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6"/>
      <path d="M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );
}

const DOCUMENT_TYPES = ["Invoice", "Receipt", "Delivery note", "Credit note", "Other"];
const PAYMENT_METHODS = ["Card", "Cash", "Transfer", "Direct debit", "Check", "GCash", "Maya"];

type SelectOption = string | { value: string; label: string };

function Field({
  label,
  required,
  fieldKey,
  form,
  edited,
  onUpdate,
  mono = false,
  select,
  textarea,
}: {
  label: string;
  required?: boolean;
  fieldKey: string;
  form: Record<string, unknown>;
  edited: Record<string, boolean>;
  onUpdate: (k: string, v: string) => void;
  mono?: boolean;
  select?: SelectOption[];
  textarea?: boolean;
}) {
  const value = String(form[fieldKey] ?? "");
  const isAi = !edited[fieldKey];

  const cls = `${isAi ? "ai" : "edited"} ${mono ? "mono" : ""}`.trim();

  const optionValue = (o: SelectOption) => typeof o === "string" ? o : o.value;
  const optionLabel = (o: SelectOption) => typeof o === "string" ? o : o.label;

  return (
    <div className="field">
      <label>
        {label}
        {required && <span className="req"> *</span>}
        {isAi ? (
          <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--blue-600)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
            <SparkleIcon size={10} /> AI
          </span>
        ) : (
          <span style={{ marginLeft: "auto", fontSize: 10.5, color: "oklch(0.55 0.14 85)", fontWeight: 600 }}>edited</span>
        )}
      </label>
      {select ? (
        <select
          className={`ds-select ${cls}`}
          value={value}
          onChange={(e) => onUpdate(fieldKey, e.target.value)}
        >
          {value && !select.some((o) => optionValue(o) === value) && (
            <option value={value}>{value}</option>
          )}
          {select.map((o) => (
            <option key={optionValue(o)} value={optionValue(o)}>
              {optionLabel(o)}
            </option>
          ))}
        </select>
      ) : textarea ? (
        <textarea
          className={`ds-input ${cls}`}
          value={value}
          rows={2}
          onChange={(e) => onUpdate(fieldKey, e.target.value)}
          style={{ resize: "vertical", fontFamily: "inherit" }}
        />
      ) : (
        <input
          className={`ds-input ${cls}`}
          value={value}
          onChange={(e) => onUpdate(fieldKey, e.target.value)}
        />
      )}
    </div>
  );
}

function parseData(document: DocumentRow) {
  return {
    ...(document.extracted_data ?? {}),
    ...(document.validated_data ?? {}),
  } as Record<string, unknown>;
}

export function ReviewPanel({
  document,
  categories,
  initialCategoryId,
  workspaceName,
}: {
  document: DocumentRow;
  categories: Category[];
  initialCategoryId: string;
  workspaceName?: string;
}) {
  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories],
  );

  const initialData = useMemo(
    (): Record<string, unknown> => ({ ...parseData(document), category_id: initialCategoryId }),
    [document, initialCategoryId],
  );

  const router = useRouter();
  const [form, setForm] = useState<Record<string, unknown>>(initialData);
  const [edited, setEdited] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState<"ok" | "err">("ok");

  function update(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setEdited((e) => ({ ...e, [k]: true }));
  }

  function buildPayload(status: "pending" | "validated" | "rejected") {
    const selectedCategory = categories.find((c) => c.id === (form.category_id as string));
    return {
      status,
      validated_data: { ...form, category_name: selectedCategory?.name ?? "" },
      category_id: selectedCategory?.id ?? null,
    };
  }

  async function send(status: "pending" | "validated" | "rejected") {
    setSaving(status);
    setMessage("");
    const response = await fetch(`/api/documents/${document.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload(status)),
    });
    const payload = (await response.json()) as { ok?: boolean; error?: string };
    setSaving(null);
    if (payload.ok) {
      setMsgType("ok");
      setMessage(`Saved as ${status}`);
    } else {
      setMsgType("err");
      setMessage(payload.error ?? "Save failed");
    }
  }

  async function exportDoc() {
    setSaving("exported");
    setMessage("");
    const saveRes = await fetch(`/api/documents/${document.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload("validated")),
    });
    const savePayload = (await saveRes.json()) as { ok?: boolean; error?: string };
    if (!savePayload.ok) {
      setSaving(null);
      setMsgType("err");
      setMessage(savePayload.error ?? "Save failed");
      return;
    }
    const exportRes = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: document.id }),
    });
    const exportPayload = (await exportRes.json()) as { ok?: boolean; error?: string; warning?: string };
    setSaving(null);
    if (exportPayload.ok) {
      router.refresh();
      if (exportPayload.warning) {
        setMsgType("err");
        setMessage(`Validated ✓ — Sheet export skipped: ${exportPayload.warning}`);
      } else {
        setMsgType("ok");
        setMessage(workspaceName ? `Exported to ${workspaceName} ✓` : "Exported to workspace sheet ✓");
      }
    } else {
      setMsgType("err");
      setMessage(exportPayload.error ?? "Export failed");
    }
  }

  async function reprocess() {
    setSaving("reprocess");
    setMessage("");
    const res = await fetch(`/api/documents/${document.id}/reprocess`, { method: "POST" });
    const payload = (await res.json()) as { ok?: boolean; error?: string };
    setSaving(null);
    if (payload.ok) {
      router.refresh();
    } else {
      setMsgType("err");
      setMessage(payload.error ?? "Reprocess failed.");
    }
  }

  async function deleteDoc() {
    if (!window.confirm("Delete this document permanently? This cannot be undone.")) return;
    setSaving("delete");
    setMessage("");
    const res = await fetch(`/api/documents/${document.id}`, { method: "DELETE" });
    const payload = (await res.json()) as { ok?: boolean; error?: string };
    if (payload.ok) {
      router.push("/documents");
    } else {
      setSaving(null);
      setMsgType("err");
      setMessage(payload.error ?? "Delete failed.");
    }
  }

  const conf = typeof initialData.confidence === "number"
    ? Math.round((initialData.confidence as number) * 100)
    : null;

  return (
    <div style={{
      background: "var(--paper)",
      border: "1px solid var(--ink-200)",
      borderRadius: "var(--radius-lg)",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px",
        borderBottom: "1px solid var(--ink-200)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SparkleIcon size={14} /> AI-extracted fields
          </div>
          <div className="card-sub" style={{ marginTop: 2 }}>Correct if needed — no export before validation.</div>
        </div>
        {conf !== null && (
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 10px",
            borderRadius: 999,
            background: "var(--blue-100)",
            border: "1px solid var(--blue-200)",
            color: "var(--blue-ink)",
            fontSize: 12,
            fontWeight: 600,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--blue-600)", display: "inline-block" }} />
            AI confidence · {conf}%
          </span>
        )}
      </div>

      {/* Form body */}
      <div style={{ padding: "18px 20px", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Date" required fieldKey="date" form={form} edited={edited} onUpdate={update} />
          <Field label="Document type" fieldKey="document_type" form={form} edited={edited} onUpdate={update} select={DOCUMENT_TYPES} />
        </div>
        <Field label="Vendor" required fieldKey="vendor" form={form} edited={edited} onUpdate={update} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Total amount" required fieldKey="total_amount" form={form} edited={edited} onUpdate={update} mono />
          <Field label="Currency" fieldKey="currency" form={form} edited={edited} onUpdate={update} mono />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="VAT amount" fieldKey="vat_amount" form={form} edited={edited} onUpdate={update} mono />
          <Field label="Payment method" fieldKey="payment_method" form={form} edited={edited} onUpdate={update} select={PAYMENT_METHODS} />
        </div>
        <Field
          label="Category"
          required
          fieldKey="category_id"
          form={form}
          edited={edited}
          onUpdate={update}
          select={categoryOptions.length > 0 ? categoryOptions : undefined}
        />
        <Field label="Reference" fieldKey="reference_number" form={form} edited={edited} onUpdate={update} mono />
        {/* Due date: invoices only — Period: anything that isn't a plain receipt */}
        {(() => {
          const docType = String(form.document_type ?? "").toLowerCase();
          const isInvoice = docType === "invoice";
          const showPeriod = docType !== "receipt" && docType !== "";
          if (!isInvoice && !showPeriod) return null;
          return (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {isInvoice
                ? <Field label="Due date" fieldKey="due_date" form={form} edited={edited} onUpdate={update} mono />
                : <div />}
              {showPeriod
                ? <Field label="Period" fieldKey="period" form={form} edited={edited} onUpdate={update} />
                : <div />}
            </div>
          );
        })()}
        <Field label="Note" fieldKey="note" form={form} edited={edited} onUpdate={update} textarea />
      </div>

      {/* Message */}
      {message && (
        <div style={{
          margin: "0 20px",
          padding: "10px 14px",
          borderRadius: 9,
          fontSize: 13,
          fontWeight: 500,
          background: msgType === "ok" ? "oklch(0.96 0.05 160)" : "oklch(0.97 0.03 25)",
          color: msgType === "ok" ? "oklch(0.4 0.14 160)" : "var(--err)",
          border: `1px solid ${msgType === "ok" ? "oklch(0.85 0.06 160)" : "oklch(0.85 0.08 25)"}`,
        }}>
          {message}
        </div>
      )}

      {/* Actions */}
      <div style={{
        padding: "14px 20px",
        borderTop: "1px solid var(--ink-200)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "var(--ink-100)",
        borderRadius: "0 0 var(--radius-lg) var(--radius-lg)",
      }}>
        <button
          className="btn btn-danger"
          disabled={!!saving}
          onClick={() => send("rejected")}
        >
          <XIcon /> Reject
        </button>
        <button
          className="btn btn-ghost btn-sm"
          disabled={!!saving}
          onClick={reprocess}
          title="Re-run AI extraction on the same file"
          style={{ color: "var(--ink-500)" }}
        >
          {saving === "reprocess" ? <><div className="spinner" style={{ width: 12, height: 12 }} /> Reprocessing…</> : <><RefreshIcon /> Reprocess OCR</>}
        </button>
        <button
          className="btn btn-ghost btn-sm"
          disabled={!!saving}
          onClick={deleteDoc}
          title="Permanently delete this document"
          style={{ color: "var(--err)" }}
        >
          {saving === "delete" ? "Deleting…" : <><TrashIcon /> Delete</>}
        </button>
        <div style={{ flex: 1 }} />
        <button
          className="btn btn-secondary"
          disabled={!!saving}
          onClick={() => send("pending")}
        >
          {saving === "pending" ? "Saving…" : "Save draft"}
        </button>
        <button
          className="btn btn-primary"
          disabled={!!saving}
          onClick={exportDoc}
        >
          <SendIcon /> {saving === "exported" ? "Exporting…" : "Validate & export"}
        </button>
      </div>
    </div>
  );
}
