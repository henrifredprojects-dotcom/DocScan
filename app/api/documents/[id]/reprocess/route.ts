import { NextResponse } from "next/server";

import { getFewShotExamples } from "@/lib/data/documents";
import { extractDocumentData } from "@/lib/ocr/extract";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSignedDocumentUrl } from "@/lib/supabase/storage";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await getSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    // Fetch document and verify access
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("id, file_url, workspace_id, user_id")
      .eq("id", id)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    // Owner OR member who uploaded the doc can reprocess.
    // RLS on workspaces now allows members to read their workspace.
    const { data: ws } = await supabase
      .from("workspaces")
      .select("id")
      .eq("id", doc.workspace_id as string)
      .single();

    const isUploader = doc.user_id === user.id;
    if (!ws && !isUploader) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    // Re-run OCR with few-shot examples — sign the file URL (works for both legacy URLs and stored paths)
    const examples = await getFewShotExamples(doc.workspace_id as string).catch(() => []);
    const signedUrl = await getSignedDocumentUrl(doc.file_url as string, 3600);
    const extracted = await extractDocumentData(signedUrl, examples);

    // Reset to pending with fresh extraction — preserve validated_data so user corrections survive reprocess
    // Clear exported_at so the doc doesn't appear as exported while pending re-review
    const { error: updateError } = await supabase
      .from("documents")
      .update({
        extracted_data: extracted as unknown as Record<string, unknown>,
        status: "pending",
        exported_at: null,
      })
      .eq("id", id);

    if (updateError) throw updateError;

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
