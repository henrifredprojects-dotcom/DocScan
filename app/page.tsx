import Link from "next/link";

function ScanIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
      <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
      <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
      <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
      <rect x="7" y="7" width="10" height="10" rx="1"/>
    </svg>
  );
}

export default function Home() {
  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
      padding: "24px 16px",
      textAlign: "center",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: "linear-gradient(155deg, var(--blue-600), var(--blue-700))",
        display: "grid", placeItems: "center", color: "#fff",
        boxShadow: "0 8px 20px -8px oklch(0.52 0.21 258 / .6)",
        marginBottom: 24,
      }}>
        <ScanIcon />
      </div>

      <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 12px", color: "var(--ink-900)" }}>
        DocScan
      </h1>
      <p style={{ fontSize: 15, color: "var(--ink-500)", margin: "0 0 32px", maxWidth: 400, lineHeight: 1.6 }}>
        Multi-workspace document processing with AI extraction and Google Sheets export.
      </p>

      <div style={{ display: "flex", gap: 10 }}>
        <Link href="/dashboard" className="btn btn-primary" style={{ fontSize: 14, padding: "10px 20px" }}>
          Open dashboard
        </Link>
        <Link href="/login" className="btn btn-secondary" style={{ fontSize: 14, padding: "10px 20px" }}>
          Login
        </Link>
      </div>

      <div style={{
        marginTop: 48,
        display: "flex",
        gap: 24,
        flexWrap: "wrap",
        justifyContent: "center",
      }}>
        {[
          { label: "AI extraction", desc: "OpenAI Vision reads every field" },
          { label: "Manual review", desc: "Human validation before export" },
          { label: "Sheets export", desc: "Per-workspace Google Sheets sync" },
        ].map((f) => (
          <div key={f.label} style={{
            padding: "14px 18px",
            background: "var(--paper)",
            border: "1px solid var(--ink-200)",
            borderRadius: "var(--radius-lg)",
            minWidth: 160,
            boxShadow: "var(--shadow-sm)",
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-900)", marginBottom: 4 }}>{f.label}</div>
            <div style={{ fontSize: 12, color: "var(--ink-500)" }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
