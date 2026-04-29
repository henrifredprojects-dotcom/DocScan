import { randomUUID } from "crypto";
import { google } from "googleapis";
import { NextResponse } from "next/server";

import { getFewShotExamples } from "@/lib/data/documents";
import { extractDocumentData } from "@/lib/ocr/extract";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { NormalizedExtraction } from "@/lib/types";

export const runtime = "nodejs";
// Processes one message per call to stay within Vercel Hobby 10s limit

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

function buildGmailClient() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;
  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: "v1", auth });
}

// GET — returns how many unread messages are pending (for the Sync button counter)
export async function GET(request: Request) {
  try {
    const gmail = buildGmailClient();
    if (!gmail) return NextResponse.json({ pending: 0 });

    const { searchParams } = new URL(request.url);
    const label = searchParams.get("label") ?? "DocScan";

    const listRes = await gmail.users.messages.list({
      userId: "me",
      q: `label:${label} is:unread has:attachment`,
      maxResults: 50,
    });

    return NextResponse.json({ pending: listRes.data.messages?.length ?? 0 });
  } catch {
    return NextResponse.json({ pending: 0 });
  }
}

// POST — processes exactly one message, returns { done: true } when queue is empty
export async function POST(request: Request) {
  try {
    const gmail = buildGmailClient();
    if (!gmail) {
      return NextResponse.json(
        { error: "Gmail not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN in .env.local." },
        { status: 503 },
      );
    }

    const body = await request.json() as { workspace_id?: string; label?: string };
    const workspaceId = body.workspace_id;
    if (!workspaceId) {
      return NextResponse.json({ error: "Missing workspace_id." }, { status: 400 });
    }

    const label = body.label ?? "DocScan";

    const admin = getSupabaseAdminClient();
    const { data: ws } = await admin
      .from("workspaces")
      .select("id, owner_id")
      .eq("id", workspaceId)
      .single();

    if (!ws) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });

    // Fetch only the next unread message
    const listRes = await gmail.users.messages.list({
      userId: "me",
      q: `label:${label} is:unread has:attachment`,
      maxResults: 1,
    });

    const messages = listRes.data.messages ?? [];
    if (messages.length === 0) {
      return NextResponse.json({ ok: true, done: true, processed: 0 });
    }

    const msg = messages[0];
    if (!msg.id) return NextResponse.json({ ok: true, done: true, processed: 0 });

    const full = await gmail.users.messages.get({
      userId: "me",
      id: msg.id,
      format: "full",
    });

    const payload = full.data.payload;
    if (!payload) {
      await gmail.users.messages.modify({
        userId: "me",
        id: msg.id,
        requestBody: { removeLabelIds: ["UNREAD"] },
      });
      return NextResponse.json({ ok: true, done: false, processed: 0 });
    }

    const headers = payload.headers ?? [];
    const from = headers.find((h) => h.name === "From")?.value ?? "";
    const senderEmail = from.match(/<(.+)>/)?.[1] ?? from.trim();

    type GmailPart = NonNullable<typeof payload>;

    function collectParts(p: GmailPart): GmailPart[] {
      if (p?.parts) return p.parts.flatMap((child) => collectParts(child as GmailPart));
      return p ? [p] : [];
    }
    const allParts = payload.parts
      ? payload.parts.flatMap((child) => collectParts(child as GmailPart))
      : [payload];

    const attachmentParts = allParts.filter(
      (p): p is GmailPart & { filename: string; mimeType: string; body: { attachmentId: string } } =>
        Boolean(p?.filename && p?.body?.attachmentId && p?.mimeType && ALLOWED_TYPES.has(p.mimeType)),
    );

    const examples = await getFewShotExamples(workspaceId).catch(() => []);
    let processed = 0;
    const errors: string[] = [];

    for (const part of attachmentParts) {
      const attachmentId = part.body.attachmentId;
      const filename = part.filename;
      const contentType = part.mimeType;

      const attachRes = await gmail.users.messages.attachments.get({
        userId: "me",
        messageId: msg.id,
        id: attachmentId,
      });

      const data = attachRes.data.data;
      if (!data) continue;

      const bytes = Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64");
      const sizeMb = bytes.byteLength / (1024 * 1024);
      if (sizeMb > 20) {
        errors.push(`${filename}: too large (${sizeMb.toFixed(1)} MB)`);
        continue;
      }

      const documentId = randomUUID();
      const safeName = filename
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
      const objectPath = `${workspaceId}/${documentId}/${safeName}`;

      const { error: uploadError } = await admin.storage
        .from("documents")
        .upload(objectPath, bytes, { contentType, upsert: false });

      if (uploadError) {
        errors.push(`${filename}: upload failed`);
        continue;
      }

      const { data: { publicUrl } } = admin.storage.from("documents").getPublicUrl(objectPath);

      const extracted = await extractDocumentData(publicUrl, examples, contentType);

      type VRRow = { vendor_match: string; categories: { name: string } | null };
      const { data: vendorRules } = await admin
        .from("vendor_rules")
        .select("vendor_match, categories(name)")
        .eq("workspace_id", workspaceId) as unknown as { data: VRRow[] | null; error: Error | null };

      if (vendorRules && extracted.vendor) {
        const vendorLower = extracted.vendor.toLowerCase();
        const matched = vendorRules.find((r) =>
          vendorLower.includes(r.vendor_match.toLowerCase()),
        );
        if (matched?.categories?.name) {
          (extracted as NormalizedExtraction & { suggested_category: string }).suggested_category =
            matched.categories.name;
        }
      }

      const { error: insertError } = await admin.from("documents").insert({
        id: documentId,
        workspace_id: workspaceId,
        user_id: ws.owner_id,
        file_url: publicUrl,
        extracted_data: {
          ...extracted,
          ...(senderEmail && { user_email: senderEmail }),
        },
        status: "pending",
        source: "email",
      });

      if (!insertError) processed++;
    }

    // Mark message as read so it won't be picked up again
    await gmail.users.messages.modify({
      userId: "me",
      id: msg.id,
      requestBody: { removeLabelIds: ["UNREAD"] },
    });

    return NextResponse.json({
      ok: true,
      done: false, // caller should loop until done: true
      processed,
      ...(errors.length > 0 && { errors }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
