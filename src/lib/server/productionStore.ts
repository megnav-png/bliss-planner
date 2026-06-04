import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { AccountRole, AccountStatus, PortalAccess } from "@/lib/types";

export type ProductionEntity =
  | "weddings"
  | "vendors"
  | "venues"
  | "destinations"
  | "approvals"
  | "guests"
  | "seatingTables"
  | "crm"
  | "files";

export type WorkspaceRole = AccountRole;

export type ProductionRecord = {
  id: string;
  workspaceId: string;
  entity: ProductionEntity;
  payload: Record<string, unknown>;
  revision: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

type AccountInput = {
  workspaceId: string;
  email: string;
  name: string;
  role: WorkspaceRole;
  status?: AccountStatus;
  portalAccess: PortalAccess;
  externalSub?: string;
};

const ENTITY_NAMES: ProductionEntity[] = [
  "weddings",
  "vendors",
  "venues",
  "destinations",
  "approvals",
  "guests",
  "seatingTables",
  "crm",
  "files"
];

const DATABASE_URL = process.env.BLISS_APP_DATABASE_URL || process.env.BLISS_RELAY_DATABASE_URL || process.env.DATABASE_URL || "";
const ALLOWED_DATA_RESIDENCIES = (process.env.BLISS_ALLOWED_DATA_RESIDENCIES || "")
  .split(",")
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);
let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

function getPool() {
  if (!DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
      max: 4
    });
  }
  return pool;
}

function ensureEntity(entity: string): asserts entity is ProductionEntity {
  if (!ENTITY_NAMES.includes(entity as ProductionEntity)) {
    throw new Error(`Unsupported production entity: ${entity}`);
  }
}

export function productionStoreHealth() {
  return {
    configured: Boolean(DATABASE_URL),
    backend: DATABASE_URL ? "postgres" : "not-configured",
    entities: ENTITY_NAMES,
    dataResidencyPolicy: ALLOWED_DATA_RESIDENCIES.length ? ALLOWED_DATA_RESIDENCIES : ["any"]
  };
}

function assertDataResidency(value?: string) {
  if (!ALLOWED_DATA_RESIDENCIES.length || !value) return;
  if (!ALLOWED_DATA_RESIDENCIES.includes(value.toLowerCase())) {
    throw new Error(`Data residency '${value}' is not allowed for this deployment.`);
  }
}

