import { NextResponse } from "next/server";
import { google } from "googleapis";

import { requireServerEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: workspaceId } = await params;
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id, sheets_id, sheets_tab")
      .eq("id", workspaceId)
      .eq("owner_id", user.id)
      .single();

    if (!workspace) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });

    const env = requireServerEnv();

    // Step 1: check credentials are present
    if (!env.googleServiceAccountEmail) return NextResponse.json({ error: "GOOGLE_SERVICE_ACCOUNT_EMAIL is not set in Vercel env vars." }, { status: 500 });
    if (!env.googleServiceAccountPrivateKey) return NextResponse.json({ error: "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is not set in Vercel env vars." }, { status: 500 });

    const privateKey = env.googleServiceAccountPrivateKey.replace(/\\n/g, "\n");

    // Step 2: test JWT authentication
    let auth: InstanceType<typeof google.auth.JWT>;
    try {
      auth = new google.auth.JWT({
        email: env.googleServiceAccountEmail,
        key: privateKey,
        scopes: [
          "https://www.googleapis.com/auth/spreadsheets",
          "https://www.googleapis.com/auth/drive.file",
        ],
      });
      await auth.authorize();
    } catch (authErr) {
      return NextResponse.json({
        error: `Google authentication failed: ${authErr instanceof Error ? authErr.message : String(authErr)}. Check that GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY are correct in Vercel.`,
      }, { status: 500 });
    }

    // Step 3: if a sheet is configured, try to read it
    if (workspace.sheets_id && workspace.sheets_tab) {
      const sheets = google.sheets({ version: "v4", auth });
      try {
        await sheets.spreadsheets.values.get({
          spreadsheetId: workspace.sheets_id as string,
          range: `${workspace.sheets_tab}!A1`,
        });
        return NextResponse.json({ ok: true, message: `Connection successful. Sheet "${workspace.sheets_tab}" is accessible.` });
      } catch (sheetErr) {
        const msg = sheetErr instanceof Error ? sheetErr.message : String(sheetErr);
        return NextResponse.json({
          error: `Credentials OK but sheet access failed: ${msg}. Make sure the sheet is shared with ${env.googleServiceAccountEmail} as Editor.`,
        }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, message: "Google credentials are valid. No sheet configured yet — use 'Create new Sheet'." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
