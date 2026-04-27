import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: documentId } = await params;
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("document_comments")
      .select("*")
      .eq("document_id", documentId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ ok: true, comments: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: documentId } = await params;
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { body: commentBody } = (await request.json()) as { body: string };
    if (!commentBody?.trim()) return NextResponse.json({ error: "Comment body is required." }, { status: 400 });

    // Verify user has access to this document's workspace
    const { data: doc } = await supabase
      .from("documents")
      .select("workspace_id")
      .eq("id", documentId)
      .single();

    if (!doc) return NextResponse.json({ error: "Document not found." }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("document_comments")
      .insert({
        document_id: documentId,
        workspace_id: doc.workspace_id,
        user_id: user.id,
        user_email: user.email ?? null,
        body: commentBody.trim(),
      })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, comment: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error" }, { status: 500 });
  }
}
