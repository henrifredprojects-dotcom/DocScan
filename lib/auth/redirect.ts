const DEFAULT_NEXT = "/dashboard";

export function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_NEXT;
  if (!raw.startsWith("/")) return DEFAULT_NEXT;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return DEFAULT_NEXT;
  if (raw.startsWith("/login") || raw.startsWith("/auth/")) return DEFAULT_NEXT;
  return raw;
}

export const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  auth_callback_failed: "Sign-in failed. Please try again.",
  session_expired: "Your session expired. Please sign in again.",
  signed_out: "You have been signed out.",
  not_invited: "This email is not on the beta allowlist. Contact Henri to request access.",
};
