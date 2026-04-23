import type { Workspace } from "@/lib/types";

export function WorkspaceBadge({ workspace }: { workspace: Workspace | null }) {
  if (!workspace) {
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 9px",
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 600,
        background: "var(--ink-100)",
        color: "var(--ink-500)",
        border: "1px dashed var(--ink-300)",
      }}>
        No workspace
      </span>
    );
  }

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      padding: "3px 9px 3px 7px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600,
      background: "var(--blue-100)",
      color: "var(--blue-ink)",
      border: "1px solid var(--blue-200)",
    }}>
      {workspace.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={workspace.logo_url} alt="" style={{ width: 16, height: 16, borderRadius: 4, objectFit: "cover", flexShrink: 0 }} />
      ) : (
        <span style={{
          width: 16,
          height: 16,
          borderRadius: 5,
          background: workspace.color ?? "var(--blue-600)",
          display: "grid",
          placeItems: "center",
          fontSize: 8,
          fontWeight: 700,
          color: "#fff",
          flexShrink: 0,
        }}>
          {workspace.name.slice(0, 2).toUpperCase()}
        </span>
      )}
      {workspace.name}
    </span>
  );
}
