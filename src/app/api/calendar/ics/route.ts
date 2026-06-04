import { requireManagedAccess } from "@/lib/server/managedAuth";
import { listRecords, recordAudit } from "@/lib/server/productionStore";
import { ClientApproval, Wedding } from "@/lib/types";

export const runtime = "nodejs";

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function toIcsDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function eventBlock(input: { uid: string; title: string; start: string; description: string }) {
  const start = toIcsDate(input.start);
  if (!start) return "";
  return [
    "BEGIN:VEVENT",
    `UID:${escapeIcs(input.uid)}@bliss-planner`,
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${start}`,
    `SUMMARY:${escapeIcs(input.title)}`,
    `DESCRIPTION:${escapeIcs(input.description)}`,
    "END:VEVENT"
  ].join("\r\n");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const feedToken = process.env.BLISS_CALENDAR_FEED_TOKEN || "";
  const requestToken = url.searchParams.get("token") || "";
  const access = feedToken && requestToken === feedToken ? null : await requireManagedAccess({ portalAccess: ["FULL_WORKSPACE"], roles: ["OWNER", "PLANNER", "PRODUCTION"] });
  if (access && !access.allowed) {
    return Response.json({ ok: false, error: access.reason || "Access denied." }, { status: access.reason === "LOGIN_REQUIRED" ? 401 : 403 });
  }
  const workspaceId = url.searchParams.get("workspaceId") || access?.auth.session.workspaceId || "default-workspace";
  const [weddings, approvals] = await Promise.all([listRecords(workspaceId, "weddings"), listRecords(workspaceId, "approvals")]);
  const events = [
    ...weddings.map((record) => {
      const wedding = record.payload as unknown as Wedding;
      return eventBlock({
        uid: record.id,
        title: wedding.title || "Wedding event",
        start: wedding.date,
        description: `${wedding.destination || "Wedding"} · ${wedding.status || "Planning"}`
      });
    }),
    ...approvals.map((record) => {
      const approval = record.payload as unknown as ClientApproval;
      return eventBlock({
        uid: record.id,
        title: `Approval due: ${approval.title}`,
        start: approval.dueAt,
        description: `${approval.owner || "Client"} · ${approval.state || "Review"}`
      });
    })
  ].filter(Boolean);
  await recordAudit(workspaceId, access?.auth.session.email, "CALENDAR_FEED_ACCESSED", "calendar", workspaceId, {
    authenticated: Boolean(access),
    eventCount: events.length
  });
  return new Response(["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Bliss Planner//Calendar Feed//EN", ...events, "END:VCALENDAR"].join("\r\n"), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "cache-control": "private, max-age=300"
    }
  });
}