export async function ensureProductionSchema() {
  const db = getPool();
  if (!db) return false;
  if (!schemaReady) {
    schemaReady = db.query(`
      create table if not exists bliss_workspaces (
        id text primary key,
        name text not null,
        region text not null default 'Global',
        data_residency text not null default 'configured-by-workspace',
        auth_provider text not null default 'GOOGLE',
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists bliss_accounts (
        id text primary key,
        workspace_id text not null references bliss_workspaces(id) on delete cascade,
        external_sub text,
        email text not null,
        name text not null,
        role text not null,
        status text not null default 'INVITED',
        portal_access text not null default 'NONE',
        last_active_at timestamptz,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique(workspace_id, email)
      );

      create table if not exists bliss_records (
        id text primary key,
        workspace_id text not null references bliss_workspaces(id) on delete cascade,
        entity text not null,
        payload jsonb not null,
        revision int not null default 1,
        created_by text,
        updated_by text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        deleted_at timestamptz,
        check (entity in ('weddings','vendors','venues','destinations','approvals','guests','seatingTables','crm','files'))
      );

      create index if not exists bliss_records_workspace_entity_idx on bliss_records(workspace_id, entity) where deleted_at is null;
      create index if not exists bliss_records_payload_gin_idx on bliss_records using gin(payload);

      create table if not exists bliss_file_objects (
        id text primary key,
        workspace_id text not null references bliss_workspaces(id) on delete cascade,
        record_id text,
        provider text not null,
        storage_key text not null,
        public_url text,
        file_name text not null,
        mime_type text,
        size_bytes int,
        checksum text,
        client_facing boolean not null default false,
        created_by text,
        created_at timestamptz not null default now(),
        deleted_at timestamptz
      );

      create table if not exists bliss_sync_devices (
        id text primary key,
        workspace_id text not null references bliss_workspaces(id) on delete cascade,
        name text not null,
        platform text,
        app_version text,
        last_seen_at timestamptz,
        revoked_at timestamptz,
        created_at timestamptz not null default now()
      );

      create table if not exists bliss_sync_conflicts (
        id text primary key,
        workspace_id text not null references bliss_workspaces(id) on delete cascade,
        entity text not null,
        entity_id text not null,
        local_revision int not null,
        remote_revision int not null,
        payload jsonb not null,
        resolution text not null default 'PENDING',
        resolved_by text,
        resolved_at timestamptz,
        created_at timestamptz not null default now()
      );

      create table if not exists bliss_billing_accounts (
        workspace_id text primary key references bliss_workspaces(id) on delete cascade,
        provider text not null default 'manual',
        customer_id text,
        subscription_id text,
        plan text not null default 'pilot',
        status text not null default 'trialing',
        current_period_end timestamptz,
        updated_at timestamptz not null default now()
      );

      create table if not exists bliss_audit_log (
        id text primary key,
        workspace_id text not null references bliss_workspaces(id) on delete cascade,
        actor_email text,
        action text not null,
        entity text,
        entity_id text,
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      );

      create table if not exists bliss_notifications (
        id text primary key,
        workspace_id text not null references bliss_workspaces(id) on delete cascade,
        channel text not null default 'in_app',
        recipient_email text,
        subject text not null,
        body text not null,
        status text not null default 'QUEUED',
        metadata jsonb not null default '{}'::jsonb,
        sent_at timestamptz,
        read_at timestamptz,
        created_at timestamptz not null default now()
      );

      create table if not exists bliss_realtime_events (
        id text primary key,
        workspace_id text not null references bliss_workspaces(id) on delete cascade,
        event_type text not null,
        entity text,
        entity_id text,
        actor_email text,
        payload jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      );

      create index if not exists bliss_realtime_workspace_created_idx on bliss_realtime_events(workspace_id, created_at desc);
    `).then(() => undefined);
  }
  await schemaReady;
  return true;
}

export async function upsertWorkspace(input: { id?: string; name: string; region?: string; dataResidency?: string; authProvider?: string }) {
  assertDataResidency(input.dataResidency);
  if (!(await ensureProductionSchema())) return null;
  const db = getPool();
  if (!db) return null;
  const id = input.id || `workspace-${randomUUID()}`;
  const result = await db.query(
    `insert into bliss_workspaces(id, name, region, data_residency, auth_provider)
     values($1, $2, $3, $4, $5)
     on conflict(id) do update set name = excluded.name, region = excluded.region, data_residency = excluded.data_residency, auth_provider = excluded.auth_provider, updated_at = now()
     returning id, name, region, data_residency as "dataResidency", auth_provider as "authProvider", created_at as "createdAt", updated_at as "updatedAt"`,
    [id, input.name, input.region || "Global", input.dataResidency || "configured-by-workspace", input.authProvider || "GOOGLE"]
  );
  return result.rows[0];
}

export async function upsertAccount(input: AccountInput) {
  if (!(await ensureProductionSchema())) return null;
  const db = getPool();
  if (!db) return null;
  await upsertWorkspace({ id: input.workspaceId, name: input.workspaceId });
  const id = `user-${randomUUID()}`;
  const result = await db.query(
    `insert into bliss_accounts(id, workspace_id, external_sub, email, name, role, status, portal_access, last_active_at)
     values($1, $2, $3, $4, $5, $6, $7, $8, now())
     on conflict(workspace_id, email) do update set
       external_sub = coalesce(excluded.external_sub, bliss_accounts.external_sub),
       name = excluded.name,
       role = excluded.role,
       status = excluded.status,
       portal_access = excluded.portal_access,
       last_active_at = now(),
       updated_at = now()
     returning id, workspace_id as "workspaceId", external_sub as "externalSub", email, name, role, status, portal_access as "portalAccess", last_active_at as "lastActiveAt"`,
    [id, input.workspaceId, input.externalSub || null, input.email.toLowerCase(), input.name, input.role, input.status || "ACTIVE", input.portalAccess]
  );
  return result.rows[0];
}

