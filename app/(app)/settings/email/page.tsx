import { EmailIngestSettings } from "@/components/EmailIngestSettings";
import { getCurrentUser, listUserWorkspaces } from "@/lib/data/workspaces";
import { requirePublicEnv } from "@/lib/env";

export default async function EmailSettingsPage() {
  const user = await getCurrentUser();
  if (!user) return <p>Please login.</p>;

  const workspaces = await listUserWorkspaces(user);
  const { appUrl } = requirePublicEnv();
  const webhookUrl = `${appUrl}/api/ingest/email`;

  const isConfigured = Boolean(process.env.INGEST_WEBHOOK_SECRET);

  return (
    <div>
      <div className="screen-h">
        <div>
          <h1>Email ingestion</h1>
          <p>Forward invoices and receipts to DocScan via Make.com — Phase 2.</p>
        </div>
        {isConfigured ? (
          <span className="chip validated">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Webhook ready
          </span>
        ) : (
          <span className="chip pending">Secret not configured</span>
        )}
      </div>

      {!isConfigured && (
        <div
          style={{
            marginBottom: 24,
            padding: "14px 18px",
            background: "oklch(0.97 0.04 85)",
            border: "1px solid oklch(0.85 0.1 85)",
            borderRadius: "var(--radius)",
            fontSize: 13,
            color: "oklch(0.38 0.14 80)",
            lineHeight: 1.55,
          }}
        >
          <strong>Action required:</strong> add{" "}
          <code
            className="mono"
            style={{ background: "oklch(0.93 0.06 85)", padding: "1px 6px", borderRadius: 4 }}
          >
            INGEST_WEBHOOK_SECRET=your-secret
          </code>{" "}
          to your <code className="mono" style={{ background: "oklch(0.93 0.06 85)", padding: "1px 6px", borderRadius: 4 }}>.env.local</code> file and restart the server.
        </div>
      )}

      <EmailIngestSettings
        webhookUrl={webhookUrl}
        workspaces={workspaces.map((ws) => ({ id: ws.id, name: ws.name, color: ws.color }))}
      />
    </div>
  );
}
