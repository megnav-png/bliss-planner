import { AppState, ClientApproval, CulturalChecklistItem, DestinationProfile, PlannerSettings, PlannerProfile, Task, Vendor, Venue, Wedding } from "./types";

const SYNC_STORAGE_KEY = "wovops.phase2.sync.state";
const SYNC_PACKAGE_KEY = "wovops.phase2.sync.package";

type SyncOperation = "UPSERT" | "DELETE";
type SyncEventStatus = "PENDING" | "SYNCED" | "FAILED" | "CONFLICT";

type SyncEntity =
  | "planner_profile"
  | "planner_settings"
  | "planner_meta"
  | "wedding"
  | "task"
  | "vendor"
  | "venue"
  | "destination"
  | "cultural_item"
  | "client_approval";

interface SyncEnvelope {
  id: string;
  revision: number;
  entity: SyncEntity;
  entityId: string;
  operation: SyncOperation;
  payload: unknown;
  source: "local" | "remote";
  status: SyncEventStatus;
  createdAt: string;
}

export interface SyncEvent extends SyncEnvelope {
  source: "local" | "remote";
}

export interface SyncConflict {
  entityKey: string;
  remoteRevision: number;
  localRevision: number;
  note: string;
}

export interface SyncStore {
  deviceId: string;
  endpoint?: string;
  plannerId?: string;
  nextRevision: number;
  lastRemoteRevision: number;
  outbox: SyncEvent[];
  syncStatus: "idle" | "running" | "error";
  lastSyncAt?: string;
  lastSyncError?: string;
  entityRevisionByKey: Record<string, number>;
}

export interface SyncDiagnostics {
  deviceId: string;
  endpoint?: string;
  plannerId?: string;
  syncStatus: SyncStore["syncStatus"];
  pendingSyncs: number;
  outboxCount: number;
  lastSyncAt?: string;
  lastSyncError?: string;
  lastRemoteRevision: number;
  nextRevision: number;
}

export interface SyncRunSummary {
  status: "skipped" | "success" | "error";
  reason?: string;
  pushed: number;
  pulled: number;
  conflicts: SyncConflict[];
  pendingAfter: number;
  lastSyncAt?: string;
  updatedState?: AppState;
}

export interface SyncImportResult {
  ok: boolean;
  warning?: string;
  state?: AppState;
}

export interface DevicePairingResult {
  ok: boolean;
  workspaceId?: string;
  pairingCode?: string;
  expiresAt?: string;
  error?: string;
}

export interface DeleteRelayWorkspaceResult {
  ok: boolean;
  workspaceId?: string;
  deleted?: boolean;
  error?: string;
}

interface SyncPackageFile {
  schema: "wovops-v1";
  exportedAt: string;
  sourceDeviceId: string;
  plannerState: AppState;
  sync: {
    nextRevision: number;
    lastRemoteRevision: number;
    entityRevisionByKey: Record<string, number>;
  };
}

interface SyncPushPayload {
  deviceId: string;
  plannerId?: string;
  workspaceId?: string;
  changes: Array<{
    id: string;
    revision: number;
    entity: SyncEntity;
    entityId: string;
    operation: SyncOperation;
    payload: unknown;
    createdAt: string;
  }>;
}

interface SyncPullResponse {
  cursor: number;
  events: SyncEvent[];
}

function nowIso(): string {
  return new Date().toISOString();
}

function createDeviceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nextId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readSyncStore(): SyncStore {
  if (typeof window === "undefined") {
    return {
      deviceId: "server-device",
      nextRevision: 0,
      lastRemoteRevision: 0,
      outbox: [],
      syncStatus: "idle",
      entityRevisionByKey: {}
    };
  }

  try {
    const raw = localStorage.getItem(SYNC_STORAGE_KEY);
    if (!raw) {
      return {
        deviceId: createDeviceId(),
        nextRevision: 0,
        lastRemoteRevision: 0,
        outbox: [],
        syncStatus: "idle",
        entityRevisionByKey: {}
      };
    }
    const parsed = JSON.parse(raw) as SyncStore;
    return {
      ...parsed,
      nextRevision: Number.isFinite(parsed.nextRevision) ? parsed.nextRevision : 0,
      lastRemoteRevision: Number.isFinite(parsed.lastRemoteRevision) ? parsed.lastRemoteRevision : 0,
      syncStatus: parsed.syncStatus ?? "idle",
      outbox: Array.isArray(parsed.outbox) ? parsed.outbox : [],
      entityRevisionByKey: parsed.entityRevisionByKey && typeof parsed.entityRevisionByKey === "object" ? parsed.entityRevisionByKey : {}
    };
  } catch {
    return {
      deviceId: createDeviceId(),
      nextRevision: 0,
      lastRemoteRevision: 0,
      outbox: [],
      syncStatus: "idle",
      entityRevisionByKey: {}
    };
  }
}

function saveSyncStore(state: SyncStore) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // silent for privacy-first local persistence
  }
}

function entityKey(entity: SyncEntity, entityId: string) {
  return `${entity}:${entityId}`;
}

function syncWorkspaceId(syncStore: SyncStore) {
  return syncStore.plannerId?.trim() || syncStore.deviceId || "default-workspace";
}

export function getSyncDiagnostics(): SyncDiagnostics {
  const syncStore = readSyncStore();
  return {
    deviceId: syncStore.deviceId,
    endpoint: syncStore.endpoint,
    plannerId: syncStore.plannerId,
    syncStatus: syncStore.syncStatus,
    pendingSyncs: syncStore.outbox.filter((entry) => entry.status === "PENDING").length,
    outboxCount: syncStore.outbox.length,
    lastSyncAt: syncStore.lastSyncAt,
    lastSyncError: syncStore.lastSyncError,
    lastRemoteRevision: syncStore.lastRemoteRevision,
    nextRevision: syncStore.nextRevision
  };
}

export function setSyncEndpoint(endpoint: string | undefined): SyncDiagnostics {
  const syncStore = readSyncStore();
  const normalized = endpoint?.trim() || undefined;
  syncStore.endpoint = normalized;
  syncStore.syncStatus = "idle";
  syncStore.lastSyncError = undefined;
  saveSyncStore(syncStore);
  return getSyncDiagnostics();
}

export function setPlannerId(plannerId: string | undefined): SyncDiagnostics {
  const syncStore = readSyncStore();
  const normalized = plannerId?.trim() || undefined;
  syncStore.plannerId = normalized;
  saveSyncStore(syncStore);
  return getSyncDiagnostics();
}

export function recordSyncEvent(args: {
  entity: SyncEntity;
  entityId: string;
  operation: SyncOperation;
  payload?: unknown;
}) {
  const syncStore = readSyncStore();
  const revision = syncStore.nextRevision + 1;
  const key = entityKey(args.entity, args.entityId);

  const event: SyncEvent = {
    id: nextId(),
    revision,
    entity: args.entity,
    entityId: args.entityId,
    operation: args.operation,
    payload: args.payload ?? null,
    source: "local",
    status: "PENDING",
    createdAt: nowIso()
  };

  syncStore.nextRevision = revision;
  syncStore.entityRevisionByKey[key] = Math.max(syncStore.entityRevisionByKey[key] ?? 0, revision);
  syncStore.outbox.push(event);
  saveSyncStore(syncStore);

  return event;
}

function mergeTask(state: AppState, event: SyncEvent): AppState {
  const target = (event.payload ?? {}) as Partial<Task> & { id?: string };
  if (!target.id) return state;

  const existingIndex = state.tasks.findIndex((task) => task.id === target.id);

  if (event.operation === "DELETE") {
    return {
      ...state,
      tasks: state.tasks.filter((task) => task.id !== target.id)
    };
  }

  if (existingIndex === -1) {
    return {
      ...state,
      tasks: [...state.tasks, target as Task]
    };
  }

  const nextTask = {
    ...state.tasks[existingIndex],
    ...target
  } as Task;
  const nextTasks = [...state.tasks];
  nextTasks[existingIndex] = nextTask;
  return {
    ...state,
    tasks: nextTasks
  };
}

