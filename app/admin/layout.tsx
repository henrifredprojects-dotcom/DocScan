import { notFound, redirect } from "next/navigation";

import { isAdmin } from "@/lib/auth/invite";
import { getCurrentUser } from "@/lib/data/workspaces";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/invites");
  if (!isAdmin(user.email)) notFound();

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "32px 24px 80px" }}>
      {children}
    </main>
  );
}
