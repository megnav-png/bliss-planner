import { monitoringHealth } from "@/lib/server/monitoring";

export const runtime = "nodejs";

export async function GET() {
  return Response.json(monitoringHealth());
}
