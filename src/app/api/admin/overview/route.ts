import { requireManagedAccess } from "@/lib/server/managedAuth";
import { billingStatus, listAccounts, listAuditLog, listConflicts, listDevices, listFileObjects, listNotifications, productionStoreHealth } from "@/lib/server/productionStore";
import { monitoringHealth } from "@/lib/server/monitoring";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requireManagedAccess({ portalAccess: ["FULL_WORKSPACE"], roles: ["OWNER", "PLANNER", "PRODUCTION"] });
  if (!access.allowed) {
    return Response.json({ ok: false, error: access.reason || "Access denied." }, { status: access.reason === "LOGIN_REQUIRED" ? 401 : 403 });
  }
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId") || access.auth.session.workspaceId || "default-workspace";
  const [accounts, devices, conflicts, auditLog, files, notifications, billing] = await Promise.all([
    listAccounts(workspaceId),
    listDevices(workspaceId),
    listConflicts(workspaceId),
    listAuditLog(workspaceId, 50),
    listFileObjects(workspaceId),
    listNotifications(workspaceId),
    billingStatus(workspaceId)
  ]);
  return Response.json({
    ok: true,
    workspaceId,
    productionStore: productionStoreHealth(),
    monitoring: monitoringHealth(),
    accounts,
    devices,
    conflicts,
    auditLog,
    files,
    notifications,
    billing
  });
}
