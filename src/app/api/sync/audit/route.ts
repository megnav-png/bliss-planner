import { authorizeRelayRequest, hostedRelayAudit } from "@/lib/server/hostedRelay";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!authorizeRelayRequest(request.headers)) {
    return Response.json({ ok: false, error: "Unauthorized relay request." }, { status: 401 });
  }

  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId") || undefined;
  const limit = Number(url.searchParams.get("limit") || 100);
  return Response.json(await hostedRelayAudit(workspaceId, limit));
}
