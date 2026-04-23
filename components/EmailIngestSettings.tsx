"use client";

import { useState } from "react";

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
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

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="btn btn-ghost btn-sm"
      style={{ gap: 5 }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? "Copied!" : label}
    </button>
  );
}

export function EmailIngestSettings({
  webhookUrl,
  workspaces,
}: {
  webhookUrl: string;
  workspaces: { id: string; name: string; color?: string | null }[];
}) {
  const [selectedWs, setSelectedWs] = useState(workspaces[0]?.id ?? "");

  const examplePayload = JSON.stringify(
    {
      workspace_id: selectedWs || "YOUR_WORKSPACE_ID",
      secret: "YOUR_INGEST_WEBHOOK_SECRET",
      filename: "invoice.pdf",
      content_type: "application/pdf",
      attachment_url: "https://make.celonis.com/your-attachment-url",
      sender_email: "vendor@example.com",
    },
    null,
    2,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Webhook URL */}
      <div className="card">
        <div className="card-h">
          <div>
            <div className="card-title">Webhook URL</div>
            <div className="card-sub">Paste this URL in Make.com → HTTP module → URL field.</div>
          </div>
        </div>
        <div className="card-b" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <code
            className="mono"
            style={{
              flex: 1,
              padding: "9px 13px",
              background: "var(--ink-100)",
              border: "1px solid var(--ink-200)",
              borderRadius: 8,
              fontSize: 12.5,
              color: "var(--blue-ink)",
              wordBreak: "break-all",
            }}
          >
            {webhookUrl}
          </code>
          <CopyButton value={webhookUrl} label="Copy" />
        </div>
      </div>

      {/* Secret */}
      <div className="card">
        <div className="card-h">
          <div>
            <div className="card-title">Authentication secret</div>
            <div className="card-sub">
              Set <code className="mono" style={{ color: "var(--blue-600)", background: "var(--blue-100)", padding: "1px 5px", borderRadius: 4 }}>INGEST_WEBHOOK_SECRET</code> in your{" "}
              <code className="mono" style={{ color: "var(--blue-600)", background: "var(--blue-100)", padding: "1px 5px", borderRadius: 4 }}>.env.local</code> file, then copy the value here.
            </div>
          </div>
        </div>
        <div className="card-b">
          <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--ink-600)", lineHeight: 1.5 }}>
            Generate a strong random secret (e.g. <code className="mono" style={{ background: "var(--ink-100)", padding: "1px 5px", borderRadius: 4 }}>openssl rand -hex 32</code>) and add it to both your server and the Make.com scenario body.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <code className="mono" style={{ flex: 1, padding: "9px 13px", background: "var(--ink-100)", border: "1px solid var(--ink-200)", borderRadius: 8, fontSize: 12.5, color: "var(--ink-600)" }}>
              INGEST_WEBHOOK_SECRET=&lt;your-secret&gt;
            </code>
          </div>
        </div>
      </div>

      {/* Workspace IDs */}
      {workspaces.length > 0 && (
        <div className="card">
          <div className="card-h">
            <div>
              <div className="card-title">Workspace IDs</div>
              <div className="card-sub">Send the correct workspace_id in each Make.com scenario.</div>
            </div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Workspace</th>
                <th>workspace_id</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {workspaces.map((ws) => (
                <tr key={ws.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: 7,
                        background: ws.color ?? "var(--blue-600)",
                        display: "grid", placeItems: "center",
                        fontSize: 9, fontWeight: 700, color: "#fff", flexShrink: 0,
                      }}>
                        {ws.name.slice(0, 2).toUpperCase()}
                      </span>
                      <strong>{ws.name}</strong>
                    </div>
                  </td>
                  <td className="mono" style={{ fontSize: 12, color: "var(--ink-600)" }}>{ws.id}</td>
                  <td style={{ textAlign: "right" }}>
                    <CopyButton value={ws.id} label="Copy ID" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Example payload */}
      <div className="card">
        <div className="card-h">
          <div>
            <div className="card-title">Example Make.com JSON payload</div>
            <div className="card-sub">Use this in the HTTP module body (method: POST, content-type: application/json).</div>
          </div>
          {workspaces.length > 1 && (
            <select
              className="ds-select"
              style={{ width: "auto", fontSize: 12 }}
              value={selectedWs}
              onChange={(e) => setSelectedWs(e.target.value)}
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
            </select>
          )}
        </div>
        <div className="card-b" style={{ position: "relative" }}>
          <pre
            className="mono"
            style={{
              margin: 0,
              padding: "14px 16px",
              background: "var(--ink-100)",
              border: "1px solid var(--ink-200)",
              borderRadius: 9,
              fontSize: 12,
              color: "var(--ink-800)",
              lineHeight: 1.6,
              overflowX: "auto",
            }}
          >
            {examplePayload}
          </pre>
          <div style={{ position: "absolute", top: 28, right: 28 }}>
            <CopyButton value={examplePayload} label="Copy" />
          </div>
        </div>
      </div>

      {/* Step-by-step guide */}
      <div className="card">
        <div className="card-h"><div className="card-title">Make.com setup guide</div></div>
        <div className="card-b">
          {[
            { n: 1, title: "Watch emails", body: "Add a Gmail or Outlook \"Watch Emails\" trigger. Filter by subject or sender." },
            { n: 2, title: "Iterator on attachments", body: "Add an Iterator module on the attachments array so each file is processed separately." },
            { n: 3, title: "Upload attachment (optional)", body: "Add an HTTP \"Make a Request\" to upload the binary to any public storage, or use the attachment binary directly as base64." },
            { n: 4, title: "HTTP POST to webhook", body: 'Add HTTP "Make a Request" → Method: POST → URL: paste the webhook URL above → Body type: Raw → Content-type: application/json → Body: paste and fill the JSON payload.' },
            { n: 5, title: "Done", body: "Each attachment auto-appears in DocScan as a pending document, ready for review." },
          ].map((step) => (
            <div key={step.n} style={{ display: "flex", gap: 14, marginBottom: 14 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                background: "var(--blue-600)", color: "#fff",
                display: "grid", placeItems: "center",
                fontSize: 12, fontWeight: 700,
              }}>
                {step.n}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--ink-900)", marginBottom: 2 }}>{step.title}</div>
                <div style={{ fontSize: 13, color: "var(--ink-600)", lineHeight: 1.5 }}>{step.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
