import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { requirePublicEnv } from "@/lib/env";

// Called when an authenticated user is not in the beta allowlist.
// Purges the session cookies and redirects to /login with the proper error code.
async function handle(request: NextRequest) {
  const { origin } = new URL(request.url);
  const env = requirePublicEnv();
  const response = NextResponse.redirect(`${origin}/login?error=not_invited`, { status: 303 });

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.signOut();
  return response;
}

export const GET = handle;
export const POST = handle;
