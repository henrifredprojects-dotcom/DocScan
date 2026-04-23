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

function CheckSmIcon() {
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
    <button type="button" onClick={handleCopy} className="btn btn-ghost btn-sm" style={{ gap: 5 }}>
      {copied ? <CheckSmIcon /> : <CopyIcon />}
      {copied ? "Copied!" : label}
    </button>
  );
}

export function WhatsAppSettings({
  appUrl,
  workspaces,
  isConfigured,
}: {
  appUrl: string;
  workspaces: { id: string; name: string; color?: string | null }[];
  isConfigured: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Webhook URLs per workspace */}
      <div className="card">
        <div className="card-h">
          <div>
            <div className="card-title">Webhook URLs — one per workspace</div>
            <div className="card-sub">Paste each URL in Twilio → Phone Number → Messaging → "A message comes in" (Webhook, HTTP POST).</div>
          </div>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Workspace</th>
              <th>Webhook URL</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {workspaces.map((ws) => {
              const url = `${appUrl}/api/ingest/whatsapp?workspace_id=${ws.id}`;
              return (
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
                  <td>
                    <code className="mono" style={{ fontSize: 11.5, color: "var(--blue-ink)", wordBreak: "break-all" }}>
                      {url}
                    </code>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <CopyButton value={url} label="Copy" />
                  </td>
                </tr>
              );
            })}
            {workspaces.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: 40, textAlign: "center", color: "var(--ink-500)" }}>No workspaces.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Auth token */}
      <div className="card">
        <div className="card-h">
          <div>
            <div className="card-title">Twilio authentication</div>
            <div className="card-sub">Add these to your <code className="mono" style={{ color: "var(--blue-600)", background: "var(--blue-100)", padding: "1px 5px", borderRadius: 4 }}>.env.local</code>.</div>
          </div>
          {isConfigured
            ? <span className="chip validated"><CheckSmIcon /> Configured</span>
            : <span className="chip pending">Not configured</span>}
        </div>
        <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { key: "TWILIO_ACCOUNT_SID", hint: "From Twilio Console → Account Info" },
            { key: "TWILIO_AUTH_TOKEN", hint: "From Twilio Console → Account Info" },
          ].map(({ key, hint }) => (
            <div key={key}>
              <code className="mono" style={{ display: "block", padding: "9px 13px", background: "var(--ink-100)", border: "1px solid var(--ink-200)", borderRadius: 8, fontSize: 12.5, color: "var(--ink-600)" }}>
                {key}=&lt;your-value&gt;
              </code>
              <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "var(--ink-500)" }}>{hint}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Setup guide */}
      <div className="card">
        <div className="card-h"><div className="card-title">Twilio setup guide</div></div>
        <div className="card-b">
          {[
            { n: 1, title: "Create a Twilio account", body: "Go to twilio.com → free trial includes a WhatsApp Sandbox. No credit card required for testing." },
            { n: 2, title: "Enable WhatsApp Sandbox", body: "Twilio Console → Messaging → Try it out → Send a WhatsApp message. Follow the join instructions to link your phone." },
            { n: 3, title: "Configure the webhook", body: 'Twilio Console → Phone Numbers → Manage → Active Numbers → your number → Messaging → "A message comes in" → Webhook → paste the URL for your workspace above.' },
            { n: 4, title: "Add env variables", body: "Copy TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN from Twilio Console → Account Info → paste in .env.local → restart server." },
            { n: 5, title: "Test it", body: "Send a photo of a receipt from your WhatsApp to the Twilio sandbox number. It appears in DocScan within seconds as a pending document." },
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

      {/* What the user sends */}
      <div className="card">
        <div className="card-h"><div className="card-title">User experience</div></div>
        <div className="card-b">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { icon: "📸", title: "Photo of receipt", desc: "Take a photo and send it — OCR extracts vendor, amount, date automatically." },
              { icon: "📄", title: "PDF invoice", desc: "Forward a PDF invoice directly from WhatsApp — same pipeline as upload." },
              { icon: "🔁", title: "Multiple files", desc: "Send multiple photos in one message — each is processed and queued separately." },
              { icon: "✅", title: "Confirmation", desc: 'The bot replies automatically: "✓ 1 document received and queued for review: Vendor Name".' },
            ].map((item) => (
              <div key={item.title} style={{ padding: "14px 16px", background: "var(--ink-100)", border: "1px solid var(--ink-200)", borderRadius: "var(--radius)" }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{item.icon}</div>
                <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink-900)", marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-600)", lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
