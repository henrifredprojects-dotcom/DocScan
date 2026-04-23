import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

import { requirePublicEnv } from "@/lib/env";
import type { Database } from "./database.types";

// React cache() deduplicates within a single request — if layout and page both call this,
// only one client is created and one cookie read happens per render cycle.
export const getSupabaseServerClient = cache(async () => {
  const env = requirePublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      },
    },
  });
});
