import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  completeOnboarding,
  deleteClientApproval,
  deleteCulturalChecklistItem,
  deleteDestination,
  deleteVendor,
  deleteVenue,
  exportPlannerSyncPackage,
  getPlannerState,
  getPlannerSyncDiagnostics,
  importPlannerSyncPackage,
  OnboardingPayload,
  resetPlannerState,
  runPlannerSync,
  setActiveWedding,
  setPlannerIdentity,
  setSyncEndpointUrl,
  setSyncMode,
  clearPlannerSyncState,
  toggleTask,
  updateGuestTarget,
  upsertClientApproval,
  upsertCulturalChecklistItem,
  upsertDestination,
  upsertVendor,
  upsertVenue,
  ClientApprovalDraft,
  CulturalChecklistDraft,
  DestinationDraft,
  VendorDraft,
  VenueDraft
} from "./repository";
import { AppState } from "./types";
import type { SyncDiagnostics, SyncRunSummary } from "./syncEngine";

export const plannerQueryKeys = {
  all: ["planner"] as const,
  state: () => ["planner", "state"] as const,
  sync: {
    all: ["planner", "sync"] as const,
    diagnostics: () => ["planner", "sync", "diagnostics"] as const
  }
};

export function usePlannerState() {
  return useQuery({
    queryKey: plannerQueryKeys.state(),
    queryFn: getPlannerState,
    staleTime: 3_000
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: OnboardingPayload) => completeOnboarding(payload),
    onSuccess: (nextState) => {
      queryClient.setQueryData(plannerQueryKeys.state(), nextState);
      void queryClient.invalidateQueries({ queryKey: plannerQueryKeys.state() });
      void queryClient.invalidateQueries({ queryKey: plannerQueryKeys.sync.diagnostics() });
    }
  });
}

export function useToggleTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => toggleTask(taskId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: plannerQueryKeys.state() });
    }
  });
}

export function useUpdateGuestTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ weddingId, guestTarget }: { weddingId: string; guestTarget: number }) =>
      updateGuestTarget({ weddingId, guestTarget }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: plannerQueryKeys.state() });
    }
  });
}

export function useSetSyncMode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (nextMode: AppState["settings"]["syncMode"]) => setSyncMode(nextMode),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: plannerQueryKeys.state() });
    }
  });
}

export function useSetActiveWedding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => setActiveWedding(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: plannerQueryKeys.state() });
    }
  });
}

function useStateMutation<TInput>(mutationFn: (input: TInput) => Promise<AppState>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (nextState) => {
      queryClient.setQueryData(plannerQueryKeys.state(), nextState);
      void queryClient.invalidateQueries({ queryKey: plannerQueryKeys.sync.diagnostics() });
    }
  });
}

export function useUpsertVendor() {
  return useStateMutation<VendorDraft>(upsertVendor);
}

export function useDeleteVendor() {
  return useStateMutation<string>(deleteVendor);
}

export function useUpsertVenue() {
  return useStateMutation<VenueDraft>(upsertVenue);
}

export function useDeleteVenue() {
  return useStateMutation<string>(deleteVenue);
}

export function useUpsertDestination() {
  return useStateMutation<DestinationDraft>(upsertDestination);
}

export function useDeleteDestination() {
  return useStateMutation<string>(deleteDestination);
}

export function useUpsertCulturalChecklistItem() {
  return useStateMutation<CulturalChecklistDraft>(upsertCulturalChecklistItem);
}

export function useDeleteCulturalChecklistItem() {
  return useStateMutation<{ weddingId: string; itemId: string }>(deleteCulturalChecklistItem);
}

export function useUpsertClientApproval() {
  return useStateMutation<ClientApprovalDraft>(upsertClientApproval);
}

export function useDeleteClientApproval() {
  return useStateMutation<string>(deleteClientApproval);
}

export function useSyncDiagnostics() {
  return useQuery({
    queryKey: plannerQueryKeys.sync.diagnostics(),
    queryFn: getPlannerSyncDiagnostics,
    staleTime: 5_000
  });
}

export function useSetSyncEndpoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (endpoint: string | undefined) => setSyncEndpointUrl(endpoint),
    onSuccess: (diagnostics: SyncDiagnostics) => {
      queryClient.setQueryData(plannerQueryKeys.sync.diagnostics(), diagnostics);
    }
  });
}

export function useSetPlannerIdentity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (plannerId: string | undefined) => setPlannerIdentity(plannerId),
    onSuccess: (diagnostics: SyncDiagnostics) => {
      queryClient.setQueryData(plannerQueryKeys.sync.diagnostics(), diagnostics);
    }
  });
}

export function useRunPlannerSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => runPlannerSync(),
    onSuccess: (result: SyncRunSummary) => {
      if (result.updatedState) {
        queryClient.setQueryData(plannerQueryKeys.state(), result.updatedState);
      }
      void queryClient.invalidateQueries({ queryKey: plannerQueryKeys.sync.diagnostics() });
    }
  });
}

export function useExportSyncPackage() {
  return useMutation({
    mutationFn: () => exportPlannerSyncPackage()
  });
}

export function useImportSyncPackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (raw: string) => importPlannerSyncPackage(raw),
    onSuccess: (result) => {
      if (result.state) {
        queryClient.setQueryData(plannerQueryKeys.state(), result.state);
      }
      void queryClient.invalidateQueries({ queryKey: plannerQueryKeys.sync.diagnostics() });
    }
  });
}

export function useClearPlannerSyncState() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => clearPlannerSyncState(),
    onSuccess: (diagnostics: SyncDiagnostics) => {
      queryClient.setQueryData(plannerQueryKeys.sync.diagnostics(), diagnostics);
    }
  });
}

export function useResetPlannerState() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => resetPlannerState(),
    onSuccess: (nextState) => {
      queryClient.setQueryData(plannerQueryKeys.state(), nextState);
      void queryClient.invalidateQueries({ queryKey: plannerQueryKeys.sync.diagnostics() });
    }
  });
}
