import { NextResponse } from "next/server";

import { requireServerEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Returns non-secret config values needed by the client — auth-gated.
export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const env = requireServerEnv();
  return NextResponse.json({ serviceAccountEmail: env.googleServiceAccountEmail });
}
