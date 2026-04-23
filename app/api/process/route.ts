import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { getFewShotExamples } from "@/lib/data/documents";
import { extractDocumentData } from "@/lib/ocr/extract";
import { preprocessUpload } from "@/lib/ocr/preprocess";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSignedDocumentUrl } from "@/lib/supabase/storage";
import type { NormalizedExtraction } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const workspaceId = String(formData.get("workspace_id") ?? "");
    const file = formData.get("file");
    const rawSource = String(formData.get("source") ?? "upload");
    const source = rawSource === "photo" ? "photo" : "upload";

    if (!workspaceId || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing workspace_id or file." }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // RLS allows both owners and members to read workspaces they have access to.
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("id")
      .eq("id", workspaceId)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: "Workspace not accessible." }, { status: 403 });
    }

    const prepared = await preprocessUpload(file);
    const documentId = randomUUID();
    const objectPath = `${workspaceId}/${documentId}/${prepared.originalName}`;

    const admin = getSupabaseAdminClient();
    const uploadResult = await admin.storage
      .from("documents")
      .upload(objectPath, prepared.bytes, {
        contentType: prepared.contentType,
        upsert: false,
      });

    if (uploadResult.error) {
      throw uploadResult.error;
    }

    // Generate a short-lived signed URL for OCR (1 hour is enough — OCR runs immediately)
    const signedUrl = await getSignedDocumentUrl(objectPath, 3600);

    const examples = await getFewShotExamples(workspaceId).catch(() => []);
    const extracted = await extractDocumentData(signedUrl, examples);

    // Apply vendor rules: if a rule matches the extracted vendor, override the suggested category
    type VRRow = { vendor_match: string; categories: { name: string } | null };
    const { data: vendorRules } = await supabase
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

    const { data: created, error: insertError } = await supabase
      .from("documents")
      .insert({
        id: documentId,
        workspace_id: workspaceId,
        user_id: user.id,
        file_url: objectPath,
        extracted_data: extracted as unknown as Record<string, unknown>,
        status: "pending",
        source,
      })
      .select("id")
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ ok: true, documentId: created.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
