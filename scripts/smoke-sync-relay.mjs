#!/usr/bin/env node

const endpoint = process.env.BLISS_RELAY_URL || "http://127.0.0.1:8787";
const token = process.env.BLISS_RELAY_TOKEN || "";
const headers = {
  "content-type": "application/json",
  ...(token ? { authorization: `Bearer ${token}` } : {})
};

async function request(path, options = {}) {
  const response = await fetch(`${endpoint}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${path} failed: ${response.status} ${JSON.stringify(payload)}`);
  }
  return payload;
}

const workspaceId = `smoke-${Date.now()}`;

const health = await request(`/health?workspaceId=${workspaceId}`);
const pairStart = await request("/devices/pair/start", {
  method: "POST",
  body: JSON.stringify({ workspaceId, deviceId: "device-a", deviceName: "Smoke source" })
});
const pairClaim = await request("/devices/pair/claim", {
  method: "POST",
  body: JSON.stringify({
    workspaceId,
    pairingCode: pairStart.pairingCode,
    deviceId: "device-b",
    deviceName: "Smoke target",
    publicKey: "local-smoke-public-key"
  })
});
const push = await request("/sync/push", {
  method: "POST",
  body: JSON.stringify({
    workspaceId,
    deviceId: "device-a",
    changes: [
      {
        id: "evt-1",
        entity: "vendor",
        entityId: "vendor-smoke",
        op: "UPSERT",
        revision: 1,
        createdAt: new Date().toISOString(),
        payload: { id: "vendor-smoke", name: "Smoke Vendor" }
      }
    ]
  })
});
const pull = await request(`/sync/pull?workspaceId=${workspaceId}&since=0&deviceId=device-b`);
const revoked = await request("/devices/revoke", {
  method: "POST",
  body: JSON.stringify({ workspaceId, deviceId: "device-b" })
});
const deleted = await request(`/sync/workspace?workspaceId=${workspaceId}`, { method: "DELETE" });

const report = {
  endpoint,
  workspaceId,
  health,
  pairStart: { ok: pairStart.ok, expiresAt: pairStart.expiresAt },
  pairClaim,
  push,
  pulledEventCount: pull.events.length,
  revoked,
  deleted
};

if (!pairClaim.ok || push.acceptedIds.length !== 1 || pull.events.length !== 1 || !revoked.revoked || !deleted.deleted) {
  throw new Error(`Relay smoke failed: ${JSON.stringify(report, null, 2)}`);
}

console.log(JSON.stringify(report, null, 2));
