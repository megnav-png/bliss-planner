import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";

const SECRET = process.env.BLISS_RELAY_SECRET || "hosted-dev-only-change-me";
const normalizeRelayToken = (value: string) => value.trim();
const AUTH_TOKEN = normalizeRelayToken(process.env.BLISS_RELAY_TOKEN || "");
const STORE_BACKEND = (process.env.BLISS_RELAY_STORE_BACKEND || "file").toLowerCase();
const STORE_DIR = process.env.BLISS_RELAY_STORE_DIR || "/tmp";
const STORE_FILE = process.env.BLISS_RELAY_STORE_FILE || "bliss-planner-hosted-relay-store.json";
const STORE_PATH = `${STORE_DIR}/${STORE_FILE}`;
const POSTGRES_URL = process.env.BLISS_RELAY_DATABASE_URL || process.env.DATABASE_URL || "";
const DEFAULT_WORKSPACE = "default-workspace";
const PAIRING_TTL_MS = Number(process.env.BLISS_RELAY_PAIRING_TTL_MS || 10 * 60 * 1000);
const POSTGRES_ROW_ID = "primary";
const AUDIT_RETENTION_DAYS = Number(process.env.BLISS_RELAY_AUDIT_RETENTION_DAYS || 90);
const EVENT_RETENTION_DAYS = Number(process.env.BLISS_RELAY_EVENT_RETENTION_DAYS || 365);
const TOKEN_VERSION = Number(process.env.BLISS_RELAY_TOKEN_VERSION || 1);

type RelayAuditAction =
  | "HEALTH_READ"
  | "AUDIT_READ"
  | "PAIRING_STARTED"
  | "PAIRING_CLAIMED"
  | "EVENTS_PUSHED"
  | "EVENTS_PULLED"
  | "DEVICE_REVOKED"
  | "WORKSPACE_DELETED"
  | "RETENTION_PRUNED";

type RelayWorkspace = {
  encryptedEvents: Array<{ cursor: number; deviceId: string; envelope: EncryptedEnvelope; createdAt?: string }>;
  devices: Record<string, RelayDevice>;
  pairingCodes: Record<string, { deviceId: string; deviceName: string; createdAt: string; expiresAt: string }>;
  auditLogs: RelayAuditLog[];
  retentionDays: number;
  tokenVersion: number;
};

type RelayAuditLog = {
  id: string;
  action: RelayAuditAction;
  at: string;
  deviceId?: string;
  cursor?: number;
  metadata?: Record<string, string | number | boolean | null>;
};

