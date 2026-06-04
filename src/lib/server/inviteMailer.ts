type InviteEmailPayload = {
  to: string;
  role: string;
  portalAccess: string;
  workspaceName: string;
  invitedBy: string;
  acceptUrl?: string;
};

const FROM_EMAIL = process.env.BLISS_EMAIL_FROM || "Bliss Planner <noreply@blissplanner.app>";
const RESEND_API_KEY = process.env.BLISS_RESEND_API_KEY || "";

export async function sendInviteEmail(payload: InviteEmailPayload) {
  const subject = `You're invited to ${payload.workspaceName} on Bliss Planner`;
  const acceptUrl = payload.acceptUrl || `${process.env.BLISS_PUBLIC_APP_URL || "https://bliss-planner.onrender.com"}/`;
  const text = [
    `${payload.invitedBy} invited you to ${payload.workspaceName} on Bliss Planner.`,
    `Role: ${payload.role}`,
    `Portal access: ${payload.portalAccess}`,
    `Open your invite: ${acceptUrl}`
  ].join("\n");

  if (!RESEND_API_KEY) {
    return {
      ok: true,
      delivered: false,
      provider: "queued",
      message: "No BLISS_RESEND_API_KEY configured; invite was recorded locally and is ready for provider delivery.",
      to: payload.to,
      subject
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${RESEND_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [payload.to],
      subject,
      text
    })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      delivered: false,
      provider: "resend",
      status: response.status,
      error: body?.message || "Invite email provider rejected the message."
    };
  }

  return {
    ok: true,
    delivered: true,
    provider: "resend",
    id: body?.id,
    to: payload.to,
    subject
  };
}
