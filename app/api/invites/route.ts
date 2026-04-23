import { NextResponse } from "next/server";

import { createInvite } from "@/lib/data/members";
import { sendInviteEmail } from "@/lib/email";
import { requirePublicEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const body = await request.json() as { workspace_id?: string; email?: string };
    const { workspace_id, email } = body;

    if (!workspace_id || !email) {
      return NextResponse.json({ error: "Missing workspace_id or email." }, { status: 400 });
    }

    // Verify ownership and fetch workspace name for the email
    const { data: ws } = await supabase
      .from("workspaces")
      .select("id, name")
      .eq("id", workspace_id)
      .eq("owner_id", user.id)
      .single();

    if (!ws) return NextResponse.json({ error: "Workspace not found." }, { status: 403 });

    const invite = await createInvite({ workspaceId: workspace_id, email, invitedBy: user.id });

    // Send invite email via Resend (non-blocking — invite is created regardless)
    const appUrl = requirePublicEnv().appUrl;
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@docscan.app";
    const inviteUrl = `${appUrl}/invite/${invite.token}`;

    const { sent, error: emailError } = await sendInviteEmail({
      to: email,
      inviteUrl,
      workspaceName: ws.name as string,
      fromEmail,
    });

    return NextResponse.json({ ok: true, invite, emailSent: sent, emailError: emailError ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
