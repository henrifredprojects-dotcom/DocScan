// Env vars are immutable at runtime — parse once and cache.

type PublicEnv = { supabaseUrl: string; supabaseAnonKey: string; appUrl: string };
type ServerEnv = {
  supabaseServiceRoleKey: string;
  openAiApiKey: string;
  googleServiceAccountEmail: string;
  googleServiceAccountPrivateKey: string;
};

let _publicEnv: PublicEnv | null = null;
let _serverEnv: ServerEnv | null = null;

export function requirePublicEnv(): PublicEnv {
  if (_publicEnv) return _publicEnv;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? null;

  const missing = [
    !supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
    !supabaseAnonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    !appUrl && "NEXT_PUBLIC_APP_URL",
  ].filter(Boolean) as string[];

  if (missing.length > 0) throw new Error(`Missing public env vars: ${missing.join(", ")}`);

  _publicEnv = {
    supabaseUrl: supabaseUrl as string,
    supabaseAnonKey: supabaseAnonKey as string,
    appUrl: appUrl as string,
  };
  return _publicEnv;
}

export function requireServerEnv(): ServerEnv {
  if (_serverEnv) return _serverEnv;

  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;
  const openAiApiKey = process.env.OPENAI_API_KEY ?? null;
  const googleServiceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? null;
  const googleServiceAccountPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? null;

  const missing = [
    !supabaseServiceRoleKey && "SUPABASE_SERVICE_ROLE_KEY",
    !openAiApiKey && "OPENAI_API_KEY",
    !googleServiceAccountEmail && "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    !googleServiceAccountPrivateKey && "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
  ].filter(Boolean) as string[];

  if (missing.length > 0) throw new Error(`Missing server env vars: ${missing.join(", ")}`);

  _serverEnv = {
    supabaseServiceRoleKey: supabaseServiceRoleKey as string,
    openAiApiKey: openAiApiKey as string,
    googleServiceAccountEmail: googleServiceAccountEmail as string,
    googleServiceAccountPrivateKey: googleServiceAccountPrivateKey as string,
  };
  return _serverEnv;
}
