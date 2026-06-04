import { requireManagedAccess } from "@/lib/server/managedAuth";
import { recordAudit } from "@/lib/server/productionStore";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const access = await requireManagedAccess({ portalAccess: ["FULL_WORKSPACE"], roles: ["OWNER"] });
  if (!access.allowed) {
    return Response.json({ ok: false, error: access.reason || "Owner access required." }, { status: access.reason === "LOGIN_REQUIRED" ? 401 : 403 });
  }
  const payload = await request.json().catch(() => ({}));
  const checkoutUrl = process.env.BLISS_BILLING_CHECKOUT_URL || "";
  await recordAudit(access.auth.session.workspaceId || "default-workspace", access.auth.session.email, "BILLING_CHECKOUT_REQUESTED", "billing", access.auth.session.workspaceId, {
    plan: payload.plan || "professional"
  });
  if (!checkoutUrl && !process.env.STRIPE_SECRET_KEY) {
    return Response.json({
      ok: false,
      error: "Billing provider is not configured.",
      requiredEnv: ["BLISS_BILLING_CHECKOUT_URL or STRIPE_SECRET_KEY"]
    }, { status: 501 });
  }
  if (checkoutUrl) {
    return Response.json({ ok: true, checkoutUrl });
  }
  return Response.json({
    ok: false,
    error: "Stripe checkout integration is ready for provider wiring, but no Stripe SDK/session creation is enabled in this build."
  }, { status: 501 });
}
