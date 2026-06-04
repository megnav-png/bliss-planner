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
const EMAIL_PROVIDER = (process.env.BLISS_EMAIL_PROVIDER || (RESEND_API_KEY ? "resend" : "queued")).toLowerCase();
const EMAIL_WEBHOOK_URL = process.env.BLISS_EMAIL_WEBHOOK_URL || "";
const EMAIL_WEBHOOK_TOKEN = process.env.BLISS_EMAIL_WEBHOOK_TOKEN || "";

export function inviteEmailHealth() {
  return {
    provider: EMAIL_PROVIDER,
    from: FROM_EMAIL,
    resendConfigured: Boolean(RESEND_API_KEY),
    webhookConfigured: Boolean(EMAIL_WEBHOOK_URL)
  };
}

export async function sendInviteEmail(payload: InviteEmailPayload) {
  const subject = `You're invited to ${payload.workspaceName} on Bliss Planner`;
  const acceptUrl = payload.acceptUrl || `${process.env.BLISS_PUBLIC_APP_URL || "https://bliss-planner.onrender.com"}/`;
  const text = [
    `${payload.invitedBy} invited you to ${payload.workspaceName} on Bliss Planner.`,
    `Role: ${payload.role}`,
    `Portal access: ${payload.portalAccess}`,
    `Open your invite: ${acceptUrl}`
  ].join("\n");

  if (EMAIL_PROVIDER === "webhook" && EMAIL_WEBHOOK_URL) {
    const response = await fetch(EMAIL_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(EMAIL_WEBHOOK_TOKEN ? { authorization: `Bearer ${EMAIL_WEBHOOK_TOKEN}` } : {})
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: payload.to,
        subject,
        text,
        template: "team-invite",
        data: { ...payload, acceptUrl }
      })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        delivered: false,
        provider: "webhook",
        status: response.status,
        error: body?.message || body?.error || "Invite email webhook rejected the message."
      };
    }
    return {
      ok: true,
      delivered: true,
      provider: "webhook",
      id: body?.id,
      to: payload.to,
      subject
    };
  }

  if (!RESEND_API_KEY || EMAIL_PROVIDER === "queued") {
    return {
      ok: true,
      delivered: false,
      provider: "queued",
      message: "No invite email provider configured; invite was recorded locally and is ready for provider delivery.",
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
