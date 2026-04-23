import { NextResponse } from "next/server";

import { createVendorRule } from "@/lib/data/vendor_rules";
import { hasWorkspaceAccess } from "@/lib/data/workspaces";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as {
      workspace_id: string;
      vendor_match: string;
      category_id: string;
    };

    if (!body.workspace_id || !body.vendor_match?.trim() || !body.category_id) {
      return NextResponse.json({ error: "workspace_id, vendor_match and category_id are required" }, { status: 400 });
    }

    const allowed = await hasWorkspaceAccess(supabase, body.workspace_id, user.id);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Verify category belongs to this workspace
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("id", body.category_id)
      .eq("workspace_id", body.workspace_id)
      .single();

    if (!category) {
      return NextResponse.json({ error: "Category not found in this workspace" }, { status: 400 });
    }

    const rule = await createVendorRule({
      workspaceId: body.workspace_id,
      vendorMatch: body.vendor_match,
      categoryId: body.category_id,
    });

    return NextResponse.json({ ok: true, rule });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
