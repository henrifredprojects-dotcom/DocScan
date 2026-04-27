"use client";

import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { DocumentComment } from "@/lib/types";

type KanbanDoc = {
  id: string;
  extracted_data: Record<string, unknown> | null;
  validated_data: Record<string, unknown> | null;
  status: string;
  created_at: string;
  file_url: string;
  merged: Record<string, unknown>;
  confidence: number | null;
  requiredComplete: boolean;
  isResolved: boolean;
  hasComments: boolean;
  needsAttention: boolean;
};

function AlertIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m10.29 3.86-8.27 14.22A1 1 0 0 0 2.87 20h16.26a1 1 0 0 0 .85-1.52L11.71 3.86a1 1 0 0 0-1.72 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );
}

function DocCard({ doc, onClick }: { doc: KanbanDoc; onClick: () => void }) {
  const vendor = String(doc.merged.vendor ?? "Unknown vendor");
  const date = String(doc.merged.date ?? format(new Date(doc.created_at), "yyyy-MM-dd"));
  const amount = typeof doc.merged.total_amount === "number" ? doc.merged.total_amount : null;
  const currency = String(doc.merged.currency ?? "");
  const conf = doc.confidence !== null ? Math.round(doc.confidence * 100) : null;

  const issues: string[] = [];
  if (doc.confidence !== null && doc.needsAttention) issues.push(`Confidence ${conf}%`);
  if (!doc.requiredComplete) issues.push("Missing required fields");

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--paper)",
        border: "1px solid var(--ink-200)",
        borderRadius: 10,
        padding: "12px 14px",
        cursor: "pointer",
        transition: "box-shadow .15s",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,.08)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ink-900)", flex: 1, lineHeight: 1.3 }}>{vendor}</span>
        {doc.hasComments && (
          <span style={{ color: "var(--blue-600)", flexShrink: 0 }}><ChatIcon /></span>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-500)" }}>{date}</span>
        {amount !== null && (
          <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-800)" }}>
            {currency} {amount.toLocaleString("en", { maximumFractionDigits: 0 })}
          </span>
        )}
      </div>
      {issues.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {issues.map((issue) => (
            <span key={issue} style={{
              fontSize: 10.5, fontWeight: 600,
              background: "oklch(0.97 0.04 60)",
              color: "oklch(0.45 0.15 60)",
              border: "1px solid oklch(0.88 0.08 60)",
              padding: "2px 7px", borderRadius: 6,
              display: "inline-flex", alignItems: "center", gap: 3,
            }}>
              <AlertIcon /> {issue}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Column({
  title,
  color,
  badge,
  docs,
  onCardClick,
}: {
  title: string;
  color: string;
  badge?: string;
  docs: KanbanDoc[];
  onCardClick: (doc: KanbanDoc) => void;
}) {
  return (
    <div style={{
      background: "oklch(0.975 0.004 240)",
      border: "1px solid var(--ink-200)",
      borderRadius: 12,
      display: "flex",
      flexDirection: "column",
      minHeight: 200,
    }}>
      {/* Column header */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--ink-200)",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 13, color: "var(--ink-800)", flex: 1 }}>{title}</span>
        <span style={{
          fontSize: 11, fontWeight: 700, minWidth: 20, textAlign: "center",
          background: "var(--ink-200)", color: "var(--ink-600)",
          padding: "1px 7px", borderRadius: 10,
        }}>
          {badge ?? docs.length}
        </span>
      </div>

      {/* Cards */}
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        {docs.length === 0 && (
          <p style={{ fontSize: 12, color: "var(--ink-400)", textAlign: "center", margin: "20px 0" }}>No documents</p>
        )}
        {docs.map((doc) => (
          <DocCard key={doc.id} doc={doc} onClick={() => onCardClick(doc)} />
        ))}
      </div>
    </div>
  );
}

function SidePanel({
  doc,
  onClose,
  onResolved,
}: {
  doc: KanbanDoc;
  onClose: () => void;
  onResolved: (docId: string, resolved: boolean) => void;
}) {
  const router = useRouter();
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentInput, setCommentInput] = useState("");
  const [posting, setPosting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const vendor = String(doc.merged.vendor ?? "Unknown vendor");
  const date = String(doc.merged.date ?? format(new Date(doc.created_at), "yyyy-MM-dd"));
  const amount = typeof doc.merged.total_amount === "number" ? doc.merged.total_amount : null;
  const currency = String(doc.merged.currency ?? "");
  const conf = doc.confidence !== null ? Math.round(doc.confidence * 100) : null;

  const issues: string[] = [];
  if (doc.confidence !== null && doc.needsAttention) issues.push(`Low confidence: ${conf}%`);
  if (!doc.requiredComplete) issues.push("Missing required fields");

  const fetchComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}/comments`);
      const data = await res.json() as { comments?: DocumentComment[] };
      setComments(data.comments ?? []);
    } finally {
      setLoadingComments(false);
    }
  }, [doc.id]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  async function postComment() {
    if (!commentInput.trim()) return;
    setPosting(true);
    try {
      await fetch(`/api/documents/${doc.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentInput.trim() }),
      });
      setCommentInput("");
      await fetchComments();
      router.refresh();
    } finally {
      setPosting(false);
    }
  }

  async function toggleResolve() {
    setResolving(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}/resolve`, { method: "POST" });
      const data = await res.json() as { resolved?: boolean };
      onResolved(doc.id, data.resolved ?? false);
      router.refresh();
    } finally {
      setResolving(false);
    }
  }

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0,
      width: 400, zIndex: 1000,
      background: "var(--paper)",
      borderLeft: "1px solid var(--ink-200)",
      boxShadow: "-4px 0 24px rgba(0,0,0,.1)",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--ink-200)", display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink-900)", marginBottom: 2 }}>{vendor}</div>
          <div style={{ fontSize: 12, color: "var(--ink-500)" }}>
            {date}
            {amount !== null && <> · <span className="mono" style={{ fontWeight: 600 }}>{currency} {amount.toLocaleString("en", { maximumFractionDigits: 0 })}</span></>}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-400)", padding: 4 }}>
          <CloseIcon />
        </button>
      </div>

      {/* Issues */}
      {issues.length > 0 && (
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--ink-200)", background: "oklch(0.98 0.03 60)" }}>
          {issues.map((issue) => (
            <div key={issue} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "oklch(0.42 0.15 60)", marginBottom: 2 }}>
              <AlertIcon /> {issue}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--ink-200)", display: "flex", gap: 8 }}>
        <Link href={`/documents/${doc.id}/review`} className="btn btn-secondary btn-sm">
          Review document
        </Link>
        <button
          className={`btn btn-sm ${doc.isResolved ? "btn-ghost" : "btn-primary"}`}
          onClick={toggleResolve}
          disabled={resolving}
          style={doc.isResolved ? { color: "var(--ink-500)" } : {}}
        >
          <CheckIcon /> {resolving ? "…" : doc.isResolved ? "Mark unresolved" : "Mark resolved"}
        </button>
      </div>

      {/* Comments */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loadingComments ? (
          <p style={{ fontSize: 13, color: "var(--ink-400)" }}>Loading comments…</p>
        ) : comments.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-400)", textAlign: "center", marginTop: 24 }}>No comments yet. Add one below.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} style={{
              background: "var(--ink-100)", borderRadius: 10, padding: "10px 12px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--blue-600)" }}>
                  {c.user_email ?? "Team member"}
                </span>
                <span style={{ fontSize: 11, color: "var(--ink-400)" }}>
                  {format(new Date(c.created_at), "MMM d, HH:mm")}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "var(--ink-800)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                {c.body}
              </p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Comment input */}
      <div style={{ padding: "12px 20px", borderTop: "1px solid var(--ink-200)", display: "flex", gap: 8 }}>
        <textarea
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
          placeholder="Add a comment…"
          rows={2}
          className="ds-input"
          style={{ flex: 1, resize: "none", fontFamily: "inherit", fontSize: 13 }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); postComment(); }
          }}
        />
        <button
          className="btn btn-primary btn-sm"
          onClick={postComment}
          disabled={posting || !commentInput.trim()}
          style={{ alignSelf: "flex-end" }}
        >
          {posting ? "…" : <SendIcon />}
        </button>
      </div>
    </div>
  );
}

export function KanbanBoard({
  attentionDocs,
  discussionDocs,
  resolvedDocs,
  threshold,
  currency,
}: {
  attentionDocs: KanbanDoc[];
  discussionDocs: KanbanDoc[];
  resolvedDocs: KanbanDoc[];
  threshold: number;
  currency: string;
}) {
  const [selectedDoc, setSelectedDoc] = useState<KanbanDoc | null>(null);
  const [localAttention, setLocalAttention] = useState(attentionDocs);
  const [localDiscussion, setLocalDiscussion] = useState(discussionDocs);
  const [localResolved, setLocalResolved] = useState(resolvedDocs);

  function handleResolved(docId: string, resolved: boolean) {
    const findInAll = [...localAttention, ...localDiscussion, ...localResolved].find((d) => d.id === docId);
    if (!findInAll) return;

    const updated = { ...findInAll, isResolved: resolved };

    if (resolved) {
      setLocalAttention((prev) => prev.filter((d) => d.id !== docId));
      setLocalDiscussion((prev) => prev.filter((d) => d.id !== docId));
      setLocalResolved((prev) => [updated, ...prev.filter((d) => d.id !== docId)]);
    } else {
      setLocalResolved((prev) => prev.filter((d) => d.id !== docId));
      if (updated.hasComments) {
        setLocalDiscussion((prev) => [updated, ...prev.filter((d) => d.id !== docId)]);
      } else if (updated.needsAttention) {
        setLocalAttention((prev) => [updated, ...prev.filter((d) => d.id !== docId)]);
      }
    }

    if (selectedDoc?.id === docId) setSelectedDoc(updated);
  }

  return (
    <>
      <div style={{ fontSize: 12, color: "var(--ink-500)", marginBottom: 16 }}>
        Documents with AI confidence below <strong>{Math.round(threshold * 100)}%</strong> or missing fields appear in "À vérifier".
        Confidence threshold can be changed in <a href="/settings/general" style={{ color: "var(--blue-600)" }}>Settings → General</a>.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <Column
          title="À vérifier"
          color="oklch(0.72 0.16 60)"
          docs={localAttention}
          onCardClick={setSelectedDoc}
        />
        <Column
          title="En discussion"
          color="var(--blue-600)"
          docs={localDiscussion}
          onCardClick={setSelectedDoc}
        />
        <Column
          title="Résolu"
          color="oklch(0.55 0.14 160)"
          docs={localResolved}
          onCardClick={setSelectedDoc}
        />
      </div>

      {selectedDoc && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,.2)" }}
            onClick={() => setSelectedDoc(null)}
          />
          <SidePanel
            doc={selectedDoc}
            onClose={() => setSelectedDoc(null)}
            onResolved={handleResolved}
          />
        </>
      )}
    </>
  );
}
