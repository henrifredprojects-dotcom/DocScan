import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { getFewShotExamples } from "@/lib/data/documents";
import { extractDocumentData } from "@/lib/ocr/extract";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { NormalizedExtraction } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const webhookSecret = process.env.INGEST_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ error: "Email ingestion not configured on this server." }, { status: 503 });
    }

    const body = await request.json() as {
      workspace_id?: string;
      secret?: string;
      filename?: string;
      content_type?: string;
      attachment_url?: string;
      attachment_base64?: string;
      sender_email?: string;
      subject?: string;
    };

    if (!body.secret || body.secret !== webhookSecret) {
      return NextResponse.json({ error: "Invalid secret." }, { status: 401 });
    }

    const workspaceId = body.workspace_id;
    if (!workspaceId) {
      return NextResponse.json({ error: "Missing workspace_id." }, { status: 400 });
    }

    if (!body.attachment_url && !body.attachment_base64) {
      return NextResponse.json({ error: "Missing attachment_url or attachment_base64." }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();

    const { data: ws } = await admin
      .from("workspaces")
      .select("id, owner_id")
      .eq("id", workspaceId)
      .single();

    if (!ws) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }

    // Resolve file bytes
    let bytes: Buffer;
    let contentType = body.content_type ?? "application/octet-stream";
    const filename = body.filename ?? "email-attachment";

    if (body.attachment_url) {
      const res = await fetch(body.attachment_url);
      if (!res.ok) throw new Error(`Failed to download attachment: ${res.status}`);
      bytes = Buffer.from(await res.arrayBuffer());
      if (!body.content_type) {
        contentType = res.headers.get("content-type") ?? "application/octet-stream";
      }
    } else {
      bytes = Buffer.from(body.attachment_base64!, "base64");
    }

    const sizeMb = bytes.byteLength / (1024 * 1024);
    if (sizeMb > 20) {
      return NextResponse.json({ error: `File too large (${sizeMb.toFixed(1)} MB). Max 20 MB.` }, { status: 400 });
    }

    // Upload to storage
    const documentId = randomUUID();
    const safeName = filename
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    const objectPath = `${workspaceId}/${documentId}/${safeName}`;

    const { error: uploadError } = await admin.storage
      .from("documents")
      .upload(objectPath, bytes, { contentType, upsert: false });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = admin.storage.from("documents").getPublicUrl(objectPath);

    // OCR extraction with workspace-specific few-shot examples
    const examples = await getFewShotExamples(workspaceId).catch(() => []);
    const extracted = await extractDocumentData(publicUrl, examples);

    // Apply vendor rules (same logic as upload flow)
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

    // Use sender domain as vendor fallback if OCR found nothing
    if (body.sender_email && !extracted.vendor) {
      const domain = body.sender_email.split("@")[1]?.split(".")[0];
      if (domain) (extracted as unknown as Record<string, unknown>).vendor = domain;
    }

    const { data: created, error: insertError } = await admin
      .from("documents")
      .insert({
        id: documentId,
        workspace_id: workspaceId,
        user_id: ws.owner_id,
        file_url: publicUrl,
        extracted_data: {
          ...extracted,
          ...(body.sender_email && { user_email: body.sender_email }),
        },
        status: "pending",
        source: "email",
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ ok: true, documentId: created.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
