#!/usr/bin/env node

import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import http from "node:http";
import { dirname, resolve } from "node:path";

const PORT = Number(process.env.BLISS_RELAY_PORT || 8787);
const SECRET = process.env.BLISS_RELAY_SECRET || "local-dev-only-change-me";
const AUTH_TOKEN = process.env.BLISS_RELAY_TOKEN || "";
const STORE_PATH = resolve(process.env.BLISS_RELAY_STORE || "/tmp/bliss-planner-sync-relay-store.json");
const PAIRING_TTL_MS = Number(process.env.BLISS_RELAY_PAIRING_TTL_MS || 10 * 60 * 1000);
const DEFAULT_WORKSPACE = "default-workspace";

function emptyStore() {
  return {
    cursor: 0,
    workspaces: {
      [DEFAULT_WORKSPACE]: {
        encryptedEvents: [],
        devices: {},
        pairingCodes: {}
      }
    }
  };
}

function loadStore() {
  try {
    return JSON.parse(readFileSync(STORE_PATH, "utf8"));
  } catch {
    return emptyStore();
  }
}

let store = loadStore();

function saveStore() {
  mkdirSync(dirname(STORE_PATH), { recursive: true });
  const nextPath = `${STORE_PATH}.tmp`;
  writeFileSync(nextPath, JSON.stringify(store, null, 2));
  renameSync(nextPath, STORE_PATH);
}

function workspace(workspaceId = DEFAULT_WORKSPACE) {
  if (!store.workspaces[workspaceId]) {
    store.workspaces[workspaceId] = {
      encryptedEvents: [],
      devices: {},
      pairingCodes: {}
    };
  }
  return store.workspaces[workspaceId];
}

function key() {
  return createHash("sha256").update(SECRET).digest();
}

function encryptJson(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    body: body.toString("base64")
  };
}

