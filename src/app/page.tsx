"use client";

import Dashboard from "@/components/Dashboard";
import OnboardingWizard from "@/components/OnboardingWizard";
import {
  useClearPlannerSyncState,
  useCompleteOnboarding,
  useExportSyncPackage,
  useImportSyncPackage,
  usePlannerState,
  useRunPlannerSync,
  useSetActiveWedding,
  useSetPlannerIdentity,
  useSetSyncEndpoint,
  useSetSyncMode,
  useResetPlannerState,
  useSyncDiagnostics,
  useToggleTask,
  useUpdateGuestTarget
} from "@/lib/queries";

export default function HomePage() {
  const { data: state, isLoading, isError, refetch } = usePlannerState();
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
  const resetPlannerStateMutation = useResetPlannerState();

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

  if (!state.onboarded) {
    return (
      <OnboardingWizard
        seedProfile={state.profile}
        seedSettings={state.settings}
        onComplete={(payload) => {
          void completeOnboardingMutation.mutateAsync(payload);
        }}
      />
    );
  }

  return (
    <Dashboard
      state={state}
      activeWeddingId={state.activeWeddingId}
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
      onResetWorkspace={() => {
        void resetPlannerStateMutation.mutateAsync();
      }}
      syncError={
        importPackageMutation.error?.message ||
        (runSyncMutation.error instanceof Error ? runSyncMutation.error.message : undefined)
      }
      isLoadingTasks={toggleTaskMutation.isPending || updateGuestTargetMutation.isPending}
    />
  );
}
