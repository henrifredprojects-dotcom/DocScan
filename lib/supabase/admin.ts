import { createClient } from "@supabase/supabase-js";

import { requirePublicEnv, requireServerEnv } from "@/lib/env";
import type { Database } from "./database.types";

let _adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseAdminClient() {
  if (_adminClient) return _adminClient;

  const publicEnv = requirePublicEnv();
  const serverEnv = requireServerEnv();

  _adminClient = createClient<Database>(publicEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return _adminClient;
}
