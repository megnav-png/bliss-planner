import { sendInviteEmail } from "@/lib/server/inviteMailer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (!payload?.to || !payload?.role || !payload?.portalAccess || !payload?.workspaceName || !payload?.invitedBy) {
    return Response.json({ ok: false, error: "Missing invite email payload." }, { status: 400 });
  }

  const result = await sendInviteEmail(payload);
  return Response.json(result, { status: result.ok ? 200 : 502 });
}
