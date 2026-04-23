import { createHmac } from "crypto";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { getFewShotExamples } from "@/lib/data/documents";
import { extractDocumentData } from "@/lib/ocr/extract";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { NormalizedExtraction } from "@/lib/types";

// Twilio HMAC-SHA1 signature verification
function verifyTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string,
): boolean {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], "");
  const expected = createHmac("sha1", authToken)
    .update(url + sortedParams)
    .digest("base64");
  return expected === signature;
}

function twiml(message: string): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`,
    { status: 200, headers: { "Content-Type": "text/xml" } },
  );
}

export async function POST(request: Request) {
  try {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      return NextResponse.json({ error: "WhatsApp ingestion not configured." }, { status: 503 });
    }

    // workspace_id is passed as query param in the webhook URL configured in Twilio
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspace_id");
    if (!workspaceId) {
      return twiml("Configuration error: missing workspace_id in webhook URL.");
    }

    // Parse Twilio's URL-encoded body
    const text = await request.text();
    const params: Record<string, string> = {};
    for (const [k, v] of new URLSearchParams(text)) {
      params[k] = v;
    }

    // Verify Twilio signature (skip in dev if no signature present)
    const signature = request.headers.get("x-twilio-signature") ?? "";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const fullUrl = `${appUrl}/api/ingest/whatsapp?workspace_id=${workspaceId}`;

    if (signature && !verifyTwilioSignature(authToken, fullUrl, params, signature)) {
      return NextResponse.json({ error: "Invalid Twilio signature." }, { status: 401 });
    }

    const numMedia = parseInt(params.NumMedia ?? "0", 10);
    if (numMedia === 0) {
      return twiml("No attachment detected. Please send a photo or PDF of your receipt.");
    }

    const admin = getSupabaseAdminClient();

    // Verify workspace exists
    const { data: ws } = await admin
      .from("workspaces")
      .select("id, owner_id")
      .eq("id", workspaceId)
      .single();

    if (!ws) return twiml("Workspace not found. Check your webhook URL configuration.");

    const examples = await getFewShotExamples(workspaceId).catch(() => []);
    const processed: string[] = [];

    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = params[`MediaUrl${i}`];
      const contentType = params[`MediaContentType${i}`] ?? "image/jpeg";

      if (!mediaUrl) continue;

      // Download the media (Twilio requires auth for private media URLs)
      const accountSid = process.env.TWILIO_ACCOUNT_SID ?? "";
      const headers: Record<string, string> = {};
      if (accountSid && authToken) {
        headers.Authorization = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
      }

      const mediaRes = await fetch(mediaUrl, { headers });
      if (!mediaRes.ok) continue;

      const bytes = Buffer.from(await mediaRes.arrayBuffer());
      const sizeMb = bytes.byteLength / (1024 * 1024);
      if (sizeMb > 20) continue;

      // Build filename from content type
      const ext = contentType.split("/")[1]?.split(";")[0] ?? "jpg";
      const filename = `whatsapp-${Date.now()}.${ext}`;

      // Upload to storage
      const documentId = randomUUID();
      const objectPath = `${workspaceId}/${documentId}/${filename}`;

      const { error: uploadError } = await admin.storage
        .from("documents")
        .upload(objectPath, bytes, { contentType, upsert: false });

      if (uploadError) continue;

      const { data: { publicUrl } } = admin.storage.from("documents").getPublicUrl(objectPath);

      // OCR with few-shot examples
      const extracted = await extractDocumentData(publicUrl, examples);

      // Apply vendor rules
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
        if (matched) {
          const catName = matched.categories?.name;
          if (catName) {
            (extracted as NormalizedExtraction & { suggested_category: string }).suggested_category = catName;
          }
        }
      }

      // Sender's WhatsApp number as user_email hint
      const senderNumber = (params.From ?? "").replace("whatsapp:", "");

      const { data: created, error: insertError } = await admin
        .from("documents")
        .insert({
          id: documentId,
          workspace_id: workspaceId,
          user_id: ws.owner_id,
          file_url: publicUrl,
          extracted_data: {
            ...extracted,
            ...(senderNumber && { user_email: senderNumber }),
          },
          status: "pending",
          source: "whatsapp",
        })
        .select("id")
        .single();

      if (!insertError && created) {
        processed.push(extracted.vendor || "Document");
      }
    }

    if (processed.length === 0) {
      return twiml("Could not process the attachment. Please send a clear photo or PDF.");
    }

    const vendorList = processed.join(", ");
    return twiml(`✓ ${processed.length} document${processed.length > 1 ? "s" : ""} received and queued for review: ${vendorList}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return twiml(`Processing error: ${message}`);
  }
}
