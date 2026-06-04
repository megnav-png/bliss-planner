import { requireManagedAccess } from "@/lib/server/managedAuth";
import { listRealtimeEvents, publishRealtimeEvent } from "@/lib/server/productionStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requireManagedAccess({ portalAccess: ["CLIENT_PORTAL", "VENDOR_PORTAL", "FULL_WORKSPACE"] });
  if (!access.allowed) {
    return Response.json({ ok: false, error: access.reason || "Access denied." }, { status: access.reason === "LOGIN_REQUIRED" ? 401 : 403 });
  }
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId") || access.auth.session.workspaceId || "default-workspace";
  return Response.json({
    ok: true,
    workspaceId,
    events: await listRealtimeEvents(workspaceId, url.searchParams.get("since") || undefined),
    mode: "polling-event-log"
  });
}

export async function POST(request: Request) {
  const access = await requireManagedAccess({ portalAccess: ["FULL_WORKSPACE"], roles: ["OWNER", "PLANNER", "PRODUCTION"] });
  if (!access.allowed) {
    return Response.json({ ok: false, error: access.reason || "Access denied." }, { status: access.reason === "LOGIN_REQUIRED" ? 401 : 403 });
  }
  const payload = await request.json().catch(() => ({}));
  if (!payload.eventType) {
    return Response.json({ ok: false, error: "eventType is required." }, { status: 400 });
  }
  const workspaceId = payload.workspaceId || access.auth.session.workspaceId || "default-workspace";
  const event = await publishRealtimeEvent(
    workspaceId,
    String(payload.eventType),
    payload.entity,
    payload.entityId,
    access.auth.session.email,
    payload.payload || {}
  );
  return Response.json({ ok: true, event });
}
