import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";

const SECRET = process.env.BLISS_RELAY_SECRET || "hosted-dev-only-change-me";
const AUTH_TOKEN = process.env.BLISS_RELAY_TOKEN || "";
const STORE_DIR = process.env.BLISS_RELAY_STORE_DIR || "/tmp";
const STORE_FILE = process.env.BLISS_RELAY_STORE_FILE || "bliss-planner-hosted-relay-store.json";
const STORE_PATH = `${STORE_DIR}/${STORE_FILE}`;
const DEFAULT_WORKSPACE = "default-workspace";
const PAIRING_TTL_MS = Number(process.env.BLISS_RELAY_PAIRING_TTL_MS || 10 * 60 * 1000);

type RelayStore = {
  cursor: number;
  workspaces: Record<
    string,
    {
      encryptedEvents: Array<{ cursor: number; deviceId: string; envelope: EncryptedEnvelope }>;
      devices: Record<string, RelayDevice>;
      pairingCodes: Record<string, { deviceId: string; deviceName: string; createdAt: string; expiresAt: string }>;
    }
  >;
};

type EncryptedEnvelope = {
  iv: string;
  tag: string;
  body: string;
};

type RelayDevice = {
  id: string;
  name: string;
  publicKey: string;
  pairedAt: string;
  lastSeenAt: string;
  revokedAt: string | null;
};

