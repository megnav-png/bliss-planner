import { getManagedAuthStatus } from "@/lib/server/managedAuth";
import { deleteRecord, getRecord, updateRecord } from "@/lib/server/productionStore";

export const runtime = "nodejs";

function canWrite(role: string) {
  return ["OWNER", "PLANNER", "PRODUCTION"].includes(role);
}

export async function GET(request: Request, context: { params: Promise<{ entity: string; id: string }> }) {
  const auth = await getManagedAuthStatus();
  const { entity, id } = await context.params;
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId") || auth.session.workspaceId || "default-workspace";
  try {
    const record = await getRecord(workspaceId, entity, id);
    if (!record) return Response.json({ ok: false, error: "Record not found." }, { status: 404 });
    return Response.json({ ok: true, record });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Could not load record." }, { status: 400 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ entity: string; id: string }> }) {
  const auth = await getManagedAuthStatus();
  if (auth.productionReady && auth.sessionSource !== "cookie") {
    return Response.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }
  if (!canWrite(auth.session.role)) {
    return Response.json({ ok: false, error: "Planner access required." }, { status: 403 });
  }
  const { entity, id } = await context.params;
  const payload = await request.json().catch(() => ({}));
  const workspaceId = payload.workspaceId || auth.session.workspaceId || "default-workspace";
  try {
    const record = await updateRecord(workspaceId, entity, id, payload.payload || payload, auth.session.email);
    if (!record) return Response.json({ ok: false, error: "Record not found." }, { status: 404 });
    return Response.json({ ok: true, record });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Could not update record." }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ entity: string; id: string }> }) {
  const auth = await getManagedAuthStatus();
  if (auth.productionReady && auth.sessionSource !== "cookie") {
    return Response.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }
  if (!canWrite(auth.session.role)) {
    return Response.json({ ok: false, error: "Planner access required." }, { status: 403 });
  }
  const { entity, id } = await context.params;
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId") || auth.session.workspaceId || "default-workspace";
  try {
    const deleted = await deleteRecord(workspaceId, entity, id, auth.session.email);
    if (!deleted) return Response.json({ ok: false, error: "Record not found." }, { status: 404 });
    return Response.json({ ok: true, deleted: true });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Could not delete record." }, { status: 400 });
  }
}
