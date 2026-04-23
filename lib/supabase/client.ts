"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requirePublicEnv } from "@/lib/env";
import type { Database } from "./database.types";

let cachedClient: SupabaseClient<Database> | null = null;

export function getSupabaseBrowserClient() {
  if (cachedClient) return cachedClient;
  const env = requirePublicEnv();
  cachedClient = createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
  return cachedClient;
}