export async function listAccounts(workspaceId: string) {
  if (!(await ensureProductionSchema())) return [];
  const db = getPool();
  if (!db) return [];
  const result = await db.query(
    `select id, workspace_id as "workspaceId", external_sub as "externalSub", email, name, role, status, portal_access as "portalAccess", last_active_at as "lastActiveAt"
     from bliss_accounts where workspace_id = $1 order by updated_at desc`,
    [workspaceId]
  );
  return result.rows;
}

export async function updateAccountAccess(input: {
  workspaceId: string;
  email: string;
  name?: string;
  role?: AccountRole;
  status?: AccountStatus;
  portalAccess?: PortalAccess;
  actorEmail?: string;
}) {
  if (!(await ensureProductionSchema())) return null;
  const db = getPool();
  if (!db) return null;
  const result = await db.query(
    `update bliss_accounts set
       name = coalesce($3, name),
       role = coalesce($4, role),
       status = coalesce($5, status),
       portal_access = coalesce($6, portal_access),
       updated_at = now()
     where workspace_id = $1 and email = lower($2)
     returning id, workspace_id as "workspaceId", external_sub as "externalSub", email, name, role, status, portal_access as "portalAccess", last_active_at as "lastActiveAt"`,
    [input.workspaceId, input.email, input.name || null, input.role || null, input.status || null, input.portalAccess || null]
  );
  await recordAudit(input.workspaceId, input.actorEmail, "ACCOUNT_ACCESS_UPDATED", "account", input.email, {
    role: input.role,
    status: input.status,
    portalAccess: input.portalAccess
  });
  await publishRealtimeEvent(input.workspaceId, "ACCOUNT_ACCESS_UPDATED", "account", input.email, input.actorEmail, {});
  return result.rows[0] ?? null;
}

export async function listRecords(workspaceId: string, entity: string) {
  ensureEntity(entity);
  if (!(await ensureProductionSchema())) return [];
  const db = getPool();
  if (!db) return [];
  const result = await db.query(
    `select id, workspace_id as "workspaceId", entity, payload, revision, created_at as "createdAt", updated_at as "updatedAt", deleted_at as "deletedAt"
     from bliss_records
     where workspace_id = $1 and entity = $2 and deleted_at is null
     order by updated_at desc`,
    [workspaceId, entity]
  );
  return result.rows as ProductionRecord[];
}

export async function getRecord(workspaceId: string, entity: string, id: string) {
  ensureEntity(entity);
  if (!(await ensureProductionSchema())) return null;
  const db = getPool();
  if (!db) return null;
  const result = await db.query(
    `select id, workspace_id as "workspaceId", entity, payload, revision, created_at as "createdAt", updated_at as "updatedAt", deleted_at as "deletedAt"
     from bliss_records where workspace_id = $1 and entity = $2 and id = $3 and deleted_at is null`,
    [workspaceId, entity, id]
  );
  return (result.rows[0] as ProductionRecord | undefined) ?? null;
}

export async function createRecord(workspaceId: string, entity: string, payload: Record<string, unknown>, actorEmail?: string) {
  ensureEntity(entity);
  if (!(await ensureProductionSchema())) return null;
  const db = getPool();
  if (!db) return null;
  await upsertWorkspace({ id: workspaceId, name: workspaceId });
  const id = String(payload.id || `${entity}-${randomUUID()}`);
  const nextPayload = { ...payload, id };
  const result = await db.query(
    `insert into bliss_records(id, workspace_id, entity, payload, created_by, updated_by)
     values($1, $2, $3, $4, $5, $5)
     returning id, workspace_id as "workspaceId", entity, payload, revision, created_at as "createdAt", updated_at as "updatedAt", deleted_at as "deletedAt"`,
    [id, workspaceId, entity, JSON.stringify(nextPayload), actorEmail || null]
  );
  await recordAudit(workspaceId, actorEmail, "RECORD_CREATED", entity, id, { entity });
  await publishRealtimeEvent(workspaceId, "RECORD_CREATED", entity, id, actorEmail, { entity });
  return result.rows[0] as ProductionRecord;
}