function decryptJson(envelope) {
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(envelope.iv, "base64"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  const raw = Buffer.concat([
    decipher.update(Buffer.from(envelope.body, "base64")),
    decipher.final()
  ]).toString("utf8");
  return JSON.parse(raw);
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function isAuthorized(req) {
  if (!AUTH_TOKEN) return true;
  const authorization = req.headers.authorization || "";
  const headerToken = req.headers["x-bliss-relay-token"] || "";
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
  return safeEqual(String(headerToken || bearer), AUTH_TOKEN);
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 5_000_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolveBody(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function send(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
    "access-control-allow-headers": "authorization,content-type,x-bliss-relay-token"
  });
  res.end(JSON.stringify(payload));
}

function cleanupExpiredPairingCodes(space) {
  const now = Date.now();
  for (const [code, entry] of Object.entries(space.pairingCodes)) {
    if (new Date(entry.expiresAt).getTime() <= now) {
      delete space.pairingCodes[code];
    }
  }
}

function createPairingCode() {
  return randomBytes(4).toString("hex").toUpperCase();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (req.method === "OPTIONS") {
    send(res, 204, {});
    return;
  }

  if (!isAuthorized(req)) {
    send(res, 401, { ok: false, error: "Unauthorized relay request." });
    return;
  }

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      const workspaceId = url.searchParams.get("workspaceId") || DEFAULT_WORKSPACE;
      const space = workspace(workspaceId);
      cleanupExpiredPairingCodes(space);
      saveStore();
      send(res, 200, {
        ok: true,
        cursor: store.cursor,
        workspaceId,
        encryptedEventCount: space.encryptedEvents.length,
        deviceCount: Object.keys(space.devices).length,
        pendingPairingCount: Object.keys(space.pairingCodes).length,
        authRequired: Boolean(AUTH_TOKEN),
        storePath: STORE_PATH,
        mode: "aes-256-gcm-persistent-relay"
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/devices/pair/start") {
      const payload = await readBody(req);
      const workspaceId = payload.workspaceId || DEFAULT_WORKSPACE;
      const space = workspace(workspaceId);
      cleanupExpiredPairingCodes(space);
      const code = createPairingCode();
      const deviceId = payload.deviceId || randomUUID();
      const deviceName = payload.deviceName || "Trusted device";
      space.pairingCodes[code] = {
        deviceId,
        deviceName,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + PAIRING_TTL_MS).toISOString()
      };
      saveStore();
      send(res, 200, { ok: true, workspaceId, pairingCode: code, expiresAt: space.pairingCodes[code].expiresAt });
      return;
    }

    if (req.method === "POST" && url.pathname === "/devices/pair/claim") {
      const payload = await readBody(req);
      const workspaceId = payload.workspaceId || DEFAULT_WORKSPACE;
      const space = workspace(workspaceId);
      cleanupExpiredPairingCodes(space);
      const code = String(payload.pairingCode || "").toUpperCase();
      const pairing = space.pairingCodes[code];
      if (!pairing) {
        send(res, 404, { ok: false, error: "Pairing code not found or expired." });
        return;
      }
      const deviceId = payload.deviceId || pairing.deviceId || randomUUID();
      space.devices[deviceId] = {
        id: deviceId,
        name: payload.deviceName || pairing.deviceName,
        publicKey: payload.publicKey || "",
        pairedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        revokedAt: null
      };
      delete space.pairingCodes[code];
      saveStore();
      send(res, 200, { ok: true, workspaceId, deviceId });
      return;
    }

    if (req.method === "POST" && url.pathname === "/sync/push") {
      const payload = await readBody(req);
      const workspaceId = payload.workspaceId || DEFAULT_WORKSPACE;
      const space = workspace(workspaceId);
      const deviceId = payload.deviceId || "unknown-device";
      const changes = Array.isArray(payload.changes) ? payload.changes : [];
      const acceptedIds = [];

      if (!space.devices[deviceId]) {
        space.devices[deviceId] = {
          id: deviceId,
          name: payload.deviceName || deviceId,
          publicKey: payload.publicKey || "",
          pairedAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
          revokedAt: null
        };
      }

      for (const change of changes) {
        store.cursor += 1;
        acceptedIds.push(change.id);
        space.encryptedEvents.push({
          cursor: store.cursor,
          deviceId,
          envelope: encryptJson({ ...change, revision: store.cursor, source: "remote", status: "SYNCED" })
        });
      }
      space.devices[deviceId].lastSeenAt = new Date().toISOString();
      saveStore();
      send(res, 200, { acceptedIds, cursor: store.cursor, workspaceId });
      return;
    }

    if (req.method === "POST" && url.pathname === "/devices/revoke") {
      const payload = await readBody(req);
      const workspaceId = payload.workspaceId || DEFAULT_WORKSPACE;
      const space = workspace(workspaceId);
      const deviceId = payload.deviceId || "";
      if (!space.devices[deviceId]) {
        send(res, 404, { ok: false, error: "Device not found." });
        return;
      }
      space.devices[deviceId].revokedAt = new Date().toISOString();
      saveStore();
      send(res, 200, { ok: true, workspaceId, deviceId, revoked: true });
      return;
    }

    if (req.method === "GET" && url.pathname === "/sync/pull") {
      const workspaceId = url.searchParams.get("workspaceId") || DEFAULT_WORKSPACE;
      const since = Number(url.searchParams.get("since") || 0);
      const deviceId = url.searchParams.get("deviceId") || "";
      const space = workspace(workspaceId);
      const events = space.encryptedEvents
        .filter((entry) => entry.cursor > since && entry.deviceId !== deviceId)
        .map((entry) => decryptJson(entry.envelope));
      if (space.devices[deviceId]) {
        space.devices[deviceId].lastSeenAt = new Date().toISOString();
        saveStore();
      }
      send(res, 200, { cursor: store.cursor, workspaceId, events });
      return;
    }

    if (req.method === "DELETE" && url.pathname === "/sync/workspace") {
      const workspaceId = url.searchParams.get("workspaceId") || DEFAULT_WORKSPACE;
      const existed = Boolean(store.workspaces[workspaceId]);
      delete store.workspaces[workspaceId];
      saveStore();
      send(res, 200, { ok: true, workspaceId, deleted: existed });
      return;
    }

    send(res, 404, { ok: false, error: "Not found" });
  } catch (error) {
    send(res, 500, { ok: false, error: error instanceof Error ? error.message : "Unexpected relay error" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Bliss Planner persistent encrypted sync relay listening on http://127.0.0.1:${PORT}`);
  console.log(`Relay store: ${STORE_PATH}`);
  console.log(`Auth required: ${Boolean(AUTH_TOKEN)}`);
});
