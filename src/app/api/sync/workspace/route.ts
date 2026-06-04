import { authorizeRelayRequest, hostedDeleteWorkspace } from "@/lib/server/hostedRelay";

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  if (!authorizeRelayRequest(request.headers)) {
    return Response.json({ ok: false, error: "Unauthorized relay request." }, { status: 401 });
  }
  const url = new URL(request.url);
  return Response.json(await hostedDeleteWorkspace(url.searchParams.get("workspaceId") || "default-workspace"));
}
