import { authorizeRelayRequest, hostedRelayHealth } from "@/lib/server/hostedRelay";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!authorizeRelayRequest(request.headers)) {
    return Response.json({ ok: false, error: "Unauthorized relay request." }, { status: 401 });
  }
  const url = new URL(request.url);
  return Response.json(await hostedRelayHealth(url.searchParams.get("workspaceId") || undefined));
}