function mergeWedding(state: AppState, event: SyncEvent): AppState {
  const target = (event.payload ?? {}) as Partial<Wedding> & { id?: string };
  if (!target.id) return state;

  const existingIndex = state.weddings.findIndex((wedding) => wedding.id === target.id);

  if (event.operation === "DELETE") {
    return {
      ...state,
      weddings: state.weddings.filter((wedding) => wedding.id !== target.id)
    };
  }

  if (existingIndex === -1) {
    return {
      ...state,
      weddings: [...state.weddings, target as Wedding]
    };
  }

  const nextWedding = {
    ...state.weddings[existingIndex],
    ...target
  } as Wedding;
  const nextWeddings = [...state.weddings];
  nextWeddings[existingIndex] = nextWedding;
  return {
    ...state,
    weddings: nextWeddings
  };
}

function mergeArrayEntity<T extends { id: string }>(
  items: T[],
  event: SyncEvent
): T[] {
  const target = (event.payload ?? {}) as Partial<T> & { id?: string };
  if (!target.id) return items;
  if (event.operation === "DELETE") {
    return items.filter((item) => item.id !== target.id);
  }
  const existingIndex = items.findIndex((item) => item.id === target.id);
  if (existingIndex === -1) return [...items, target as T];
  const nextItems = [...items];
  nextItems[existingIndex] = { ...nextItems[existingIndex], ...target } as T;
  return nextItems;
}

function mergeCulturalItem(state: AppState, event: SyncEvent): AppState {
  const target = (event.payload ?? {}) as Partial<CulturalChecklistItem> & { id?: string; weddingId?: string; itemId?: string };
  const targetId = target.id ?? target.itemId;
  if (!targetId || !target.weddingId) return state;
  return {
    ...state,
    weddings: state.weddings.map((wedding) => {
      if (wedding.id !== target.weddingId) return wedding;
      if (event.operation === "DELETE") {
        return {
          ...wedding,
          culturalChecklist: wedding.culturalChecklist.filter((item) => item.id !== targetId)
        };
      }
      const item: CulturalChecklistItem = {
        id: targetId,
        label: target.label ?? "",
        culture: target.culture ?? "",
        owner: target.owner ?? "",
        status: target.status ?? "TODO",
        linkedTaskIds: target.linkedTaskIds ?? []
      };
      const exists = wedding.culturalChecklist.some((entry) => entry.id === targetId);
      return {
        ...wedding,
        culturalChecklist: exists
          ? wedding.culturalChecklist.map((entry) => (entry.id === targetId ? { ...entry, ...item } : entry))
          : [...wedding.culturalChecklist, item]
      };
    })
  };
}

function mergePlannerProfile(state: AppState, event: SyncEvent): AppState {
  if (event.operation === "DELETE") {
    return state;
  }

  return {
    ...state,
    profile: {
      ...state.profile,
      ...(event.payload as Partial<PlannerProfile>)
    }
  };
}

function mergePlannerSettings(state: AppState, event: SyncEvent): AppState {
  if (event.operation === "DELETE") {
    return state;
  }

  return {
    ...state,
    settings: {
      ...state.settings,
      ...(event.payload as Partial<PlannerSettings>)
    }
  };
}

function mergePlannerMeta(state: AppState, event: SyncEvent): AppState {
  const patch = event.payload as Partial<Pick<AppState, "activeWeddingId" | "onboarded">>;
  if (!patch.activeWeddingId && patch.onboarded === undefined) return state;
  return {
    ...state,
    ...patch
  };
}

function getEventPriority(event: SyncEvent) {
  const key = entityKey(event.entity, event.entityId);
  return [key, event.revision];
}

function sortByRevision(events: SyncEvent[]) {
  return [...events].sort((a, b) => {
    if (a.revision !== b.revision) return a.revision - b.revision;
    if (a.createdAt === b.createdAt) return 0;
    return a.createdAt > b.createdAt ? 1 : -1;
  });
}

