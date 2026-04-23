import Link from "next/link";
import { redirect } from "next/navigation";

import { acceptInvite, getInviteByToken } from "@/lib/data/members";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Workspace } from "@/lib/types";

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

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ accepted?: string }>;
}) {
  const { token } = await params;
  const { accepted } = await searchParams;

  // Get current user
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Look up invite
  const invite = await getInviteByToken(token);

  const brandHeader = (
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
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink-900)" }}>DocScan</div>
        <div style={{ fontSize: 12, color: "var(--ink-500)" }}>AI bookkeeping</div>
      </div>
    </div>
  );

  const card = (children: React.ReactNode) => (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
      padding: "24px 16px",
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {brandHeader}
        <div style={{
          background: "var(--paper)",
          border: "1px solid var(--ink-200)",
          borderRadius: "var(--radius-lg)",
          padding: 24,
          boxShadow: "var(--shadow)",
        }}>
          {children}
        </div>
      </div>
    </main>
  );

  if (!invite) {
    return card(
      <>
        <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "var(--ink-900)" }}>Invite not found</h2>
        <p style={{ margin: "0 0 20px", fontSize: 13.5, color: "var(--ink-500)", lineHeight: 1.5 }}>
          This invite link has expired, been revoked, or already been used.
        </p>
        <Link href="/login" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
          Go to login
        </Link>
      </>,
    );
  }

  // Use admin client — unauthenticated users are blocked by RLS on workspaces
  const admin = getSupabaseAdminClient();
  const { data: wsData } = await admin.from("workspaces").select("name").eq("id", invite.workspace_id).single();
  const workspace = wsData as Pick<Workspace, "name"> | null;

  // Handle POST-redirect after accept
  if (accepted === "1") {
    redirect("/dashboard");
  }

  // Not logged in → prompt to sign in
  if (!user) {
    return card(
      <>
        <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "var(--ink-900)" }}>
          You have been invited
        </h2>
        <p style={{ margin: "0 0 6px", fontSize: 13.5, color: "var(--ink-500)", lineHeight: 1.5 }}>
          Join workspace <strong style={{ color: "var(--ink-900)" }}>{workspace?.name ?? "—"}</strong> on DocScan.
        </p>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--ink-500)" }}>
          Sign in first, then come back to this link to accept.
        </p>
        <Link
          href={`/login?next=/invite/${token}`}
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center" }}
        >
          Sign in to accept
        </Link>
      </>,
    );
  }

  // Logged in → accept server action
  async function handleAccept() {
    "use server";
    await acceptInvite(token, user!.id);
    redirect("/dashboard");
  }

  return card(
    <>
      <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "var(--ink-900)" }}>
        Workspace invitation
      </h2>
      <p style={{ margin: "0 0 20px", fontSize: 13.5, color: "var(--ink-600)", lineHeight: 1.55 }}>
        You have been invited to join{" "}
        <strong style={{ color: "var(--ink-900)" }}>{workspace?.name ?? "a workspace"}</strong>{" "}
        as a <strong>member</strong>.
      </p>
      <form action={handleAccept}>
        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center" }}
        >
          Accept invitation
        </button>
      </form>
      <p style={{ marginTop: 12, textAlign: "center", fontSize: 12, color: "var(--ink-400)" }}>
        Signed in as {user.email}
      </p>
    </>,
  );
}
