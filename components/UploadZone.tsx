"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

function UploadIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16"/>
      <line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
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

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="8" y1="13" x2="16" y2="13"/>
      <line x1="8" y1="17" x2="16" y2="17"/>
    </svg>
  );
}

const STEPS = [
  { t: "Upload to Supabase Storage",  s: "Encryption and storage in the 'documents' bucket" },
  { t: "OpenAI Vision extraction",    s: "Analyzing the document, reading structured fields" },
  { t: "Field normalization",         s: "Date, amount, VAT, currency, suggested category" },
  { t: "Required fields validation",  s: "Verification before sending to review" },
];

interface StagedFile {
  file: File;
  preview: string | null; // object URL for images, null for PDFs
  source: "upload" | "photo";
}

type Stage = "idle" | "staging" | "processing" | "error";

export function UploadZone({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>("idle");
  const [dragging, setDragging] = useState(false);
  const [staged, setStaged] = useState<StagedFile[]>([]);

  // Processing state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [processedIds, setProcessedIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [fileErrors, setFileErrors] = useState<Record<number, string>>({});

  function buildPreview(file: File): string | null {
    if (file.type.startsWith("image/")) return URL.createObjectURL(file);
    return null;
  }

  function addFiles(files: FileList | File[], source: "upload" | "photo" = "upload") {
    const arr = Array.from(files);
    const newStaged: StagedFile[] = arr.map((f) => ({ file: f, preview: buildPreview(f), source }));
    setStaged((prev) => [...prev, ...newStaged]);
    setStage("staging");
  }

  function removeFile(idx: number) {
    setStaged((prev) => {
      const item = prev[idx];
      if (item?.preview) URL.revokeObjectURL(item.preview);
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0) setStage("idle");
      return next;
    });
  }

  function resetAll() {
    staged.forEach((s) => { if (s.preview) URL.revokeObjectURL(s.preview); });
    setStaged([]);
    setProcessedIds([]);
    setCurrentIdx(0);
    setStepIdx(0);
    setError("");
    setFileErrors({});
    setStage("idle");
  }

  async function sendToAI() {
    if (staged.length === 0) return;
    setStage("processing");
    setCurrentIdx(0);
    setStepIdx(0);
    setProcessedIds([]);
    setError("");

    const ids: string[] = [];

    for (let i = 0; i < staged.length; i++) {
      setCurrentIdx(i);
      setStepIdx(0);

      const stepTimer = setInterval(() => {
        setStepIdx((s) => (s >= STEPS.length - 1 ? s : s + 1));
      }, 1200);

      const body = new FormData();
      body.append("workspace_id", workspaceId);
      body.append("file", staged[i].file);
      body.append("source", staged[i].source);

      const res = await fetch("/api/process", { method: "POST", body });
      clearInterval(stepTimer);
      setStepIdx(STEPS.length);

      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        setFileErrors((prev) => ({ ...prev, [i]: payload.error ?? "Upload failed" }));
        continue; // skip this file, process the rest
      }

      const payload = (await res.json()) as { documentId: string };
      ids.push(payload.documentId);
    }

    setProcessedIds(ids);
    staged.forEach((s) => { if (s.preview) URL.revokeObjectURL(s.preview); });

    const errors = Object.values(fileErrors);
    if (ids.length === 0 && errors.length > 0) {
      setError(errors.join("\n"));
      setStage("error");
      return;
    }

    if (ids.length === 1) {
      router.push(`/documents/${ids[0]}/review`);
    } else {
      router.push("/documents");
    }
  }

  // ── Idle ──────────────────────────────────────────────────────────────────
  if (stage === "idle") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20 }}>
        <div
          className={`drop-zone${dragging ? " dragging" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.heic,.pdf"
            multiple
            style={{ display: "none" }}
            onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); }}
          />
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: "#fff", border: "1px solid var(--blue-200)",
            display: "grid", placeItems: "center",
            margin: "0 auto 14px",
            boxShadow: "var(--shadow)",
            color: "var(--blue-600)",
          }}>
            <UploadIcon size={26} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--ink-900)", margin: "0 0 6px" }}>
            Drop receipts, invoices, or tickets
          </h3>
          <p style={{ fontSize: 13, color: "var(--ink-600)", margin: "0 0 4px" }}>
            Click to browse — you can select multiple files at once
          </p>
          <div style={{ marginTop: 14, display: "inline-flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
            {["PNG", "JPG", "HEIC", "PDF"].map((fmt) => (
              <span key={fmt} className="mono" style={{
                fontSize: 10.5, padding: "2px 8px", borderRadius: 5,
                background: "#fff", border: "1px solid var(--blue-200)", color: "var(--blue-ink)",
              }}>{fmt}</span>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--blue-100)", color: "var(--blue-600)", display: "grid", placeItems: "center" }}>
                <SparkleIcon />
              </div>
              <div className="card-title">Take a photo</div>
            </div>
            <p className="card-sub" style={{ margin: "4px 0 10px" }}>
              Open on your phone and tap below — your camera opens directly. Works on iOS Safari and Android Chrome.
            </p>
            <button
              className="btn btn-secondary"
              style={{ width: "100%" }}
              onClick={() => cameraRef.current?.click()}
            >
              Open camera
            </button>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files, "photo"); }}
            />
          </div>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--ink-100)", color: "var(--ink-400)", display: "grid", placeItems: "center" }}>
                <SparkleIcon />
              </div>
              <div className="card-title" style={{ color: "var(--ink-500)" }}>Forward via email</div>
              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 999, background: "var(--ink-100)", color: "var(--ink-500)", border: "1px solid var(--ink-200)" }}>Phase 2</span>
            </div>
            <p className="card-sub" style={{ margin: "4px 0 0" }}>
              A dedicated email address per workspace — automatic ingestion via Make.com. Coming soon.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Staging ───────────────────────────────────────────────────────────────
  if (stage === "staging") {
    return (
      <div>
        {/* Thumbnail grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
          {staged.map((item, idx) => (
            <div key={idx} style={{ position: "relative", borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--ink-200)", background: "var(--paper)", boxShadow: "var(--shadow-sm)" }}>
              {/* Thumbnail */}
              <div style={{ height: 140, background: "var(--ink-100)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {item.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.preview} alt={item.file.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "var(--blue-600)" }}>
                    <PdfIcon />
                    <span className="mono" style={{ fontSize: 10, color: "var(--ink-500)", textAlign: "center", padding: "0 8px", wordBreak: "break-all" }}>PDF</span>
                  </div>
                )}
              </div>

              {/* File name */}
              <div style={{ padding: "8px 10px", borderTop: "1px solid var(--ink-200)" }}>
                <div style={{ fontSize: 11.5, fontWeight: 500, color: "var(--ink-800)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.file.name}
                </div>
                <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-500)", marginTop: 2 }}>
                  {(item.file.size / 1024).toFixed(0)} KB
                </div>
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeFile(idx)}
                style={{
                  position: "absolute", top: 6, right: 6,
                  width: 24, height: 24, borderRadius: 6,
                  background: "rgba(0,0,0,.55)", border: "none",
                  display: "grid", placeItems: "center",
                  cursor: "pointer", color: "#fff",
                }}
              >
                <XIcon />
              </button>
            </div>
          ))}

          {/* Add more */}
          <div
            onClick={() => inputRef.current?.click()}
            style={{
              height: 175, border: "2px dashed var(--blue-300)", borderRadius: "var(--radius)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 8, cursor: "pointer", color: "var(--blue-600)",
              background: "var(--blue-100)",
              transition: "all .15s ease",
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.heic,.pdf"
              multiple
              style={{ display: "none" }}
              onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); }}
            />
            <UploadIcon size={20} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>Add more</span>
          </div>
        </div>

        {/* Confirmation bar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "16px 20px",
          background: "var(--paper)",
          border: "1px solid var(--ink-200)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-sm)",
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink-900)" }}>
              {staged.length} document{staged.length > 1 ? "s" : ""} ready
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ink-500)", marginTop: 2 }}>
              Review the previews above. Remove any unwanted files, then send to AI.
            </div>
          </div>
          <button className="btn btn-secondary" onClick={resetAll}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={sendToAI} style={{ gap: 8 }}>
            <SparkleIcon />
            Send {staged.length > 1 ? `${staged.length} documents` : "to AI"}
          </button>
        </div>
      </div>
    );
  }

  // ── Processing ────────────────────────────────────────────────────────────
  if (stage === "processing") {
    const currentFile = staged[currentIdx];
    const total = staged.length;

    return (
      <div>
        {/* Overall progress */}
        {total > 1 && (
          <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 6, background: "var(--ink-200)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${((currentIdx) / total) * 100}%`,
                background: "var(--blue-600)",
                borderRadius: 3,
                transition: "width .4s ease",
              }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-700)", flexShrink: 0 }}>
              {currentIdx + 1} / {total}
            </span>
          </div>
        )}

        <div style={{ display: "flex", gap: 24, alignItems: "stretch" }}>
          {/* Preview */}
          <div style={{ flex: 1, border: "1px solid var(--ink-200)", borderRadius: "var(--radius-lg)", background: "#fff", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--ink-200)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{currentFile?.file.name}</span>
              <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-500)" }}>
                {currentFile ? `${(currentFile.file.size / 1024).toFixed(0)} KB` : ""}
              </span>
            </div>
            <div style={{ flex: 1, position: "relative", minHeight: 320, overflow: "hidden" }}>
              {currentFile?.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentFile.preview}
                  alt={currentFile.file.name}
                  style={{ width: "100%", height: "100%", objectFit: "contain", background: "var(--ink-100)" }}
                />
              ) : (
                <div style={{
                  flex: 1,
                  background: "repeating-linear-gradient(45deg, var(--ink-100), var(--ink-100) 10px, var(--ink-200) 10px, var(--ink-200) 12px)",
                  position: "absolute",
                  inset: 0,
                }}>
                  <div style={{ position: "absolute", inset: 20, background: "#fff", borderRadius: 6, boxShadow: "var(--shadow-lg)", padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                    {[70, 40, "hl", 50, 30, null, 60, 35, 70, 30, null, "hl"].map((w, i) => {
                      if (w === null) return <div key={i} style={{ height: 1, background: "var(--ink-200)" }} />;
                      return <div key={i} style={{ height: 6, borderRadius: 3, width: `${w === "hl" ? 45 : w}%`, background: w === "hl" ? "var(--blue-300)" : "var(--ink-200)" }} />;
                    })}
                  </div>
                </div>
              )}
              <div className="scan-line" />
            </div>
          </div>

          {/* Steps */}
          <div style={{ width: 340, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--blue-600)", display: "flex", alignItems: "center", gap: 6 }}>
                <SparkleIcon /> AI pipeline
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>Extracting…</div>
            </div>
            {STEPS.map((step, i) => {
              const done = i < stepIdx;
              const active = i === stepIdx;
              return (
                <div key={i} className={`pstep${active ? " active" : ""}${done ? " done" : ""}`}>
                  <div className="pstep-ic">{done ? <CheckIcon /> : i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-900)", margin: 0 }}>{step.t}</p>
                    <p style={{ fontSize: 12, margin: "2px 0 0", lineHeight: 1.4, color: active ? "var(--blue-ink)" : "var(--ink-500)" }}>{step.s}</p>
                  </div>
                  {active && <div className="spinner" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24, background: "oklch(0.97 0.03 25)", border: "1px solid oklch(0.85 0.08 25)", borderRadius: "var(--radius-lg)" }}>
      <p style={{ color: "var(--err)", fontWeight: 600, margin: "0 0 12px" }}>Upload failed</p>
      <p style={{ color: "var(--ink-700)", fontSize: 13, margin: "0 0 16px" }}>{error}</p>
      <button className="btn btn-secondary" onClick={resetAll}>Try again</button>
    </div>
  );
}