export async function updateRecord(workspaceId: string, entity: string, id: string, patch: Record<string, unknown>, actorEmail?: string) {
  ensureEntity(entity);
  if (!(await ensureProductionSchema())) return null;
  const db = getPool();
  if (!db) return null;
  const result = await db.query(
    `update bliss_records
     set payload = payload || $4::jsonb, revision = revision + 1, updated_by = $5, updated_at = now()
     where workspace_id = $1 and entity = $2 and id = $3 and deleted_at is null
     returning id, workspace_id as "workspaceId", entity, payload, revision, created_at as "createdAt", updated_at as "updatedAt", deleted_at as "deletedAt"`,
    [workspaceId, entity, id, JSON.stringify({ ...patch, id }), actorEmail || null]
  );
  await recordAudit(workspaceId, actorEmail, "RECORD_UPDATED", entity, id, { entity });
  await publishRealtimeEvent(workspaceId, "RECORD_UPDATED", entity, id, actorEmail, { entity });
  return (result.rows[0] as ProductionRecord | undefined) ?? null;
}

export async function deleteRecord(workspaceId: string, entity: string, id: string, actorEmail?: string) {
  ensureEntity(entity);
  if (!(await ensureProductionSchema())) return false;
  const db = getPool();
  if (!db) return false;
  const result = await db.query(
    `update bliss_records set deleted_at = now(), updated_by = $4, updated_at = now()
     where workspace_id = $1 and entity = $2 and id = $3 and deleted_at is null`,
    [workspaceId, entity, id, actorEmail || null]
  );
  await recordAudit(workspaceId, actorEmail, "RECORD_DELETED", entity, id, { entity });
  await publishRealtimeEvent(workspaceId, "RECORD_DELETED", entity, id, actorEmail, { entity });
  return (result.rowCount ?? 0) > 0;
}

export async function recordFileObject(input: {
  workspaceId: string;
  recordId?: string;
  provider: string;
  storageKey: string;
  publicUrl?: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  checksum?: string;
  clientFacing?: boolean;
  actorEmail?: string;
}) {
  if (!(await ensureProductionSchema())) return null;
  const db = getPool();
  if (!db) return null;
  await upsertWorkspace({ id: input.workspaceId, name: input.workspaceId });
  const id = `file-${randomUUID()}`;
  const result = await db.query(
    `insert into bliss_file_objects(id, workspace_id, record_id, provider, storage_key, public_url, file_name, mime_type, size_bytes, checksum, client_facing, created_by)
     values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     returning id, workspace_id as "workspaceId", record_id as "recordId", provider, storage_key as "storageKey", public_url as "publicUrl", file_name as "fileName", mime_type as "mimeType", size_bytes as "sizeBytes", checksum, client_facing as "clientFacing", created_at as "createdAt"`,
    [
      id,
      input.workspaceId,
      input.recordId || null,
      input.provider,
      input.storageKey,
      input.publicUrl || null,
      input.fileName,
      input.mimeType || null,
      input.sizeBytes || null,
      input.checksum || null,
      Boolean(input.clientFacing),
      input.actorEmail || null
    ]
  );
  await recordAudit(input.workspaceId, input.actorEmail, "FILE_STORED", "files", id, { provider: input.provider, recordId: input.recordId });
  return result.rows[0];
}

export async function revokeFileObject(workspaceId: string, fileId: string, actorEmail?: string) {
  if (!(await ensureProductionSchema())) return false;
  const db = getPool();
  if (!db) return false;
  const result = await db.query(
    `update bliss_file_objects set deleted_at = now()
     where workspace_id = $1 and id = $2 and deleted_at is null`,
    [workspaceId, fileId]
  );
  await recordAudit(workspaceId, actorEmail, "FILE_REVOKED", "files", fileId, {});
  await publishRealtimeEvent(workspaceId, "FILE_REVOKED", "files", fileId, actorEmail, {});
  return (result.rowCount ?? 0) > 0;
}

export async function listFileObjects(workspaceId: string) {
  if (!(await ensureProductionSchema())) return [];
  const db = getPool();
  if (!db) return [];
  const result = await db.query(
    `select id, workspace_id as "workspaceId", record_id as "recordId", provider, storage_key as "storageKey", public_url as "publicUrl",
      file_name as "fileName", mime_type as "mimeType", size_bytes as "sizeBytes", checksum, client_facing as "clientFacing",
      created_by as "createdBy", created_at as "createdAt", deleted_at as "deletedAt"
     from bliss_file_objects where workspace_id = $1 order by created_at desc limit 200`,
    [workspaceId]
  );
  return result.rows;
}

