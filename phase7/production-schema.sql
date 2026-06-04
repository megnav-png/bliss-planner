-- Bliss Planner production data schema.
-- Apply to the app Postgres database before paid launch. The app also runs
-- this schema defensively from src/lib/server/productionStore.ts.

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
