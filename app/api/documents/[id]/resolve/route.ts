import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: documentId } = await params;
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: doc } = await supabase
      .from("documents")
      .select("validated_data, extracted_data")
      .eq("id", documentId)
      .single();

    if (!doc) return NextResponse.json({ error: "Document not found." }, { status: 404 });

    const currentResolved = !!(
      ((doc.validated_data ?? {}) as Record<string, unknown>)._reports_resolved
    );

    const updatedValidatedData = {
      ...(doc.extracted_data as Record<string, unknown> ?? {}),
      ...(doc.validated_data as Record<string, unknown> ?? {}),
      _reports_resolved: !currentResolved,
    };

    const { error } = await supabase
      .from("documents")
      .update({ validated_data: updatedValidatedData })
      .eq("id", documentId);

    if (error) throw error;
    return NextResponse.json({ ok: true, resolved: !currentResolved });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error" }, { status: 500 });
  }
}
