import { requireManagedAccess } from "@/lib/server/managedAuth";
import { listRecords, updateRecord } from "@/lib/server/productionStore";

export const runtime = "nodejs";

export async function GET() {
  const access = await requireManagedAccess({ portalAccess: ["CLIENT_PORTAL", "FULL_WORKSPACE"] });
  if (!access.allowed) {
    return Response.json({ ok: false, error: access.reason || "Access denied." }, { status: access.reason === "LOGIN_REQUIRED" ? 401 : 403 });
  }
  const workspaceId = access.auth.session.workspaceId || "default-workspace";
  const [weddings, approvals, guests, files] = await Promise.all([
    listRecords(workspaceId, "weddings"),
    listRecords(workspaceId, "approvals"),
    listRecords(workspaceId, "guests"),
    listRecords(workspaceId, "files")
  ]);
  return Response.json({
    ok: true,
    workspaceId,
    user: access.auth.session.email,
    portal: "client",
    weddings,
    approvals,
    guests,
    files
  });
}

export async function POST(request: Request) {
  const access = await requireManagedAccess({ portalAccess: ["CLIENT_PORTAL", "FULL_WORKSPACE"] });
  if (!access.allowed) {
    return Response.json({ ok: false, error: access.reason || "Access denied." }, { status: access.reason === "LOGIN_REQUIRED" ? 401 : 403 });
  }
  const payload = await request.json().catch(() => ({}));
  if (!payload.approvalId || !payload.state) {
    return Response.json({ ok: false, error: "approvalId and state are required." }, { status: 400 });
  }
  const record = await updateRecord(
    access.auth.session.workspaceId || "default-workspace",
    "approvals",
    String(payload.approvalId),
    {
      state: payload.state,
      decisionNote: payload.note || "",
      decidedAt: new Date().toISOString()
    },
    access.auth.session.email
  );
  if (!record) return Response.json({ ok: false, error: "Approval not found." }, { status: 404 });
  return Response.json({ ok: true, approval: record });
}
