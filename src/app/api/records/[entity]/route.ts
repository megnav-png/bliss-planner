import { getManagedAuthStatus } from "@/lib/server/managedAuth";
import { createRecord, listRecords } from "@/lib/server/productionStore";

export const runtime = "nodejs";

function canWrite(role: string) {
  return ["OWNER", "PLANNER", "PRODUCTION"].includes(role);
}

export async function GET(request: Request, context: { params: Promise<{ entity: string }> }) {
  const auth = await getManagedAuthStatus();
  const { entity } = await context.params;
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId") || auth.session.workspaceId || "default-workspace";
  try {
    const records = await listRecords(workspaceId, entity);
    return Response.json({ ok: true, entity, workspaceId, records });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Could not list records." }, { status: 400 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ entity: string }> }) {
  const auth = await getManagedAuthStatus();
  if (auth.productionReady && auth.sessionSource !== "cookie") {
    return Response.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }
  if (!canWrite(auth.session.role)) {
    return Response.json({ ok: false, error: "Planner access required." }, { status: 403 });
  }
  const { entity } = await context.params;
  const payload = await request.json().catch(() => ({}));
  const workspaceId = payload.workspaceId || auth.session.workspaceId || "default-workspace";
  try {
    const record = await createRecord(workspaceId, entity, payload.payload || payload, auth.session.email);
    return Response.json({ ok: true, record }, { status: 201 });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Could not create record." }, { status: 400 });
  }
}
