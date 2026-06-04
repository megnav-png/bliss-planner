import { getManagedAuthStatus } from "@/lib/server/managedAuth";
import { listAccounts, upsertAccount, upsertWorkspace } from "@/lib/server/productionStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await getManagedAuthStatus();
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId") || auth.session.workspaceId || "default-workspace";
  return Response.json({
    ok: true,
    workspaceId,
    productionBacked: true,
    accounts: await listAccounts(workspaceId)
  });
}

export async function POST(request: Request) {
  const auth = await getManagedAuthStatus();
  if (auth.productionReady && auth.sessionSource !== "cookie") {
    return Response.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }
  const payload = await request.json().catch(() => ({}));
  const workspace = await upsertWorkspace({
    id: payload.id || auth.session.workspaceId || "default-workspace",
    name: payload.name || payload.businessName || "Bliss Planner Workspace",
    region: payload.region || "Global",
    dataResidency: payload.dataResidency || "configured-by-workspace",
    authProvider: payload.authProvider || "GOOGLE"
  });
  const account = await upsertAccount({
    workspaceId: workspace?.id || payload.id || auth.session.workspaceId || "default-workspace",
    email: auth.session.email,
    name: auth.session.userName,
    role: auth.session.role,
    status: "ACTIVE",
    portalAccess: auth.session.portalAccess,
    externalSub: auth.session.userId
  });
  return Response.json({ ok: true, workspace, account });
}
