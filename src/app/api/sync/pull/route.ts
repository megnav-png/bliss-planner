import { authorizeRelayRequest, hostedPull } from "@/lib/server/hostedRelay";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!authorizeRelayRequest(request.headers)) {
    return Response.json({ ok: false, error: "Unauthorized relay request." }, { status: 401 });
  }
  const url = new URL(request.url);
  const result = await hostedPull(
    url.searchParams.get("workspaceId") || "default-workspace",
    Number(url.searchParams.get("since") || 0),
    url.searchParams.get("deviceId") || ""
  );
  if ("ok" in result && result.ok === false) {
    return Response.json(result, { status: result.status || 400 });
  }
  return Response.json(result);
}
