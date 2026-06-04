import { requireManagedAccess } from "@/lib/server/managedAuth";
import { listConflicts, resolveConflict } from "@/lib/server/productionStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requireManagedAccess({ portalAccess: ["FULL_WORKSPACE"], roles: ["OWNER", "PLANNER", "PRODUCTION"] });
  if (!access.allowed) {
    return Response.json({ ok: false, error: access.reason || "Access denied." }, { status: access.reason === "LOGIN_REQUIRED" ? 401 : 403 });
  }
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId") || access.auth.session.workspaceId || "default-workspace";
  return Response.json({ ok: true, workspaceId, conflicts: await listConflicts(workspaceId) });
}

export async function POST(request: Request) {
  const access = await requireManagedAccess({ portalAccess: ["FULL_WORKSPACE"], roles: ["OWNER", "PLANNER", "PRODUCTION"] });
  if (!access.allowed) {
    return Response.json({ ok: false, error: access.reason || "Access denied." }, { status: access.reason === "LOGIN_REQUIRED" ? 401 : 403 });
  }
  const payload = await request.json().catch(() => ({}));
  if (!payload.conflictId || !payload.resolution) {
    return Response.json({ ok: false, error: "conflictId and resolution are required." }, { status: 400 });
  }
  const result = await resolveConflict(
    payload.workspaceId || access.auth.session.workspaceId || "default-workspace",
    String(payload.conflictId),
    String(payload.resolution),
    access.auth.session.email
  );
  if (!result) return Response.json({ ok: false, error: "Conflict not found." }, { status: 404 });
  return Response.json({ ok: true, conflict: result });
}
