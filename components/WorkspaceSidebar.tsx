"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";

import { useWorkspace } from "@/hooks/useWorkspace";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Workspace } from "@/lib/types";

function ScanIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
      <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
      <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
      <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
      <rect x="7" y="7" width="10" height="10" rx="1"/>
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}

function DocsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16"/>
      <line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  );
}

function SheetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="3" y1="15" x2="21" y2="15"/>
      <line x1="9" y1="3" x2="9" y2="21"/>
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

function ChevronIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

export function WorkspaceSidebar({
  workspaces,
  initialActiveWorkspaceId,
  userEmail,
}: {
  workspaces: Workspace[];
  initialActiveWorkspaceId: string | null;
  userEmail: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeWorkspaceId, switchWorkspace } = useWorkspace({
    workspaces,
    initialActiveWorkspaceId,
  });

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);
  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "?";

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function handleSwitchWorkspace(id: string) {
    switchWorkspace(id);
    router.push("/dashboard");
  }

  const mainNav = [
    { href: "/dashboard",     label: "Dashboard",  icon: <HomeIcon />,      match: (p: string) => p === "/dashboard" },
    { href: "/documents",     label: "Documents",  icon: <DocsIcon />,      match: (p: string) => p.startsWith("/documents") && p !== "/documents/new" },
    { href: "/documents/new", label: "Capture",    icon: <UploadIcon />,    match: (p: string) => p === "/documents/new" },
    { href: "/analytics",     label: "Analytics",  icon: <BarChartIcon />,  match: (p: string) => p === "/analytics" },
    { href: "/reports",       label: "Reports",    icon: <FileTextIcon />,  match: (p: string) => p === "/reports" },
  ];

  const settingsNav = [
    { href: "/settings/general",    label: "General",        icon: <SettingsIcon />, match: (p: string) => p === "/settings/general" },
    { href: "/settings/categories", label: "Categories",    icon: <TagIcon />,   match: (p: string) => p === "/settings/categories" },
    { href: "/settings/rules",      label: "Vendor rules",  icon: <ZapIcon />,   match: (p: string) => p === "/settings/rules" },
    { href: "/settings/sheets",     label: "Google Sheets", icon: <SheetIcon />, match: (p: string) => p === "/settings/sheets" },
    { href: "/settings/members",    label: "Members",        icon: <UsersIcon />,     match: (p: string) => p === "/settings/members" },
    { href: "/settings/email",      label: "Email ingest",   icon: <MailIcon />,      match: (p: string) => p === "/settings/email" },
    { href: "/settings/whatsapp",   label: "WhatsApp",       icon: <WhatsAppIcon />,  match: (p: string) => p === "/settings/whatsapp" },
  ];

  return (
    <aside style={{
      width: 264,
      flexShrink: 0,
      background: "var(--paper)",
      borderRight: "1px solid var(--ink-200)",
      display: "flex",
      flexDirection: "column",
      position: "sticky",
      top: 0,
      height: "100vh",
    }}>
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 18px 14px" }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          background: "linear-gradient(155deg, var(--blue-600), var(--blue-700))",
          display: "grid",
          placeItems: "center",
          color: "#fff",
          boxShadow: "inset 0 -2px 0 rgba(0,0,0,.12), 0 6px 14px -6px oklch(0.52 0.21 258 / .5)",
        }}>
          <ScanIcon />
        </div>
        <div>
          <div style={{ fontWeight: 700, letterSpacing: "-0.02em", fontSize: 16, color: "var(--ink-900)" }}>
            DocScan<sup style={{ color: "var(--blue-600)", fontSize: 9, fontWeight: 600, marginLeft: 2, verticalAlign: "top", position: "relative", top: 1 }}>v0</sup>
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-500)" }}>AI bookkeeping</div>
        </div>
      </div>

      {/* Workspace switcher */}
      <div style={{ padding: "0 12px" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 10px 6px",
          fontSize: 10.5,
          letterSpacing: ".12em",
          textTransform: "uppercase",
          color: "var(--ink-500)",
          fontWeight: 600,
        }}>
          <span>Workspaces</span>
          <ChevronIcon size={10} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              type="button"
              onClick={() => handleSwitchWorkspace(ws.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 9,
                cursor: "pointer",
                border: `1px solid ${activeWorkspaceId === ws.id ? "var(--blue-200)" : "transparent"}`,
                background: activeWorkspaceId === ws.id ? "var(--blue-100)" : "transparent",
                width: "100%",
                textAlign: "left",
                color: activeWorkspaceId === ws.id ? "var(--blue-ink)" : "var(--ink-800)",
                fontSize: 13.5,
                fontWeight: 500,
                transition: "background .15s ease, border-color .15s ease",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => {
                if (activeWorkspaceId !== ws.id) {
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--ink-100)";
                }
              }}
              onMouseLeave={(e) => {
                if (activeWorkspaceId !== ws.id) {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }
              }}
            >
              {ws.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ws.logo_url} alt="" style={{ width: 22, height: 22, borderRadius: 7, objectFit: "cover", flexShrink: 0, boxShadow: "inset 0 -1px 0 rgba(0,0,0,.15)" }} />
              ) : (
                <span style={{
                  width: 22,
                  height: 22,
                  borderRadius: 7,
                  flexShrink: 0,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#fff",
                  letterSpacing: ".02em",
                  boxShadow: "inset 0 -1px 0 rgba(0,0,0,.15)",
                  background: ws.color ?? "var(--blue-600)",
                }}>
                  {ws.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ws.name}</span>
                <span style={{ fontSize: 11, color: activeWorkspaceId === ws.id ? "var(--blue-600)" : "var(--ink-500)", fontWeight: 400 }}>
                  {ws.currency ?? "EUR"}
                </span>
              </div>
            </button>
          ))}

          <button
            type="button"
            onClick={() => router.push("/workspaces/new")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "8px 10px",
              marginTop: 4,
              border: "1px dashed var(--ink-300)",
              borderRadius: 9,
              background: "transparent",
              color: "var(--ink-600)",
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all .15s ease",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--blue-400)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--blue-600)";
              (e.currentTarget as HTMLButtonElement).style.background = "var(--blue-100)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ink-300)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-600)";
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <PlusIcon />
            <span>New workspace</span>
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "10px 12px", marginTop: 6, flex: 1, overflowY: "auto" }}>
        <div style={{ padding: "10px 10px 6px", fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ink-500)", fontWeight: 600 }}>
          Navigation
        </div>
        {mainNav.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex", alignItems: "center", gap: 11, padding: "8px 10px",
                borderRadius: 9, fontSize: 13.5, fontWeight: 500, cursor: "pointer",
                textDecoration: "none", marginBottom: 2,
                color: active ? "#fff" : "var(--ink-800)",
                background: active ? "var(--blue-600)" : "transparent",
                boxShadow: active ? "0 4px 10px -4px oklch(0.52 0.21 258 / .45)" : "none",
                transition: "background .15s ease, color .15s ease",
              }}
              className={clsx(!active && "hover:bg-[var(--ink-100)] hover:text-[var(--ink-900)]")}
            >
              <span style={{ color: active ? "#fff" : "var(--ink-500)", flexShrink: 0 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div style={{ padding: "14px 10px 6px", fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ink-500)", fontWeight: 600, marginTop: 6 }}>
          Settings
        </div>
        {settingsNav.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex", alignItems: "center", gap: 11, padding: "8px 10px",
                borderRadius: 9, fontSize: 13.5, fontWeight: 500, cursor: "pointer",
                textDecoration: "none", marginBottom: 2,
                color: active ? "#fff" : "var(--ink-800)",
                background: active ? "var(--blue-600)" : "transparent",
                boxShadow: active ? "0 4px 10px -4px oklch(0.52 0.21 258 / .45)" : "none",
                transition: "background .15s ease, color .15s ease",
              }}
              className={clsx(!active && "hover:bg-[var(--ink-100)] hover:text-[var(--ink-900)]")}
            >
              <span style={{ color: active ? "#fff" : "var(--ink-500)", flexShrink: 0 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{
        marginTop: "auto",
        padding: 14,
        borderTop: "1px solid var(--ink-200)",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <div style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: "linear-gradient(135deg, var(--blue-500), var(--blue-700))",
          color: "#fff",
          display: "grid",
          placeItems: "center",
          fontSize: 12,
          fontWeight: 600,
          flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-900)", lineHeight: 1.1 }}>
            {activeWs?.name ?? "No workspace"}
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-500)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {userEmail}
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          title="Sign out"
          style={{
            flexShrink: 0, background: "none", border: "none", cursor: "pointer",
            padding: 6, borderRadius: 7, color: "var(--ink-400)",
            display: "grid", placeItems: "center",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--err)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--ink-100)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-400)"; (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </aside>
  );
}
