import { authorizeRelayRequest, hostedRevokeDevice } from "@/lib/server/hostedRelay";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!authorizeRelayRequest(request.headers)) {
    return Response.json({ ok: false, error: "Unauthorized relay request." }, { status: 401 });
  }
  const payload = await request.json().catch(() => ({}));
  const result = await hostedRevokeDevice(payload.workspaceId || "default-workspace", payload.deviceId || "");
  if ("ok" in result && result.ok === false) {
    return Response.json(result, { status: result.status || 400 });
  }
  return Response.json(result);
}
