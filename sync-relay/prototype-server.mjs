#!/usr/bin/env node

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import http from "node:http";

const PORT = Number(process.env.BLISS_RELAY_PORT || 8787);
const SECRET = process.env.BLISS_RELAY_SECRET || "local-dev-only-change-me";

let cursor = 0;
const encryptedEvents = [];

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

function readBody(req) {
  return new Promise((resolve, reject) => {
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
        resolve(raw ? JSON.parse(raw) : {});
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
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type"
  });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (req.method === "OPTIONS") {
    send(res, 204, {});
    return;
  }

  try {
    if (req.method === "POST" && url.pathname === "/sync/push") {
      const payload = await readBody(req);
      const changes = Array.isArray(payload.changes) ? payload.changes : [];
      const acceptedIds = [];
      for (const change of changes) {
        cursor += 1;
        acceptedIds.push(change.id);
        encryptedEvents.push({
          cursor,
          deviceId: payload.deviceId || "unknown-device",
          envelope: encryptJson({ ...change, revision: cursor, source: "remote", status: "SYNCED" })
        });
      }
      send(res, 200, { acceptedIds, cursor });
      return;
    }

    if (req.method === "GET" && url.pathname === "/sync/pull") {
      const since = Number(url.searchParams.get("since") || 0);
      const deviceId = url.searchParams.get("deviceId") || "";
      const events = encryptedEvents
        .filter((entry) => entry.cursor > since && entry.deviceId !== deviceId)
        .map((entry) => decryptJson(entry.envelope));
      send(res, 200, { cursor, events });
      return;
    }

    if (req.method === "GET" && url.pathname === "/health") {
      send(res, 200, {
        ok: true,
        cursor,
        encryptedEventCount: encryptedEvents.length,
        mode: "aes-256-gcm-at-rest"
      });
      return;
    }

    send(res, 404, { ok: false, error: "Not found" });
  } catch (error) {
    send(res, 500, { ok: false, error: error instanceof Error ? error.message : "Unexpected relay error" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Bliss Planner encrypted sync relay prototype listening on http://127.0.0.1:${PORT}`);
});
