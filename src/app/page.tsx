"use client";

import { useState } from "react";
import Dashboard from "@/components/Dashboard";
import OnboardingWizard from "@/components/OnboardingWizard";
import {
  useClearPlannerSyncState,
  useCompleteOnboarding,
  useExportSyncPackage,
  useImportSyncPackage,
  usePlannerState,
  usePlannerAuthStatus,
  useRunPlannerSync,
  useSetActiveWedding,
  useSetPlannerIdentity,
  useSetSyncEndpoint,
  useSetSyncMode,
  useDeleteClientApproval,
  useDeleteCulturalChecklistItem,
  useDeleteDestination,
  useDeleteVendor,
  useDeleteVenue,
  useDeleteRelayWorkspace,
  useResetPlannerState,
  useRevokeCurrentDevice,
  useStartDevicePairing,
  useSyncDiagnostics,
  useToggleTask,
  useUpdateGuestTarget,
  useUpsertClientApproval,
  useUpsertCulturalChecklistItem,
  useUpsertDestination,
  useUpsertVendor,
  useUpsertVenue
} from "@/lib/queries";

export default function HomePage() {
  const { data: state, isLoading, isError, refetch } = usePlannerState();
  const authStatusQuery = usePlannerAuthStatus();
  const [localStateOverride, setLocalStateOverride] = useState<typeof state | null>(null);
  const completeOnboardingMutation = useCompleteOnboarding();
  const toggleTaskMutation = useToggleTask();
  const updateGuestTargetMutation = useUpdateGuestTarget();
  const setSyncModeMutation = useSetSyncMode();
  const setActiveWeddingMutation = useSetActiveWedding();
  const syncDiagnosticsQuery = useSyncDiagnostics();
  const runSyncMutation = useRunPlannerSync();
  const setSyncEndpointMutation = useSetSyncEndpoint();
  const setPlannerIdentityMutation = useSetPlannerIdentity();
  const exportPackageMutation = useExportSyncPackage();
  const importPackageMutation = useImportSyncPackage();
  const clearSyncMutation = useClearPlannerSyncState();
  const startDevicePairingMutation = useStartDevicePairing();
  const deleteRelayWorkspaceMutation = useDeleteRelayWorkspace();
  const revokeCurrentDeviceMutation = useRevokeCurrentDevice();
  const resetPlannerStateMutation = useResetPlannerState();
  const upsertVendorMutation = useUpsertVendor();
  const deleteVendorMutation = useDeleteVendor();
  const upsertVenueMutation = useUpsertVenue();
  const deleteVenueMutation = useDeleteVenue();
  const upsertDestinationMutation = useUpsertDestination();
  const deleteDestinationMutation = useDeleteDestination();
  const upsertCultureMutation = useUpsertCulturalChecklistItem();
  const deleteCultureMutation = useDeleteCulturalChecklistItem();
  const upsertApprovalMutation = useUpsertClientApproval();
  const deleteApprovalMutation = useDeleteClientApproval();

  if (isLoading) {
    return (
      <main className="dashboard-shell">
        <section className="panel">
          <h1>Loading workspace…</h1>
        </section>
      </main>
    );
  }
  if (isError || !state) {
    return (
      <main className="dashboard-shell">
        <section className="panel">
          <h1>Could not load workspace</h1>
          <p>Storage may be unavailable. Reload or retry sync.</p>
          <button onClick={() => void refetch()} className="btn btn-primary">
            Retry
          </button>
        </section>
      </main>
    );
  }

  const plannerState = localStateOverride ?? state;

  if (!plannerState.onboarded) {
    return (
      <OnboardingWizard
        seedProfile={plannerState.profile}
        seedSettings={plannerState.settings}
        onComplete={(payload) => {
          void completeOnboardingMutation
            .mutateAsync(payload)
            .then((nextState) => {
              setLocalStateOverride(nextState);
              return refetch();
            })
            .then(() => setLocalStateOverride(null));
        }}
      />
    );
  }

  return (
    <Dashboard
      state={plannerState}
      authStatus={authStatusQuery.data}
      activeWeddingId={plannerState.activeWeddingId}
      syncDiagnostics={syncDiagnosticsQuery.data}
      syncSummary={runSyncMutation.data}
      onGuestTargetChange={(weddingId, guestTarget) => {
        void updateGuestTargetMutation.mutateAsync({ weddingId, guestTarget });
      }}
      onTaskStatusChange={(taskId) => {
        void toggleTaskMutation.mutateAsync(taskId);
      }}
      onSyncModeChange={(nextMode) => {
        void setSyncModeMutation.mutateAsync(nextMode);
      }}
      onActiveWeddingChange={(id) => {
        void setActiveWeddingMutation.mutateAsync(id);
      }}
      onRunSync={() => {
        void runSyncMutation.mutateAsync();
      }}
      syncIsRunning={runSyncMutation.isPending}
      onSetSyncEndpoint={(endpoint) => {
        void setSyncEndpointMutation.mutateAsync(endpoint);
      }}
      onSetPlannerId={(plannerId) => {
        void setPlannerIdentityMutation.mutateAsync(plannerId);
      }}
      onExportPackage={async () => {
        const payload = await exportPackageMutation.mutateAsync();
        return payload;
      }}
      onImportPackage={(raw) => {
        return importPackageMutation.mutateAsync(raw);
      }}
      importPackageError={importPackageMutation.error}
      onClearSync={() => {
        void clearSyncMutation.mutateAsync();
      }}
      onStartDevicePairing={() => startDevicePairingMutation.mutateAsync()}
      pairingResult={startDevicePairingMutation.data}
      pairingError={startDevicePairingMutation.error}
      onDeleteRelayWorkspace={() => deleteRelayWorkspaceMutation.mutateAsync()}
      deleteRelayResult={deleteRelayWorkspaceMutation.data}
      deleteRelayError={deleteRelayWorkspaceMutation.error}
      onRevokeCurrentDevice={() => revokeCurrentDeviceMutation.mutateAsync()}
      revokeDeviceResult={revokeCurrentDeviceMutation.data}
      revokeDeviceError={revokeCurrentDeviceMutation.error}
      onResetWorkspace={() => {
        setLocalStateOverride(null);
        void resetPlannerStateMutation.mutateAsync();
      }}
      onUpsertVendor={(draft) => {
        void upsertVendorMutation.mutateAsync(draft);
      }}
      onDeleteVendor={(id) => {
        void deleteVendorMutation.mutateAsync(id);
      }}
      onUpsertVenue={(draft) => {
        void upsertVenueMutation.mutateAsync(draft);
      }}
      onDeleteVenue={(id) => {
        void deleteVenueMutation.mutateAsync(id);
      }}
      onUpsertDestination={(draft) => {
        void upsertDestinationMutation.mutateAsync(draft);
      }}
      onDeleteDestination={(id) => {
        void deleteDestinationMutation.mutateAsync(id);
      }}
      onUpsertCulturalChecklistItem={(draft) => {
        void upsertCultureMutation.mutateAsync(draft);
      }}
      onDeleteCulturalChecklistItem={(payload) => {
        void deleteCultureMutation.mutateAsync(payload);
      }}
      onUpsertClientApproval={(draft) => {
        void upsertApprovalMutation.mutateAsync(draft);
      }}
      onDeleteClientApproval={(id) => {
        void deleteApprovalMutation.mutateAsync(id);
      }}
      syncError={
        importPackageMutation.error?.message ||
        (runSyncMutation.error instanceof Error ? runSyncMutation.error.message : undefined)
      }
      isLoadingTasks={toggleTaskMutation.isPending || updateGuestTargetMutation.isPending}
    />
  );
}
