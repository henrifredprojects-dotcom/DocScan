"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function ScanIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
      <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
      <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
      <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
      <rect x="7" y="7" width="10" height="10" rx="1"/>
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  async function signInWithGoogle() {
    setLoading(true);
    setMessage("");
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${next}` },
    });
    setLoading(false);
    if (error) setMessage(`Google login failed: ${error.message}`);
  }

  async function sendMagicLink() {
    if (!email) { setMessage("Enter your email first."); return; }
    setLoading(true);
    setMessage("");
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}${next}` },
    });
    setLoading(false);
    if (error) { setMessage(`Email login failed: ${error.message}`); return; }
    setMessage("Magic link sent. Check your email.");
  }

  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
      padding: "24px 16px",
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(155deg, var(--blue-600), var(--blue-700))",
            display: "grid", placeItems: "center", color: "#fff",
            boxShadow: "0 6px 14px -6px oklch(0.52 0.21 258 / .5)",
          }}>
            <ScanIcon />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink-900)" }}>
              DocScan
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-500)" }}>AI bookkeeping</div>
          </div>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 6px", color: "var(--ink-900)" }}>
          Welcome back
        </h1>
        <p style={{ fontSize: 13.5, color: "var(--ink-500)", margin: "0 0 24px", lineHeight: 1.5 }}>
          Sign in with Google or receive a magic link by email.
        </p>

        {/* Form card */}
        <div style={{
          background: "var(--paper)",
          border: "1px solid var(--ink-200)",
          borderRadius: "var(--radius-lg)",
          padding: 20,
          boxShadow: "var(--shadow)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}>
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={loading}
            className="btn btn-secondary"
            style={{ width: "100%", justifyContent: "center", gap: 8 }}
          >
            <GoogleIcon /> Continue with Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: "var(--ink-200)" }} />
            <span style={{ fontSize: 11.5, color: "var(--ink-500)", fontWeight: 500 }}>or email</span>
            <div style={{ flex: 1, height: 1, background: "var(--ink-200)" }} />
          </div>

          <div className="field">
            <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-600)" }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMagicLink()}
              className="ds-input"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="button"
            onClick={sendMagicLink}
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
          >
            Send magic link
          </button>
        </div>

        {message && (
          <p style={{
            marginTop: 12,
            fontSize: 13,
            color: message.includes("sent") ? "oklch(0.4 0.14 160)" : "var(--err)",
            padding: "10px 14px",
            borderRadius: 9,
            background: message.includes("sent") ? "oklch(0.96 0.05 160)" : "oklch(0.97 0.03 25)",
            border: `1px solid ${message.includes("sent") ? "oklch(0.85 0.06 160)" : "oklch(0.85 0.08 25)"}`,
          }}>
            {message}
          </p>
        )}

        <p style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: "var(--ink-500)" }}>
          <Link href="/" style={{ color: "var(--blue-600)", fontWeight: 500, textDecoration: "none" }}>
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
