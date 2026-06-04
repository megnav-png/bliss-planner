const appUrl = (process.env.BLISS_APP_URL || process.env.WOVOPS_APP_URL || "https://bliss-planner.onrender.com").replace(/\/$/, "");
const workspaceId = process.env.BLISS_RELAY_WORKSPACE_ID || "default-workspace";
const token = process.env.BLISS_RELAY_TOKEN || "";
const allowNonDurable = process.env.BLISS_ALLOW_NON_DURABLE_RELAY === "true";

const url = `${appUrl}/api/sync/health?workspaceId=${encodeURIComponent(workspaceId)}`;
const headers = token
  ? {
      authorization: `Bearer ${token}`,
      "x-bliss-relay-token": token
    }
  : {};
const response = await fetch(url, { headers });
const body = await response.json().catch(() => ({}));

if (!response.ok) {
  console.error(JSON.stringify({ ok: false, status: response.status, url, body }, null, 2));
  process.exit(1);
}

const failures = [];
if (!body.authRequired) failures.push("Relay token auth is not required.");
if (!body.durable && !allowNonDurable) failures.push("Relay store is not durable.");
if (!body.auditLogCount) failures.push("Relay audit log is not recording health checks.");
if (!body.retention?.auditDays) failures.push("Relay audit retention is not configured.");
if (!body.tokenVersion) failures.push("Relay token version is missing.");

const result = {
  ok: failures.length === 0,
  url,
  workspaceId,
  cursor: body.cursor,
  encryptedEventCount: body.encryptedEventCount,
  deviceCount: body.deviceCount,
  auditLogCount: body.auditLogCount,
  durable: body.durable,
  storeBackend: body.storeBackend,
  storeLocation: body.storeLocation,
  authRequired: body.authRequired,
  tokenVersion: body.tokenVersion,
  retention: body.retention,
  failures
};

console.log(JSON.stringify(result, null, 2));

if (failures.length) {
  process.exit(1);
}
