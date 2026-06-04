import { requireManagedAccess } from "@/lib/server/managedAuth";
import { listRecords, updateRecord } from "@/lib/server/productionStore";

export const runtime = "nodejs";

export async function GET() {
  const access = await requireManagedAccess({ portalAccess: ["VENDOR_PORTAL", "FULL_WORKSPACE"] });
  if (!access.allowed) {
    return Response.json({ ok: false, error: access.reason || "Access denied." }, { status: access.reason === "LOGIN_REQUIRED" ? 401 : 403 });
  }
  const workspaceId = access.auth.session.workspaceId || "default-workspace";
  const [weddings, vendors, venues, destinations, files] = await Promise.all([
    listRecords(workspaceId, "weddings"),
    listRecords(workspaceId, "vendors"),
    listRecords(workspaceId, "venues"),
    listRecords(workspaceId, "destinations"),
    listRecords(workspaceId, "files")
  ]);
  return Response.json({
    ok: true,
    workspaceId,
    user: access.auth.session.email,
    portal: "vendor",
    weddings,
    vendors,
    venues,
    destinations,
    files
  });
}

export async function POST(request: Request) {
  const access = await requireManagedAccess({ portalAccess: ["VENDOR_PORTAL", "FULL_WORKSPACE"] });
  if (!access.allowed) {
    return Response.json({ ok: false, error: access.reason || "Access denied." }, { status: access.reason === "LOGIN_REQUIRED" ? 401 : 403 });
  }
  const payload = await request.json().catch(() => ({}));
  if (!payload.vendorId || !payload.update) {
    return Response.json({ ok: false, error: "vendorId and update are required." }, { status: 400 });
  }
  const record = await updateRecord(
    access.auth.session.workspaceId || "default-workspace",
    "vendors",
    String(payload.vendorId),
    {
      vendorPortalUpdate: payload.update,
      vendorPortalUpdatedAt: new Date().toISOString(),
      vendorPortalUpdatedBy: access.auth.session.email
    },
    access.auth.session.email
  );
  if (!record) return Response.json({ ok: false, error: "Vendor record not found." }, { status: 404 });
  return Response.json({ ok: true, vendor: record });
}
