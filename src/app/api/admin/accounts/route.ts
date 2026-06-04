import { requireManagedAccess } from "@/lib/server/managedAuth";
import { listAccounts, updateAccountAccess, upsertAccount } from "@/lib/server/productionStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requireManagedAccess({ portalAccess: ["FULL_WORKSPACE"], roles: ["OWNER", "PLANNER", "PRODUCTION"] });
  if (!access.allowed) {
    return Response.json({ ok: false, error: access.reason || "Access denied." }, { status: access.reason === "LOGIN_REQUIRED" ? 401 : 403 });
  }
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId") || access.auth.session.workspaceId || "default-workspace";
  return Response.json({ ok: true, accounts: await listAccounts(workspaceId) });
}

export async function POST(request: Request) {
  const access = await requireManagedAccess({ portalAccess: ["FULL_WORKSPACE"], roles: ["OWNER", "PLANNER", "PRODUCTION"] });
  if (!access.allowed) {
    return Response.json({ ok: false, error: access.reason || "Access denied." }, { status: access.reason === "LOGIN_REQUIRED" ? 401 : 403 });
  }
  const payload = await request.json().catch(() => ({}));
  if (!payload.email || !payload.role || !payload.portalAccess) {
    return Response.json({ ok: false, error: "email, role, and portalAccess are required." }, { status: 400 });
  }
  const workspaceId = payload.workspaceId || access.auth.session.workspaceId || "default-workspace";
  const account = await upsertAccount({
    workspaceId,
    email: String(payload.email),
    name: String(payload.name || payload.email),
    role: payload.role,
    status: payload.status || "INVITED",
    portalAccess: payload.portalAccess
  });
  return Response.json({ ok: true, account });
}

export async function PATCH(request: Request) {
  const access = await requireManagedAccess({ portalAccess: ["FULL_WORKSPACE"], roles: ["OWNER", "PLANNER", "PRODUCTION"] });
  if (!access.allowed) {
    return Response.json({ ok: false, error: access.reason || "Access denied." }, { status: access.reason === "LOGIN_REQUIRED" ? 401 : 403 });
  }
  const payload = await request.json().catch(() => ({}));
  if (!payload.email) {
    return Response.json({ ok: false, error: "email is required." }, { status: 400 });
  }
  const workspaceId = payload.workspaceId || access.auth.session.workspaceId || "default-workspace";
  const account = await updateAccountAccess({
    workspaceId,
    email: String(payload.email),
    name: payload.name,
    role: payload.role,
    status: payload.status,
    portalAccess: payload.portalAccess,
    actorEmail: access.auth.session.email
  });
  if (!account) return Response.json({ ok: false, error: "Account not found." }, { status: 404 });
  return Response.json({ ok: true, account });
}
