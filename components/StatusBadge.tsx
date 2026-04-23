import clsx from "clsx";

import type { DocumentStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span className={clsx("chip", status)}>
      {status === "validated" ? "Validated" : status === "rejected" ? "Rejected" : "Pending"}
    </span>
  );
}
