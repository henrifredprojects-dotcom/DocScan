import { google } from "googleapis";

import { requirePublicEnv } from "@/lib/env";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return new Response(`OAuth error: ${error}`, { status: 400 });
  }

  if (!code) {
    return new Response("Missing authorization code.", { status: 400 });
  }

  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new Response("Missing OAuth config.", { status: 503 });
  }

  const { appUrl } = requirePublicEnv();
  const auth = new google.auth.OAuth2(clientId, clientSecret, `${appUrl}/api/auth/gmail/callback`);
  const { tokens } = await auth.getToken(code);
  const refreshToken = tokens.refresh_token;

  const html = refreshToken
    ? `<!DOCTYPE html>
<html>
<head>
  <title>Gmail Connected — DocScan</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 48px; max-width: 620px; margin: 0 auto; background: #f9f9f9; }
    h2 { color: #1a1a2e; margin-bottom: 8px; }
    p { color: #555; line-height: 1.6; }
    pre { background: #1a1a2e; color: #e2e8f0; padding: 18px 20px; border-radius: 10px; font-size: 13px; word-break: break-all; white-space: pre-wrap; }
    code { background: #eee; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
    .btn { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #2563eb; color: #fff; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; }
  </style>
</head>
<body>
  <h2>✓ Gmail connected!</h2>
  <p>Copy the line below and add it to your <code>.env.local</code> file, then restart the server.</p>
  <pre>GMAIL_REFRESH_TOKEN=${refreshToken}</pre>
  <p>Once the server is restarted, the "Sync Gmail" button in Settings → Email will be active.</p>
  <a class="btn" href="/settings/email">← Back to Email settings</a>
</body>
</html>`
    : `<!DOCTYPE html>
<html>
<head><title>No refresh token — DocScan</title></head>
<body style="font-family:system-ui;padding:48px;max-width:600px">
  <h2>⚠ No refresh token received</h2>
  <p>Google only returns a refresh token on the first authorization. If you've already connected this account before, revoke access at <a href="https://myaccount.google.com/permissions" target="_blank">myaccount.google.com/permissions</a>, then try again.</p>
  <a href="/api/auth/gmail">Try again</a>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html" } });
}
