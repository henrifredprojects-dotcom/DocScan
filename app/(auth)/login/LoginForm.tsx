"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { GoogleIcon, ScanIcon } from "@/components/icons";
import { LOGIN_ERROR_MESSAGES, safeNextPath } from "@/lib/auth/redirect";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: "info" | "error"; text: string } | null>(null);
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const errorCode = searchParams.get("error");
  const errorMessage = errorCode ? LOGIN_ERROR_MESSAGES[errorCode] ?? "Sign-in failed. Please try again." : null;

  async function signInWithGoogle() {
    setLoading(true);
    setMessage(null);
    const supabase = getSupabaseBrowserClient();
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
    if (error) {
      setLoading(false);
      setMessage({ kind: "error", text: error.message });
    }
    // On success the browser navigates away — don't reset loading.
  }

  const visibleMessage = message ?? (errorMessage ? { kind: "error" as const, text: errorMessage } : null);

  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
      padding: "24px 16px",
    }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "linear-gradient(155deg, var(--blue-600), var(--blue-700))",
            display: "grid", placeItems: "center", color: "#fff",
            boxShadow: "0 8px 20px -8px oklch(0.52 0.21 258 / .55)",
          }}>
            <ScanIcon size={26} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink-900)" }}>
              DocScan
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ink-500)", marginTop: 2 }}>AI bookkeeping</div>
          </div>
        </div>

        <div style={{
          background: "var(--paper)",
          border: "1px solid var(--ink-200)",
          borderRadius: "var(--radius-lg)",
          padding: 28,
          boxShadow: "var(--shadow)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em", margin: "0 0 4px", color: "var(--ink-900)" }}>
              Sign in
            </h1>
            <p style={{ fontSize: 13, color: "var(--ink-500)", margin: 0, lineHeight: 1.5 }}>
              Use your Google account to continue.
            </p>
          </div>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", gap: 10, padding: "11px 16px" }}
          >
            <GoogleIcon /> {loading ? "Connecting…" : "Continue with Google"}
          </button>

          {visibleMessage && (
            <p role="alert" style={{
              margin: 0,
              fontSize: 12.5,
              color: visibleMessage.kind === "error" ? "var(--err)" : "oklch(0.4 0.14 160)",
              padding: "10px 12px",
              borderRadius: 9,
              background: visibleMessage.kind === "error" ? "oklch(0.97 0.03 25)" : "oklch(0.96 0.05 160)",
              border: `1px solid ${visibleMessage.kind === "error" ? "oklch(0.85 0.08 25)" : "oklch(0.85 0.06 160)"}`,
            }}>
              {visibleMessage.text}
            </p>
          )}
        </div>

        <p style={{ marginTop: 24, textAlign: "center", fontSize: 12, color: "var(--ink-500)" }}>
          By continuing you agree to use DocScan responsibly.
        </p>
      </div>
    </main>
  );
}