export async function listDevices(workspaceId: string) {
  if (!(await ensureProductionSchema())) return [];
  const db = getPool();
  if (!db) return [];
  const result = await db.query(
    `select id, workspace_id as "workspaceId", name, platform, app_version as "appVersion", last_seen_at as "lastSeenAt", revoked_at as "revokedAt", created_at as "createdAt"
     from bliss_sync_devices where workspace_id = $1 order by coalesce(last_seen_at, created_at) desc`,
    [workspaceId]
  );
  return result.rows;
}

export async function listConflicts(workspaceId: string) {
  if (!(await ensureProductionSchema())) return [];
  const db = getPool();
  if (!db) return [];
  const result = await db.query(
    `select id, workspace_id as "workspaceId", entity, entity_id as "entityId", local_revision as "localRevision", remote_revision as "remoteRevision", payload, resolution, resolved_by as "resolvedBy", resolved_at as "resolvedAt", created_at as "createdAt"
     from bliss_sync_conflicts where workspace_id = $1 order by created_at desc limit 100`,
    [workspaceId]
  );
  return result.rows;
}

export async function resolveConflict(workspaceId: string, conflictId: string, resolution: string, actorEmail?: string) {
  if (!(await ensureProductionSchema())) return null;
  const db = getPool();
  if (!db) return null;
  const result = await db.query(
    `update bliss_sync_conflicts set resolution = $3, resolved_by = $4, resolved_at = now()
     where workspace_id = $1 and id = $2
     returning id, workspace_id as "workspaceId", entity, entity_id as "entityId", resolution, resolved_by as "resolvedBy", resolved_at as "resolvedAt"`,
    [workspaceId, conflictId, resolution, actorEmail || null]
  );
  await recordAudit(workspaceId, actorEmail, "CONFLICT_RESOLVED", "sync_conflict", conflictId, { resolution });
  return result.rows[0] ?? null;
}

export async function recordAudit(workspaceId: string, actorEmail: string | undefined, action: string, entity?: string, entityId?: string, metadata?: Record<string, unknown>) {
  const db = getPool();
  if (!db) return null;
  await ensureProductionSchema();
  const id = `audit-${randomUUID()}`;
  await db.query(
    `insert into bliss_audit_log(id, workspace_id, actor_email, action, entity, entity_id, metadata)
     values($1,$2,$3,$4,$5,$6,$7)`,
    [id, workspaceId, actorEmail || null, action, entity || null, entityId || null, JSON.stringify(metadata || {})]
  );
  return id;
}

export async function listAuditLog(workspaceId: string, limit = 100) {
  if (!(await ensureProductionSchema())) return [];
  const db = getPool();
  if (!db) return [];
  const result = await db.query(
    `select id, workspace_id as "workspaceId", actor_email as "actorEmail", action, entity, entity_id as "entityId", metadata, created_at as "createdAt"
     from bliss_audit_log where workspace_id = $1 order by created_at desc limit $2`,
    [workspaceId, Math.min(Math.max(limit, 1), 250)]
  );
  return result.rows;
}

export async function queueNotification(input: {
  workspaceId: string;
  channel?: string;
  recipientEmail?: string;
  subject: string;
  body: string;
  metadata?: Record<string, unknown>;
}) {
  if (!(await ensureProductionSchema())) return null;
  const db = getPool();
  if (!db) return null;
  await upsertWorkspace({ id: input.workspaceId, name: input.workspaceId });
  const id = `notification-${randomUUID()}`;
  const result = await db.query(
    `insert into bliss_notifications(id, workspace_id, channel, recipient_email, subject, body, metadata)
     values($1,$2,$3,$4,$5,$6,$7)
     returning id, workspace_id as "workspaceId", channel, recipient_email as "recipientEmail", subject, body, status, metadata, sent_at as "sentAt", read_at as "readAt", created_at as "createdAt"`,
    [id, input.workspaceId, input.channel || "in_app", input.recipientEmail || null, input.subject, input.body, JSON.stringify(input.metadata || {})]
  );
  await publishRealtimeEvent(input.workspaceId, "NOTIFICATION_QUEUED", "notification", id, input.recipientEmail, { channel: input.channel || "in_app" });
  return result.rows[0];
}

