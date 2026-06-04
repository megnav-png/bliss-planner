import Link from "next/link";
import { ReactNode } from "react";
import { requireManagedAccess } from "@/lib/server/managedAuth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const access = await requireManagedAccess({
    portalAccess: ["FULL_WORKSPACE"],
    roles: ["OWNER", "PLANNER", "PRODUCTION"]
  });

  if (!access.allowed) {
    return (
      <main className="dashboard-shell admin-shell">
        <section className="panel card">
          <p className="eyebrow">Bliss Planner Admin</p>
          <h1>{access.reason === "LOGIN_REQUIRED" ? "Sign in required" : "Admin access required"}</h1>
          <p className="note">Admin monitoring is available to authenticated workspace owners, planners, and production leads.</p>
          <div className="row-actions">
            <Link href={access.auth.loginUrl} className="btn btn-brand" prefetch={false}>Sign in</Link>
            <Link href="/" className="btn btn-soft">Planner dashboard</Link>
          </div>
        </section>
      </main>
    );
  }

  return children;
}
