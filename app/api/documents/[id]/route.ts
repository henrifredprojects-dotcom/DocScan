import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await getSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    // Fetch document to get file_url and verify RLS access (owner or member)
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("id, file_url, workspace_id")
      .eq("id", id)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    // Delete storage object first (best-effort — proceed even if it fails)
    const admin = getSupabaseAdminClient();
    await admin.storage.from("documents").remove([doc.file_url as string]).catch(() => null);

    // Delete the DB row — RLS ensures only authorized users can delete
    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