type RelayStore = {
  cursor: number;
  workspaces: Record<string, RelayWorkspace>;
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

type StoreAdapter = {
  mode: "file" | "postgres";
  durable: boolean;
  location: string;
  load: () => Promise<RelayStore>;
  save: (store: RelayStore) => Promise<void>;
};

let postgresPool: any | null = null;

function emptyWorkspace(): RelayWorkspace {
  return {
    encryptedEvents: [],
    devices: {},
    pairingCodes: {},
    auditLogs: [],
    retentionDays: AUDIT_RETENTION_DAYS,
    tokenVersion: TOKEN_VERSION
  };
}

function emptyStore(): RelayStore {
  return {
    cursor: 0,
    workspaces: {
      [DEFAULT_WORKSPACE]: emptyWorkspace()
    }
  };
}

async function loadFileStore(): Promise<RelayStore> {
  try {
    return JSON.parse(await readFile(STORE_PATH, "utf8")) as RelayStore;
  } catch {
    return emptyStore();
  }
}

async function saveFileStore(store: RelayStore) {
  await mkdir(STORE_DIR, { recursive: true });
  const tempPath = `${STORE_PATH}.tmp`;
  await writeFile(tempPath, JSON.stringify(store, null, 2));
  await rename(tempPath, STORE_PATH);
}

async function pool() {
  if (!POSTGRES_URL) {
    throw new Error("BLISS_RELAY_STORE_BACKEND=postgres requires BLISS_RELAY_DATABASE_URL or DATABASE_URL.");
  }
  if (!postgresPool) {
    const { Pool } = await import("pg");
    postgresPool = new Pool({
      connectionString: POSTGRES_URL,
      ssl: process.env.BLISS_RELAY_POSTGRES_SSL === "false" ? false : { rejectUnauthorized: false },
      max: Number(process.env.BLISS_RELAY_POSTGRES_POOL_SIZE || 3)
    });
  }
  return postgresPool;
}

async function ensurePostgresStore() {
  const client = await pool();
  await client.query(`
    create table if not exists bliss_relay_store (
      id text primary key,
      store jsonb not null,
      updated_at timestamptz not null default now()
    )
  `);
}

async function loadPostgresStore(): Promise<RelayStore> {
  await ensurePostgresStore();
  const client = await pool();
  const result = await client.query("select store from bliss_relay_store where id = $1", [POSTGRES_ROW_ID]);
  return (result.rows[0]?.store as RelayStore | undefined) ?? emptyStore();
}

async function savePostgresStore(store: RelayStore) {
  await ensurePostgresStore();
  const client = await pool();
  await client.query(
    `
      insert into bliss_relay_store (id, store, updated_at)
      values ($1, $2::jsonb, now())
      on conflict (id) do update set store = excluded.store, updated_at = now()
    `,
    [POSTGRES_ROW_ID, JSON.stringify(store)]
  );
}

function adapter(): StoreAdapter {
  if (STORE_BACKEND === "postgres") {
    return {
      mode: "postgres",
      durable: Boolean(POSTGRES_URL),
      location: POSTGRES_URL ? "postgres://configured" : "postgres://missing-database-url",
      load: loadPostgresStore,
      save: savePostgresStore
    };
  }

  return {
    mode: "file",
    durable: STORE_DIR !== "/tmp" && STORE_DIR !== "/private/tmp",
    location: STORE_PATH,
    load: loadFileStore,
    save: saveFileStore
  };
}

async function loadStore(): Promise<RelayStore> {
  return adapter().load();
}

async function saveStore(store: RelayStore) {
  await adapter().save(store);
}

function workspace(store: RelayStore, workspaceId = DEFAULT_WORKSPACE) {
  if (!store.workspaces[workspaceId]) {
    store.workspaces[workspaceId] = emptyWorkspace();
  }
  store.workspaces[workspaceId].encryptedEvents ||= [];
  store.workspaces[workspaceId].devices ||= {};
  store.workspaces[workspaceId].pairingCodes ||= {};
  store.workspaces[workspaceId].auditLogs ||= [];
  store.workspaces[workspaceId].retentionDays ||= AUDIT_RETENTION_DAYS;
  store.workspaces[workspaceId].tokenVersion ||= TOKEN_VERSION;
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

function appendAudit(
  space: ReturnType<typeof workspace>,
  action: RelayAuditAction,
  options: { deviceId?: string; cursor?: number; metadata?: RelayAuditLog["metadata"] } = {}
) {
  space.auditLogs.push({
    id: randomUUID(),
    action,
    at: new Date().toISOString(),
    deviceId: options.deviceId,
    cursor: options.cursor,
    metadata: options.metadata
  });
}

function retentionCutoff(days: number) {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function applyRetention(space: ReturnType<typeof workspace>) {
  const beforeAudit = space.auditLogs.length;
  const beforeEvents = space.encryptedEvents.length;
  const auditCutoff = retentionCutoff(AUDIT_RETENTION_DAYS);
  const eventCutoff = retentionCutoff(EVENT_RETENTION_DAYS);

  space.auditLogs = space.auditLogs.filter((entry) => new Date(entry.at).getTime() >= auditCutoff);
  space.encryptedEvents = space.encryptedEvents.filter((entry) => {
    if (!entry.createdAt) return true;
    return new Date(entry.createdAt).getTime() >= eventCutoff;
  });
  space.retentionDays = AUDIT_RETENTION_DAYS;
  space.tokenVersion = TOKEN_VERSION;

  const prunedAudit = beforeAudit - space.auditLogs.length;
  const prunedEvents = beforeEvents - space.encryptedEvents.length;
  if (prunedAudit || prunedEvents) {
    appendAudit(space, "RETENTION_PRUNED", {
      metadata: { prunedAudit, prunedEvents, auditRetentionDays: AUDIT_RETENTION_DAYS, eventRetentionDays: EVENT_RETENTION_DAYS }
    });
  }
}

function authTokenFromHeaders(headers: Headers) {
  const authorization = headers.get("authorization") || "";
  const headerToken = headers.get("x-bliss-relay-token") || "";
  return normalizeRelayToken(authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : headerToken);
}

export function authorizeRelayRequest(headers: Headers) {
  if (!AUTH_TOKEN) return true;
  const token = authTokenFromHeaders(headers);
  const left = Buffer.from(token);
  const right = Buffer.from(AUTH_TOKEN);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function hostedRelayHealth(workspaceId = DEFAULT_WORKSPACE) {
  const storeAdapter = adapter();
  const store = await loadStore();
  const space = workspace(store, workspaceId);
  cleanupExpiredPairingCodes(space);
  applyRetention(space);
  appendAudit(space, "HEALTH_READ", {
    metadata: { durable: storeAdapter.durable, storeBackend: storeAdapter.mode, tokenVersion: TOKEN_VERSION }
  });
  await saveStore(store);
  return {
    ok: true,
    cursor: store.cursor,
    workspaceId,
    encryptedEventCount: space.encryptedEvents.length,
    deviceCount: Object.keys(space.devices).length,
    pendingPairingCount: Object.keys(space.pairingCodes).length,
    auditLogCount: space.auditLogs.length,
    latestAuditAt: space.auditLogs.at(-1)?.at ?? null,
    authRequired: Boolean(AUTH_TOKEN),
    tokenVersion: TOKEN_VERSION,
    retention: {
      auditDays: AUDIT_RETENTION_DAYS,
      eventDays: EVENT_RETENTION_DAYS
    },
    storeBackend: storeAdapter.mode,
    storeLocation: storeAdapter.location,
    durable: storeAdapter.durable,
    rotationPlan: [
      "Create a new BLISS_RELAY_TOKEN and increment BLISS_RELAY_TOKEN_VERSION.",
      "Deploy the new token, then re-pair trusted devices or update managed device configuration.",
      "Review audit logs for stale or revoked devices, then revoke any device that did not rotate."
    ],
    requiredProductionEnv:
      storeAdapter.mode === "postgres"
        ? ["BLISS_RELAY_STORE_BACKEND=postgres", "BLISS_RELAY_DATABASE_URL", "BLISS_RELAY_SECRET", "BLISS_RELAY_TOKEN"]
        : [
            "BLISS_RELAY_STORE_DIR=/var/data/bliss-relay",
            "BLISS_RELAY_SECRET",
            "BLISS_RELAY_TOKEN",
            "BLISS_RELAY_TOKEN_VERSION",
            "BLISS_RELAY_AUDIT_RETENTION_DAYS"
          ],
    mode: "next-hosted-aes-256-gcm-durable-relay"
  };
}

export async function hostedRelayAudit(workspaceId = DEFAULT_WORKSPACE, limit = 100) {
  const storeAdapter = adapter();
  const store = await loadStore();
  const space = workspace(store, workspaceId);
  cleanupExpiredPairingCodes(space);
  applyRetention(space);
  appendAudit(space, "AUDIT_READ", {
    metadata: { requestedLimit: limit, storeBackend: storeAdapter.mode, tokenVersion: TOKEN_VERSION }
  });
  await saveStore(store);
  return {
    ok: true,
    workspaceId,
    cursor: store.cursor,
    storeBackend: storeAdapter.mode,
    durable: storeAdapter.durable,
    tokenVersion: TOKEN_VERSION,
    retention: {
      auditDays: AUDIT_RETENTION_DAYS,
      eventDays: EVENT_RETENTION_DAYS
    },
    auditLogs: space.auditLogs
      .slice()
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, Math.max(1, Math.min(limit, 500)))
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
  appendAudit(space, "PAIRING_STARTED", {
    deviceId,
    metadata: { deviceName: space.pairingCodes[pairingCode].deviceName }
  });
  applyRetention(space);
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
  appendAudit(space, "PAIRING_CLAIMED", { deviceId, metadata: { deviceName: space.devices[deviceId].name } });
  applyRetention(space);
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
      createdAt: new Date().toISOString(),
      envelope: encryptJson({ ...change, revision: store.cursor, source: "remote", status: "SYNCED" })
    });
  }
  space.devices[deviceId].lastSeenAt = new Date().toISOString();
  appendAudit(space, "EVENTS_PUSHED", {
    deviceId,
    cursor: store.cursor,
    metadata: { acceptedCount: acceptedIds.length }
  });
  applyRetention(space);
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
  }
  appendAudit(space, "EVENTS_PULLED", {
    deviceId,
    cursor: store.cursor,
    metadata: { since, returnedCount: events.length }
  });
  applyRetention(space);
  await saveStore(store);
  return { cursor: store.cursor, workspaceId, events };
}

export async function hostedRevokeDevice(workspaceId: string, deviceId: string) {
  const store = await loadStore();
  const space = workspace(store, workspaceId || DEFAULT_WORKSPACE);
  if (!space.devices[deviceId]) return { ok: false, status: 404, error: "Device not found." };
  space.devices[deviceId].revokedAt = new Date().toISOString();
  appendAudit(space, "DEVICE_REVOKED", { deviceId });
  applyRetention(space);
  await saveStore(store);
  return { ok: true, workspaceId, deviceId, revoked: true };
}

export async function hostedDeleteWorkspace(workspaceId: string) {
  const store = await loadStore();
  const targetWorkspaceId = workspaceId || DEFAULT_WORKSPACE;
  const existed = Boolean(store.workspaces[targetWorkspaceId]);
  if (existed) {
    const space = workspace(store, targetWorkspaceId);
    appendAudit(space, "WORKSPACE_DELETED", { metadata: { workspaceId: targetWorkspaceId } });
  }
  delete store.workspaces[targetWorkspaceId];
  await saveStore(store);
  return { ok: true, workspaceId: targetWorkspaceId, deleted: existed };
}