function applyRemoteEvents(state: AppState, events: SyncEvent[], syncStore: SyncStore) {
  let nextState = state;
  const conflicts: SyncConflict[] = [];
  const remoteEntityRevisions = new Map<string, number>();

  sortByRevision(events).forEach((event) => {
    if (event.operation === "DELETE" && !event.payload) {
      event.payload = {};
    }

    const key = entityKey(event.entity, event.entityId);
    const localRevision = syncStore.entityRevisionByKey[key] ?? 0;
    const remoteRevision = event.revision;

    if (remoteRevision <= localRevision) {
      conflicts.push({
        entityKey: key,
        remoteRevision,
        localRevision,
        note: "Remote event is stale; local has already progressed."
      });
      event.status = "CONFLICT";
      return;
    }

    remoteEntityRevisions.set(key, remoteRevision);

    switch (event.entity) {
      case "task":
        nextState = mergeTask(nextState, event);
        break;
      case "wedding":
        nextState = mergeWedding(nextState, event);
        break;
      case "planner_profile":
        nextState = mergePlannerProfile(nextState, event);
        break;
      case "planner_settings":
        nextState = mergePlannerSettings(nextState, event);
        break;
      case "planner_meta":
        nextState = mergePlannerMeta(nextState, event);
        break;
      case "vendor":
        nextState = { ...nextState, vendors: mergeArrayEntity<Vendor>(nextState.vendors, event) };
        break;
      case "venue":
        nextState = { ...nextState, venues: mergeArrayEntity<Venue>(nextState.venues, event) };
        break;
      case "destination":
        nextState = { ...nextState, destinations: mergeArrayEntity<DestinationProfile>(nextState.destinations, event) };
        break;
      case "cultural_item":
        nextState = mergeCulturalItem(nextState, event);
        break;
      case "client_approval":
        nextState = { ...nextState, clientApprovals: mergeArrayEntity<ClientApproval>(nextState.clientApprovals, event) };
        break;
      default:
        break;
    }
  });

  remoteEntityRevisions.forEach((revision, key) => {
    syncStore.entityRevisionByKey[key] = Math.max(syncStore.entityRevisionByKey[key] ?? 0, revision);
  });

  return { state: nextState, conflicts };
}

async function pushChanges(
  syncStore: SyncStore,
  pending: SyncEvent[]
): Promise<{ status: "success" | "error"; remoteCursor?: number; error?: string; ackIds?: string[] }> {
  if (!syncStore.endpoint) {
    return {
      status: "error",
      error: "No sync endpoint configured."
    };
  }

  const payload: SyncPushPayload = {
    deviceId: syncStore.deviceId,
    plannerId: syncStore.plannerId,
    workspaceId: syncWorkspaceId(syncStore),
    changes: pending.map((event) => ({
      id: event.id,
      revision: event.revision,
      entity: event.entity,
      entityId: event.entityId,
      operation: event.operation,
      payload: event.payload,
      createdAt: event.createdAt
    }))
  };

  const res = await fetch(syncStore.endpoint.replace(/\/$/, "") + "/sync/push", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    return {
      status: "error",
      error: `Push request failed (${res.status})`
    };
  }

  const body = (await res.json().catch(() => null)) as {
    acceptedIds?: string[];
    cursor?: number;
  } | null;

  return {
    status: "success",
    remoteCursor: body?.cursor,
    ackIds: body?.acceptedIds
  };
}

async function pullChanges(syncStore: SyncStore): Promise<{ status: "success" | "error"; events?: SyncEvent[]; cursor?: number; error?: string }> {
  if (!syncStore.endpoint) {
    return {
      status: "error",
      error: "No sync endpoint configured."
    };
  }

  const query = new URLSearchParams({
    deviceId: syncStore.deviceId,
    workspaceId: syncWorkspaceId(syncStore),
    since: String(syncStore.lastRemoteRevision)
  });
  const endpoint = syncStore.endpoint.replace(/\/$/, "");
  const res = await fetch(`${endpoint}/sync/pull?${query.toString()}`, { method: "GET" });

  if (!res.ok) {
    return {
      status: "error",
      error: `Pull request failed (${res.status})`
    };
  }

  const body = (await res.json().catch(() => null)) as SyncPullResponse | null;
  if (!body || !Array.isArray(body.events)) {
    return {
      status: "error",
      error: "Invalid pull response."
    };
  }

  return {
    status: "success",
    events: body.events,
    cursor: body.cursor
  };
}

