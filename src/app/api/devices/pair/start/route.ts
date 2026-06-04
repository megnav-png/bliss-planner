import { authorizeRelayRequest, hostedPairStart } from "@/lib/server/hostedRelay";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!authorizeRelayRequest(request.headers)) {
    return Response.json({ ok: false, error: "Unauthorized relay request." }, { status: 401 });
  }
  return Response.json(await hostedPairStart(await request.json().catch(() => ({}))));
}
