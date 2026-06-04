import { requireManagedAccess } from "@/lib/server/managedAuth";
import { revokeFileObject } from "@/lib/server/productionStore";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const access = await requireManagedAccess({ portalAccess: ["FULL_WORKSPACE"], roles: ["OWNER", "PLANNER", "PRODUCTION"] });
  if (!access.allowed) {
    return Response.json({ ok: false, error: access.reason || "Access denied." }, { status: access.reason === "LOGIN_REQUIRED" ? 401 : 403 });
  }
  const payload = await request.json().catch(() => ({}));
  if (!payload.fileId) {
    return Response.json({ ok: false, error: "fileId is required." }, { status: 400 });
  }
  const workspaceId = payload.workspaceId || access.auth.session.workspaceId || "default-workspace";
  const revoked = await revokeFileObject(workspaceId, String(payload.fileId), access.auth.session.email);
  if (!revoked) return Response.json({ ok: false, error: "File not found or already revoked." }, { status: 404 });
  return Response.json({ ok: true, revoked: true });
}
