import { requireManagedAccess } from "@/lib/server/managedAuth";
import { billingStatus } from "@/lib/server/productionStore";

export const runtime = "nodejs";

export async function GET() {
  const access = await requireManagedAccess({ portalAccess: ["FULL_WORKSPACE"], roles: ["OWNER", "PLANNER", "PRODUCTION"] });
  if (!access.allowed) {
    return Response.json({ ok: false, error: access.reason || "Access denied." }, { status: access.reason === "LOGIN_REQUIRED" ? 401 : 403 });
  }
  const workspaceId = access.auth.session.workspaceId || "default-workspace";
  return Response.json({
    ok: true,
    billing: await billingStatus(workspaceId),
    providerConfigured: Boolean(process.env.STRIPE_SECRET_KEY || process.env.BLISS_BILLING_CHECKOUT_URL)
  });
}