function emptyStore(): RelayStore {
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

async function loadStore(): Promise<RelayStore> {
  try {
    return JSON.parse(await readFile(STORE_PATH, "utf8")) as RelayStore;
  } catch {
    return emptyStore();
  }
}

async function saveStore(store: RelayStore) {
  await mkdir(STORE_DIR, { recursive: true });
  const tempPath = `${STORE_PATH}.tmp`;
  await writeFile(tempPath, JSON.stringify(store, null, 2));
  await rename(tempPath, STORE_PATH);
}

function workspace(store: RelayStore, workspaceId = DEFAULT_WORKSPACE) {
  if (!store.workspaces[workspaceId]) {
    store.workspaces[workspaceId] = { encryptedEvents: [], devices: {}, pairingCodes: {} };
  }
  return store.workspaces[workspaceId];
}

function key() {
  return createHash("sha256").update(SECRET).digest();
}

function encryptJson(value: unknown): EncryptedEnvelope {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return {
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    body: body.toString("base64")
  };
}

function decryptJson(envelope: EncryptedEnvelope) {
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(envelope.iv, "base64"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  const raw = Buffer.concat([
    decipher.update(Buffer.from(envelope.body, "base64")),
    decipher.final()
  ]).toString("utf8");
  return JSON.parse(raw);
}

function cleanupExpiredPairingCodes(space: ReturnType<typeof workspace>) {
  const now = Date.now();
  for (const [code, entry] of Object.entries(space.pairingCodes)) {
    if (new Date(entry.expiresAt).getTime() <= now) delete space.pairingCodes[code];
  }
}

function authTokenFromHeaders(headers: Headers) {
  const authorization = headers.get("authorization") || "";
  const headerToken = headers.get("x-bliss-relay-token") || "";
  return authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : headerToken;
}

export function authorizeRelayRequest(headers: Headers) {
  if (!AUTH_TOKEN) return true;
  const token = authTokenFromHeaders(headers);
  const left = Buffer.from(token);
  const right = Buffer.from(AUTH_TOKEN);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function hostedRelayHealth(workspaceId = DEFAULT_WORKSPACE) {
  const store = await loadStore();
  const space = workspace(store, workspaceId);
  cleanupExpiredPairingCodes(space);
  await saveStore(store);
  return {
    ok: true,
    cursor: store.cursor,
    workspaceId,
    encryptedEventCount: space.encryptedEvents.length,
    deviceCount: Object.keys(space.devices).length,
    pendingPairingCount: Object.keys(space.pairingCodes).length,
    authRequired: Boolean(AUTH_TOKEN),
    storePath: STORE_PATH,
    mode: "next-hosted-aes-256-gcm-persistent-relay"
  };
}

export async function hostedPairStart(payload: Record<string, any>) {
  const store = await loadStore();
  const workspaceId = payload.workspaceId || DEFAULT_WORKSPACE;
  const space = workspace(store, workspaceId);
  cleanupExpiredPairingCodes(space);
  const pairingCode = randomBytes(4).toString("hex").toUpperCase();
  const deviceId = payload.deviceId || randomUUID();
  space.pairingCodes[pairingCode] = {
    deviceId,
    deviceName: payload.deviceName || "Trusted device",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + PAIRING_TTL_MS).toISOString()
  };
  await saveStore(store);
  return { ok: true, workspaceId, pairingCode, expiresAt: space.pairingCodes[pairingCode].expiresAt };
}

export async function hostedPairClaim(payload: Record<string, any>) {
  const store = await loadStore();
  const workspaceId = payload.workspaceId || DEFAULT_WORKSPACE;
  const space = workspace(store, workspaceId);
  cleanupExpiredPairingCodes(space);
  const pairingCode = String(payload.pairingCode || "").toUpperCase();
  const pairing = space.pairingCodes[pairingCode];
  if (!pairing) return { ok: false, status: 404, error: "Pairing code not found or expired." };
  const deviceId = payload.deviceId || pairing.deviceId || randomUUID();
  space.devices[deviceId] = {
    id: deviceId,
    name: payload.deviceName || pairing.deviceName,
    publicKey: payload.publicKey || "",
    pairedAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    revokedAt: null
  };
  delete space.pairingCodes[pairingCode];
  await saveStore(store);
  return { ok: true, workspaceId, deviceId };
}

export async function hostedPush(payload: Record<string, any>) {
  const store = await loadStore();
  const workspaceId = payload.workspaceId || DEFAULT_WORKSPACE;
  const space = workspace(store, workspaceId);
  const deviceId = payload.deviceId || "unknown-device";
  const changes = Array.isArray(payload.changes) ? payload.changes : [];
  const acceptedIds: string[] = [];
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
  if (space.devices[deviceId].revokedAt) return { ok: false, status: 403, error: "Device is revoked." };
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
  await saveStore(store);
  return { acceptedIds, cursor: store.cursor, workspaceId };
}

export async function hostedPull(workspaceId: string, since: number, deviceId: string) {
  const store = await loadStore();
  const space = workspace(store, workspaceId || DEFAULT_WORKSPACE);
  if (space.devices[deviceId]?.revokedAt) return { ok: false, status: 403, error: "Device is revoked." };
  const events = space.encryptedEvents
    .filter((entry) => entry.cursor > since && entry.deviceId !== deviceId)
    .map((entry) => decryptJson(entry.envelope));
  if (space.devices[deviceId]) {
    space.devices[deviceId].lastSeenAt = new Date().toISOString();
    await saveStore(store);
  }
  return { cursor: store.cursor, workspaceId, events };
}

export async function hostedRevokeDevice(workspaceId: string, deviceId: string) {
  const store = await loadStore();
  const space = workspace(store, workspaceId || DEFAULT_WORKSPACE);
  if (!space.devices[deviceId]) return { ok: false, status: 404, error: "Device not found." };
  space.devices[deviceId].revokedAt = new Date().toISOString();
  await saveStore(store);
  return { ok: true, workspaceId, deviceId, revoked: true };
}

export async function hostedDeleteWorkspace(workspaceId: string) {
  const store = await loadStore();
  const existed = Boolean(store.workspaces[workspaceId || DEFAULT_WORKSPACE]);
  delete store.workspaces[workspaceId || DEFAULT_WORKSPACE];
  await saveStore(store);
  return { ok: true, workspaceId: workspaceId || DEFAULT_WORKSPACE, deleted: existed };
}
