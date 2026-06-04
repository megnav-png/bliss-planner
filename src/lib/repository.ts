import { AppState, ClientApproval, CulturalChecklistItem, DestinationProfile, Vendor, Venue } from "./types";
import { seedState } from "./fakeData";
import { loadPersistedState, saveState } from "./storage";
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

export type VendorDraft = Omit<Vendor, "id" | "weddingId" | "linkedTaskIds"> & {
  id?: string;
  weddingId: string;
  linkedTaskIds?: string[];
};

export type VenueDraft = Omit<Venue, "id" | "weddingId" | "linkedTaskIds"> & {
  id?: string;
  weddingId: string;
  linkedTaskIds?: string[];
};

export type DestinationDraft = Omit<DestinationProfile, "id" | "weddingId" | "linkedTaskIds"> & {
  id?: string;
  weddingId: string;
  linkedTaskIds?: string[];
};

export type CulturalChecklistDraft = Omit<CulturalChecklistItem, "id" | "linkedTaskIds"> & {
  id?: string;
  weddingId: string;
  linkedTaskIds?: string[];
};

export type ClientApprovalDraft = Omit<ClientApproval, "id" | "linkedTaskIds"> & {
  id?: string;
  linkedTaskIds?: string[];
};

type PlannerStateResult = {
  ok: boolean;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

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
    vendors: value.vendors ?? [],
    venues: value.venues ?? [],
    destinations: value.destinations ?? [],
    clientApprovals: value.clientApprovals ?? [],
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
  const loaded = await loadPersistedState<AppState>(seedState);
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

export async function upsertVendor(draft: VendorDraft): Promise<AppState> {
  const current = await readState();
  const vendor: Vendor = {
    ...draft,
    id: draft.id || createId("vendor"),
    linkedTaskIds: draft.linkedTaskIds ?? []
  };
  const exists = current.vendors.some((item) => item.id === vendor.id);
  const nextState = {
    ...current,
    vendors: exists
      ? current.vendors.map((item) => (item.id === vendor.id ? vendor : item))
      : [...current.vendors, vendor]
  };
  recordSyncEvent({ entity: "vendor", entityId: vendor.id, operation: "UPSERT", payload: vendor });
  await writeState(nextState);
  return nextState;
}

export async function deleteVendor(vendorId: string): Promise<AppState> {
  const current = await readState();
  const nextState = { ...current, vendors: current.vendors.filter((item) => item.id !== vendorId) };
  recordSyncEvent({ entity: "vendor", entityId: vendorId, operation: "DELETE", payload: { id: vendorId } });
  await writeState(nextState);
  return nextState;
}

export async function upsertVenue(draft: VenueDraft): Promise<AppState> {
  const current = await readState();
  const venue: Venue = {
    ...draft,
    id: draft.id || createId("venue"),
    linkedTaskIds: draft.linkedTaskIds ?? []
  };
  const exists = current.venues.some((item) => item.id === venue.id);
  const nextState = {
    ...current,
    venues: exists
      ? current.venues.map((item) => (item.id === venue.id ? venue : item))
      : [...current.venues, venue]
  };
  recordSyncEvent({ entity: "venue", entityId: venue.id, operation: "UPSERT", payload: venue });
  await writeState(nextState);
  return nextState;
}

export async function deleteVenue(venueId: string): Promise<AppState> {
  const current = await readState();
  const nextState = { ...current, venues: current.venues.filter((item) => item.id !== venueId) };
  recordSyncEvent({ entity: "venue", entityId: venueId, operation: "DELETE", payload: { id: venueId } });
  await writeState(nextState);
  return nextState;
}

export async function upsertDestination(draft: DestinationDraft): Promise<AppState> {
  const current = await readState();
  const destination: DestinationProfile = {
    ...draft,
    id: draft.id || createId("destination"),
    linkedTaskIds: draft.linkedTaskIds ?? []
  };
  const exists = current.destinations.some((item) => item.id === destination.id);
  const nextState = {
    ...current,
    destinations: exists
      ? current.destinations.map((item) => (item.id === destination.id ? destination : item))
      : [...current.destinations, destination]
  };
  recordSyncEvent({ entity: "destination", entityId: destination.id, operation: "UPSERT", payload: destination });
  await writeState(nextState);
  return nextState;
}

export async function deleteDestination(destinationId: string): Promise<AppState> {
  const current = await readState();
  const nextState = { ...current, destinations: current.destinations.filter((item) => item.id !== destinationId) };
  recordSyncEvent({ entity: "destination", entityId: destinationId, operation: "DELETE", payload: { id: destinationId } });
  await writeState(nextState);
  return nextState;
}

export async function upsertCulturalChecklistItem(draft: CulturalChecklistDraft): Promise<AppState> {
  const current = await readState();
  const nextWeddings = current.weddings.map((wedding) => {
    if (wedding.id !== draft.weddingId) return wedding;
    const item: CulturalChecklistItem = {
      id: draft.id || createId("culture"),
      label: draft.label,
      culture: draft.culture,
      owner: draft.owner,
      status: draft.status,
      linkedTaskIds: draft.linkedTaskIds ?? []
    };
    const exists = wedding.culturalChecklist.some((entry) => entry.id === item.id);
    recordSyncEvent({ entity: "cultural_item", entityId: item.id, operation: "UPSERT", payload: { ...item, weddingId: wedding.id } });
    return {
      ...wedding,
      culturalChecklist: exists
        ? wedding.culturalChecklist.map((entry) => (entry.id === item.id ? item : entry))
        : [...wedding.culturalChecklist, item]
    };
  });
  const nextState = { ...current, weddings: nextWeddings };
  await writeState(nextState);
  return nextState;
}

export async function deleteCulturalChecklistItem(payload: { weddingId: string; itemId: string }): Promise<AppState> {
  const current = await readState();
  const nextState = {
    ...current,
    weddings: current.weddings.map((wedding) =>
      wedding.id === payload.weddingId
        ? { ...wedding, culturalChecklist: wedding.culturalChecklist.filter((item) => item.id !== payload.itemId) }
        : wedding
    )
  };
  recordSyncEvent({ entity: "cultural_item", entityId: payload.itemId, operation: "DELETE", payload });
  await writeState(nextState);
  return nextState;
}

export async function upsertClientApproval(draft: ClientApprovalDraft): Promise<AppState> {
  const current = await readState();
  const approval: ClientApproval = {
    ...draft,
    id: draft.id || createId("approval"),
    linkedTaskIds: draft.linkedTaskIds ?? []
  };
  const exists = current.clientApprovals.some((item) => item.id === approval.id);
  const nextState = {
    ...current,
    clientApprovals: exists
      ? current.clientApprovals.map((item) => (item.id === approval.id ? approval : item))
      : [...current.clientApprovals, approval],
    weddings: current.weddings.map((wedding) =>
      wedding.id === approval.weddingId
        ? {
            ...wedding,
            clientStatus: {
              ...wedding.clientStatus,
              approvalState: approval.state,
              pendingDecisions: Array.from(new Set([...wedding.clientStatus.pendingDecisions, approval.title]))
            }
          }
        : wedding
    )
  };
  recordSyncEvent({ entity: "client_approval", entityId: approval.id, operation: "UPSERT", payload: approval });
  await writeState(nextState);
  return nextState;
}

export async function deleteClientApproval(approvalId: string): Promise<AppState> {
  const current = await readState();
  const nextState = { ...current, clientApprovals: current.clientApprovals.filter((item) => item.id !== approvalId) };
  recordSyncEvent({ entity: "client_approval", entityId: approvalId, operation: "DELETE", payload: { id: approvalId } });
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
