import { requireManagedAccess } from "@/lib/server/managedAuth";
import { listNotifications, queueNotification } from "@/lib/server/productionStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requireManagedAccess({ portalAccess: ["CLIENT_PORTAL", "VENDOR_PORTAL", "FULL_WORKSPACE"] });
  if (!access.allowed) {
    return Response.json({ ok: false, error: access.reason || "Access denied." }, { status: access.reason === "LOGIN_REQUIRED" ? 401 : 403 });
  }
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId") || access.auth.session.workspaceId || "default-workspace";
  const notifications = await listNotifications(workspaceId);
  const visible =
    access.auth.session.portalAccess === "FULL_WORKSPACE"
      ? notifications
      : notifications.filter((item: { recipientEmail?: string | null }) => !item.recipientEmail || item.recipientEmail.toLowerCase() === access.auth.session.email.toLowerCase());
  return Response.json({ ok: true, workspaceId, notifications: visible });
}

export async function POST(request: Request) {
  const access = await requireManagedAccess({ portalAccess: ["FULL_WORKSPACE"], roles: ["OWNER", "PLANNER", "PRODUCTION"] });
  if (!access.allowed) {
    return Response.json({ ok: false, error: access.reason || "Access denied." }, { status: access.reason === "LOGIN_REQUIRED" ? 401 : 403 });
  }
  const payload = await request.json().catch(() => ({}));
  if (!payload.subject || !payload.body) {
    return Response.json({ ok: false, error: "subject and body are required." }, { status: 400 });
  }
  const workspaceId = payload.workspaceId || access.auth.session.workspaceId || "default-workspace";
  const notification = await queueNotification({
    workspaceId,
    channel: payload.channel || "in_app",
    recipientEmail: payload.recipientEmail,
    subject: String(payload.subject),
    body: String(payload.body),
    metadata: {
      createdBy: access.auth.session.email,
      source: "admin"
    }
  });
  return Response.json({ ok: true, notification });
}
