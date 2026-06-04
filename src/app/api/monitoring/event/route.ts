import { recordMonitoringEvent } from "@/lib/server/monitoring";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  return Response.json(await recordMonitoringEvent(payload));
}