export async function listNotifications(workspaceId: string) {
  if (!(await ensureProductionSchema())) return [];
  const db = getPool();
  if (!db) return [];
  const result = await db.query(
    `select id, workspace_id as "workspaceId", channel, recipient_email as "recipientEmail", subject, body, status, metadata, sent_at as "sentAt", read_at as "readAt", created_at as "createdAt"
     from bliss_notifications where workspace_id = $1 order by created_at desc limit 100`,
    [workspaceId]
  );
  return result.rows;
}

export async function publishRealtimeEvent(workspaceId: string, eventType: string, entity?: string, entityId?: string, actorEmail?: string, payload?: Record<string, unknown>) {
  if (!(await ensureProductionSchema())) return null;
  const db = getPool();
  if (!db) return null;
  const id = `event-${randomUUID()}`;
  const result = await db.query(
    `insert into bliss_realtime_events(id, workspace_id, event_type, entity, entity_id, actor_email, payload)
     values($1,$2,$3,$4,$5,$6,$7)
     returning id, workspace_id as "workspaceId", event_type as "eventType", entity, entity_id as "entityId", actor_email as "actorEmail", payload, created_at as "createdAt"`,
    [id, workspaceId, eventType, entity || null, entityId || null, actorEmail || null, JSON.stringify(payload || {})]
  );
  return result.rows[0];
}

export async function listRealtimeEvents(workspaceId: string, since?: string) {
  if (!(await ensureProductionSchema())) return [];
  const db = getPool();
  if (!db) return [];
  const result = await db.query(
    `select id, workspace_id as "workspaceId", event_type as "eventType", entity, entity_id as "entityId", actor_email as "actorEmail", payload, created_at as "createdAt"
     from bliss_realtime_events
     where workspace_id = $1 and ($2::timestamptz is null or created_at > $2::timestamptz)
     order by created_at desc limit 100`,
    [workspaceId, since || null]
  );
  return result.rows;
}

export async function billingStatus(workspaceId: string) {
  if (!(await ensureProductionSchema())) return null;
  const db = getPool();
  if (!db) return null;
  await upsertWorkspace({ id: workspaceId, name: workspaceId });
  const result = await db.query(
    `insert into bliss_billing_accounts(workspace_id)
     values($1)
     on conflict(workspace_id) do update set workspace_id = excluded.workspace_id
     returning workspace_id as "workspaceId", provider, customer_id as "customerId", subscription_id as "subscriptionId", plan, status, current_period_end as "currentPeriodEnd", updated_at as "updatedAt"`,
    [workspaceId]
  );
  return result.rows[0];
}

export async function updateBillingStatus(workspaceId: string, patch: Record<string, unknown>) {
  if (!(await ensureProductionSchema())) return null;
  const db = getPool();
  if (!db) return null;
  await upsertWorkspace({ id: workspaceId, name: workspaceId });
  const result = await db.query(
    `insert into bliss_billing_accounts(workspace_id, provider, customer_id, subscription_id, plan, status, current_period_end)
     values($1,$2,$3,$4,$5,$6,$7)
     on conflict(workspace_id) do update set
       provider = excluded.provider,
       customer_id = coalesce(excluded.customer_id, bliss_billing_accounts.customer_id),
       subscription_id = coalesce(excluded.subscription_id, bliss_billing_accounts.subscription_id),
       plan = excluded.plan,
       status = excluded.status,
       current_period_end = excluded.current_period_end,
       updated_at = now()
     returning workspace_id as "workspaceId", provider, customer_id as "customerId", subscription_id as "subscriptionId", plan, status, current_period_end as "currentPeriodEnd", updated_at as "updatedAt"`,
    [
      workspaceId,
      String(patch.provider || "stripe"),
      patch.customerId || null,
      patch.subscriptionId || null,
      String(patch.plan || "professional"),
      String(patch.status || "active"),
      patch.currentPeriodEnd || null
    ]
  );
  await recordAudit(workspaceId, undefined, "BILLING_STATUS_UPDATED", "billing", workspaceId, patch);
  return result.rows[0];
}

export async function listProductionSnapshot(workspaceId: string) {
  const entries = await Promise.all(ENTITY_NAMES.map(async (entity) => [entity, await listRecords(workspaceId, entity)] as const));
  return Object.fromEntries(entries);
}
