import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

// Called by Vercel Cron — protected by CRON_SECRET
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL not set" }, { status: 500 });

  const gmailConfigured = Boolean(
    process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN,
  );
  if (!gmailConfigured) {
    return NextResponse.json({ ok: true, skipped: "Gmail not configured" });
  }

  const admin = getSupabaseAdminClient();
  const { data: workspaces } = await admin.from("workspaces").select("id, name");
  if (!workspaces?.length) return NextResponse.json({ ok: true, processed: 0 });

  const results: { workspace: string; processed: number; error?: string }[] = [];

  for (const ws of workspaces) {
    let totalProcessed = 0;
    const label = `DocScan/${ws.name}`;

    try {
      // Drain all pending messages for this workspace
      while (true) {
        const res = await fetch(`${appUrl}/api/ingest/gmail`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspace_id: ws.id, label }),
        });
        const data = await res.json() as { ok?: boolean; done?: boolean; processed?: number; error?: string };
        if (!data.ok) {
          results.push({ workspace: ws.name, processed: totalProcessed, error: data.error });
          break;
        }
        totalProcessed += data.processed ?? 0;
        if (data.done) {
          results.push({ workspace: ws.name, processed: totalProcessed });
          break;
        }
      }
    } catch (err) {
      results.push({ workspace: ws.name, processed: totalProcessed, error: String(err) });
    }
  }

  const total = results.reduce((sum, r) => sum + r.processed, 0);
  return NextResponse.json({ ok: true, total, results });
}
