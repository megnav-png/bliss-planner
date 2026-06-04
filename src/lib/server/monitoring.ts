import { createHash } from "node:crypto";
import { fileStorageHealth } from "@/lib/server/fileStorage";
import { inviteEmailHealth } from "@/lib/server/inviteMailer";

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || "";
const RENDER_SERVICE_NAME = process.env.RENDER_SERVICE_NAME || "bliss-planner";
const RENDER_GIT_COMMIT = process.env.RENDER_GIT_COMMIT || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "local";

function fingerprint(value: string) {
  if (!value) return "";
  return createHash("sha256").update(value.trim()).digest("hex").slice(0, 16);
}

export function monitoringHealth() {
  const relayToken = process.env.BLISS_RELAY_TOKEN || "";

  return {
    ok: true,
    service: RENDER_SERVICE_NAME,
    commit: RENDER_GIT_COMMIT,
    environment: process.env.NODE_ENV || "development",
    sentryConfigured: Boolean(SENTRY_DSN),
    relayTokenConfigured: Boolean(relayToken),
    relayTokenFingerprint: fingerprint(relayToken),
    relayTokenVersion: process.env.BLISS_RELAY_TOKEN_VERSION || "",
    fileStorage: fileStorageHealth(),
    inviteEmail: inviteEmailHealth(),
    uptimeSeconds: Math.round(process.uptime()),
    checkedAt: new Date().toISOString()
  };
}

export async function recordMonitoringEvent(payload: Record<string, unknown>) {
  const event = {
    service: RENDER_SERVICE_NAME,
    commit: RENDER_GIT_COMMIT,
    level: payload.level || "info",
    message: payload.message || "Bliss Planner event",
    route: payload.route || null,
    metadata: payload.metadata || {},
    createdAt: new Date().toISOString()
  };

  if (!SENTRY_DSN) {
    console.info("[bliss-monitoring]", JSON.stringify(event));
    return { ok: true, delivered: false, provider: "log", event };
  }

  console.info("[bliss-monitoring:sentry-ready]", JSON.stringify(event));
  return {
    ok: true,
    delivered: false,
    provider: "sentry-dsn-configured",
    note: "Sentry DSN is configured. Add @sentry/nextjs init when package installation is approved for full envelope delivery.",
    event
  };
}
