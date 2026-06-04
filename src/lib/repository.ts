import { AppState } from "./types";
import { seedState } from "./fakeData";
import { loadState, saveState } from "./storage";
import {
  clearSyncedStore,
  exportSyncPackage as exportSyncStatePackage,
  getSyncDiagnostics,
  importSyncPackage as importSyncStatePackage,
  recordSyncEvent,
  runSync,
  setPlannerId,
  setSyncEndpoint,
  SyncDiagnostics,
  SyncImportResult,
  SyncRunSummary
} from "./syncEngine";

const PROFILE_ENTITY_ID = "planner-profile";
const SETTINGS_ENTITY_ID = "planner-settings";
const META_ENTITY_ID = "planner-meta";

export type PlannerStatePatch = {
  profile?: AppState["profile"];
  settings?: AppState["settings"];
  activeWeddingId?: string;
  onboarded?: boolean;
};

export type GuestTargetPayload = {
  weddingId: string;
  guestTarget: number;
};

export type OnboardingPayload = {
  profile: AppState["profile"];
  settings: AppState["settings"];
};

type PlannerStateResult = {
  ok: boolean;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isChanged<T>(left: T, right: T): boolean {
  return JSON.stringify(left) !== JSON.stringify(right);
}

function ensureState(value: AppState | null | undefined): AppState {
  if (!value) {
    return { ...seedState };
  }

  return {
    ...value,
    profile: value.profile,
    settings: value.settings,
    weddings: value.weddings ?? [],
    tasks: value.tasks ?? [],
    activeWeddingId: value.activeWeddingId ?? seedState.activeWeddingId,
    onboarded: value.onboarded ?? seedState.onboarded
  };
}

function scaleGuestGroups(wedding: AppState["weddings"][number], nextTarget: number) {
  const baseTotal = wedding.guestGroups.reduce((sum, item) => sum + item.total, 0) || 1;
  const scale = nextTarget / baseTotal;

  return {
    ...wedding,
    guestTarget: nextTarget,
    guestGroups: wedding.guestGroups.map((group) => ({
      ...group,
      roomNeed: Math.max(group.roomNeed, Math.ceil(group.total * scale * 0.45))
    }))
  };
}

function plannerIdentityFromProfile(profile: AppState["profile"]): string {
  return profile.email?.trim() || `${profile.name.trim().toLowerCase().replace(/\s+/g, ".")}-${Date.now()}`;
}

async function readState(): Promise<AppState> {
  const loaded = loadState<AppState>(seedState);
  return ensureState(loaded);
}

async function writeState(state: AppState): Promise<void> {
  saveState(state);
  await delay(0);
}

function recordPlannerPatchChanges(previous: AppState, next: AppState) {
  if (isChanged(next.profile, previous.profile)) {
    recordSyncEvent({
      entity: "planner_profile",
      entityId: PROFILE_ENTITY_ID,
      operation: "UPSERT",
      payload: next.profile
    });
  }

  if (isChanged(next.settings, previous.settings)) {
    recordSyncEvent({
      entity: "planner_settings",
      entityId: SETTINGS_ENTITY_ID,
      operation: "UPSERT",
      payload: next.settings
    });
  }

  if (next.activeWeddingId !== previous.activeWeddingId || next.onboarded !== previous.onboarded) {
    recordSyncEvent({
      entity: "planner_meta",
      entityId: META_ENTITY_ID,
      operation: "UPSERT",
      payload: {
        activeWeddingId: next.activeWeddingId,
        onboarded: next.onboarded
      }
    });
  }
}

export async function getPlannerState(): Promise<AppState> {
  await delay(30);
  return readState();
}

export async function savePlannerState(nextState: AppState): Promise<PlannerStateResult> {
  await delay(40);
  await writeState(nextState);
  return { ok: true };
}

export async function patchPlannerState(patch: PlannerStatePatch): Promise<AppState> {
  const current = await readState();
  const next: AppState = {
    ...current,
    ...patch,
    profile: patch.profile ?? current.profile,
    settings: patch.settings ?? current.settings
  };

  recordPlannerPatchChanges(current, next);
  await writeState(next);
  return next;
}

export async function completeOnboarding(payload: OnboardingPayload): Promise<AppState> {
  const nextState = await patchPlannerState({
    profile: payload.profile,
    settings: payload.settings,
    onboarded: true
  });

  await setPlannerId(plannerIdentityFromProfile(payload.profile));
  return nextState;
}

export async function toggleTask(taskId: string): Promise<AppState> {
  const current = await readState();
  let changedTask: AppState["tasks"][number] | undefined;

  const nextTasks = current.tasks.map((task) => {
    if (task.id !== taskId) return task;

    changedTask = {
      ...task,
      status: task.status === "DONE" ? "TODO" : "DONE"
    };

    return changedTask;
  });

  const nextState: AppState = {
    ...current,
    tasks: nextTasks
  };

  if (changedTask) {
    recordSyncEvent({
      entity: "task",
      entityId: changedTask.id,
      operation: "UPSERT",
      payload: changedTask
    });
  }

  await writeState(nextState);
  return nextState;
}

export async function updateGuestTarget(payload: GuestTargetPayload): Promise<AppState> {
  const current = await readState();
  let changedWedding: AppState["weddings"][number] | undefined;

  const nextWeddings = current.weddings.map((wedding) => {
    if (wedding.id !== payload.weddingId) return wedding;
    changedWedding = scaleGuestGroups(wedding, payload.guestTarget);
    return changedWedding;
  });

  const nextState: AppState = {
    ...current,
    weddings: nextWeddings
  };

  if (changedWedding) {
    recordSyncEvent({
      entity: "wedding",
      entityId: changedWedding.id,
      operation: "UPSERT",
      payload: changedWedding
    });
  }

  await writeState(nextState);
  return nextState;
}

export async function setSyncMode(nextMode: AppState["settings"]["syncMode"]): Promise<AppState> {
  const current = await readState();
  const nextState: AppState = {
    ...current,
    settings: {
      ...current.settings,
      syncMode: nextMode
    }
  };

  if (nextState.settings.syncMode !== current.settings.syncMode) {
    recordSyncEvent({
      entity: "planner_settings",
      entityId: SETTINGS_ENTITY_ID,
      operation: "UPSERT",
      payload: {
        syncMode: nextState.settings.syncMode
      }
    });
  }

  await writeState(nextState);
  return nextState;
}

export async function setActiveWedding(activeWeddingId: string): Promise<AppState> {
  const current = await readState();
  const nextState: AppState = {
    ...current,
    activeWeddingId
  };

  if (nextState.activeWeddingId !== current.activeWeddingId) {
    recordSyncEvent({
      entity: "planner_meta",
      entityId: META_ENTITY_ID,
      operation: "UPSERT",
      payload: {
        activeWeddingId: nextState.activeWeddingId,
        onboarded: nextState.onboarded
      }
    });
  }

  await writeState(nextState);
  return nextState;
}

export async function runPlannerSync(): Promise<SyncRunSummary> {
  const current = await readState();
  const result = await runSync(current, current.settings.syncMode);

  if (result.updatedState) {
    await writeState(result.updatedState);
  }

  return result;
}

export async function setSyncEndpointUrl(endpoint: string | undefined): Promise<SyncDiagnostics> {
  return setSyncEndpoint(endpoint);
}

export async function setPlannerIdentity(plannerId: string | undefined): Promise<SyncDiagnostics> {
  return setPlannerId(plannerId);
}

export async function getPlannerSyncDiagnostics(): Promise<SyncDiagnostics> {
  return getSyncDiagnostics();
}

export async function exportPlannerSyncPackage(): Promise<string> {
  const current = await readState();
  return exportSyncStatePackage(current);
}

export async function importPlannerSyncPackage(raw: string): Promise<SyncImportResult> {
  const result = importSyncStatePackage(raw);

  if (!result.ok || !result.state) {
    return result;
  }

  await writeState(result.state);

  return {
    ok: true,
    state: result.state
  };
}

export async function clearPlannerSyncState(): Promise<SyncDiagnostics> {
  clearSyncedStore();
  return getSyncDiagnostics();
}

export async function resetPlannerState(): Promise<AppState> {
  const nextState: AppState = {
    ...seedState
  };

  await writeState(nextState);
  clearSyncedStore();
  return nextState;
}
