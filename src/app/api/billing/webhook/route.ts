import { updateBillingStatus } from "@/lib/server/productionStore";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.BLISS_BILLING_WEBHOOK_SECRET || "";
  const supplied = request.headers.get("x-bliss-billing-secret") || "";
  if (secret && supplied !== secret) {
    return Response.json({ ok: false, error: "Invalid billing webhook secret." }, { status: 401 });
  }
  const payload = await request.json().catch(() => ({}));
  const workspaceId = String(payload.workspaceId || "default-workspace");
  const billing = await updateBillingStatus(workspaceId, {
    provider: payload.provider || "stripe",
    customerId: payload.customerId,
    subscriptionId: payload.subscriptionId,
    plan: payload.plan || "professional",
    status: payload.status || "active",
    currentPeriodEnd: payload.currentPeriodEnd
  });
  return Response.json({ ok: true, billing });
}
