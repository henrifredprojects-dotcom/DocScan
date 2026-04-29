import { google } from "googleapis";

import { requirePublicEnv } from "@/lib/env";

export async function GET() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new Response(
      "Add GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET to .env.local first, then restart the server.",
      { status: 503 },
    );
  }

  const { appUrl } = requirePublicEnv();
  const auth = new google.auth.OAuth2(clientId, clientSecret, `${appUrl}/api/auth/gmail/callback`);

  const url = auth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/gmail.modify"],
  });

  return Response.redirect(url);
}