export async function runSync(currentState: AppState, syncMode: "LOCAL_ONLY" | "LOCAL_FIRST" | "OPT_IN_SYNC"): Promise<SyncRunSummary> {
  if (syncMode === "LOCAL_ONLY") {
    return {
      status: "skipped",
      reason: "Sync mode is local-only.",
      pushed: 0,
      pulled: 0,
      conflicts: [],
      pendingAfter: getSyncDiagnostics().pendingSyncs
    };
  }

  const syncStore = readSyncStore();
  if (!syncStore.endpoint) {
    return {
      status: "skipped",
      reason: "No sync endpoint configured.",
      pushed: 0,
      pulled: 0,
      conflicts: [],
      pendingAfter: syncStore.outbox.filter((entry) => entry.status === "PENDING").length
    };
  }

  syncStore.syncStatus = "running";
  syncStore.lastSyncError = undefined;
  saveSyncStore(syncStore);

  const pending = syncStore.outbox.filter((entry) => entry.status === "PENDING");
  const shouldPush = syncMode === "LOCAL_FIRST" || syncMode === "OPT_IN_SYNC";
  const shouldPull = syncMode === "LOCAL_FIRST" || syncMode === "OPT_IN_SYNC";
  let pushed = 0;
  let pulled = 0;
  const summaryConflicts: SyncConflict[] = [];
  let nextState = currentState;

  try {
    if (shouldPush && pending.length > 0) {
      const pushResult = await pushChanges(syncStore, pending);
      if (pushResult.status === "error") {
        syncStore.syncStatus = "error";
        syncStore.lastSyncError = pushResult.error;
        saveSyncStore(syncStore);
        return {
          status: "error",
          reason: pushResult.error ?? "Push failed.",
          pushed: 0,
          pulled: 0,
          conflicts: [],
          pendingAfter: pending.length,
          updatedState: nextState
        };
      }

      const ackIds = new Set(pushResult.ackIds ?? pending.map((event) => event.id));
      syncStore.outbox = syncStore.outbox.filter((entry) => {
        if (entry.status !== "PENDING") return true;
        return !ackIds.has(entry.id);
      });
      pushed = pushResult.ackIds ? Math.min(pending.length, pushResult.ackIds.length) : pending.length;
    }

    if (shouldPull) {
      const pullResult = await pullChanges(syncStore);
      if (pullResult.status === "error") {
        syncStore.syncStatus = "error";
        syncStore.lastSyncError = pullResult.error;
        saveSyncStore(syncStore);
        return {
          status: "error",
          reason: pullResult.error ?? "Pull failed.",
          pushed,
          pulled: 0,
          conflicts: [],
          pendingAfter: syncStore.outbox.filter((entry) => entry.status === "PENDING").length,
          updatedState: nextState
        };
      }

      const remoteEvents = pullResult.events ?? [];
      const applyResult = applyRemoteEvents(nextState, remoteEvents, syncStore);
      summaryConflicts.push(...applyResult.conflicts);
      nextState = applyResult.state;
      pulled = remoteEvents.length;
      syncStore.lastRemoteRevision = typeof pullResult.cursor === "number" ? pullResult.cursor : syncStore.lastRemoteRevision;
    }

    syncStore.syncStatus = "idle";
    syncStore.lastSyncAt = nowIso();
    saveSyncStore(syncStore);

    return {
      status: "success",
      reason: "Sync completed.",
      pushed,
      pulled,
      conflicts: summaryConflicts,
      pendingAfter: syncStore.outbox.filter((entry) => entry.status === "PENDING").length,
      updatedState: nextState
    };
  } catch (error) {
    syncStore.syncStatus = "error";
    syncStore.lastSyncError = error instanceof Error ? error.message : "Unexpected sync failure.";
    saveSyncStore(syncStore);
    return {
      status: "error",
      reason: syncStore.lastSyncError,
      pushed,
      pulled,
      conflicts: summaryConflicts,
      pendingAfter: pending.length,
      updatedState: nextState
    };
  } finally {
    // keep latest sync metadata available for the diagnostics UI even after completion
    saveSyncStore(syncStore);
  }
}

export function exportSyncPackage(state: AppState): string {
  const syncState = readSyncStore();
  const payload: SyncPackageFile = {
    schema: "wovops-v1",
    exportedAt: nowIso(),
    sourceDeviceId: syncState.deviceId,
    plannerState: state,
    sync: {
      nextRevision: syncState.nextRevision,
      lastRemoteRevision: syncState.lastRemoteRevision,
      entityRevisionByKey: syncState.entityRevisionByKey
    }
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SYNC_PACKAGE_KEY, JSON.stringify(payload));
  }
  return JSON.stringify(payload, null, 2);
}

export function importSyncPackage(raw: string): SyncImportResult {
  try {
    const parsed = JSON.parse(raw) as SyncPackageFile;
    if (!parsed || parsed.schema !== "wovops-v1" || !parsed.plannerState) {
      return {
        ok: false,
        warning: "Invalid package format."
      };
    }

    const syncState = readSyncStore();
    syncState.outbox = [];
    syncState.lastRemoteRevision = parsed.sync?.lastRemoteRevision ?? syncState.lastRemoteRevision;
    syncState.nextRevision = parsed.sync?.nextRevision ?? syncState.nextRevision;
    syncState.entityRevisionByKey = parsed.sync?.entityRevisionByKey ?? syncState.entityRevisionByKey;
    syncState.syncStatus = "idle";
    syncState.lastSyncError = undefined;
    syncState.lastSyncAt = nowIso();
    saveSyncStore(syncState);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SYNC_PACKAGE_KEY, JSON.stringify(parsed));
    }

    return {
      ok: true,
      state: {
        ...parsed.plannerState
      }
    };
  } catch {
    return {
      ok: false,
      warning: "Could not parse the package."
    };
  }
}

export function clearSyncedStore() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SYNC_STORAGE_KEY);
  window.localStorage.removeItem(SYNC_PACKAGE_KEY);
}

export async function startDevicePairing(deviceName = "New trusted device"): Promise<DevicePairingResult> {
  const syncStore = readSyncStore();
  if (!syncStore.endpoint) {
    return { ok: false, error: "No sync endpoint configured." };
  }

  try {
    const endpoint = syncStore.endpoint.replace(/\/$/, "");
    const response = await fetch(`${endpoint}/devices/pair/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspaceId: syncWorkspaceId(syncStore),
        deviceId: syncStore.deviceId,
        deviceName
      })
    });

    const payload = (await response.json().catch(() => null)) as DevicePairingResult | null;
    if (!response.ok || !payload?.ok) {
      return { ok: false, error: payload?.error || `Pairing request failed (${response.status}).` };
    }
    return payload;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Device pairing failed." };
  }
}

export async function deleteRelayWorkspace(): Promise<DeleteRelayWorkspaceResult> {
  const syncStore = readSyncStore();
  if (!syncStore.endpoint) {
    return { ok: false, error: "No sync endpoint configured." };
  }

  try {
    const endpoint = syncStore.endpoint.replace(/\/$/, "");
    const query = new URLSearchParams({ workspaceId: syncWorkspaceId(syncStore) });
    const response = await fetch(`${endpoint}/sync/workspace?${query.toString()}`, { method: "DELETE" });
    const payload = (await response.json().catch(() => null)) as DeleteRelayWorkspaceResult | null;
    if (!response.ok || !payload?.ok) {
      return { ok: false, error: payload?.error || `Delete request failed (${response.status}).` };
    }
    syncStore.lastRemoteRevision = 0;
    syncStore.syncStatus = "idle";
    syncStore.lastSyncError = undefined;
    saveSyncStore(syncStore);
    return payload;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not delete cloud relay data." };
  }
}
