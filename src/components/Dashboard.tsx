"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { AppState, ImpactRow, ReadinessArea } from "@/lib/types";
import type { ClientApprovalDraft, CulturalChecklistDraft, DestinationDraft, VendorDraft, VenueDraft } from "@/lib/repository";
import { SyncDiagnostics, SyncImportResult, SyncRunSummary } from "@/lib/syncEngine";
import ConnectivityBanner from "@/components/ConnectivityBanner";
import {
  SortingState,
  ColumnFiltersState,
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table";

interface DashboardProps {
  state: AppState;
  onGuestTargetChange: (weddingId: string, nextTarget: number) => void;
  onTaskStatusChange: (taskId: string) => void;
  onSyncModeChange: (nextMode: AppState["settings"]["syncMode"]) => void;
  activeWeddingId: string;
  onActiveWeddingChange: (id: string) => void;
  syncDiagnostics?: SyncDiagnostics;
  syncSummary?: SyncRunSummary;
  onRunSync: () => void;
  syncIsRunning: boolean;
  onSetSyncEndpoint: (endpoint: string | undefined) => void;
  onSetPlannerId: (plannerId: string | undefined) => void;
  onExportPackage: () => Promise<string>;
  onImportPackage: (raw: string) => Promise<SyncImportResult>;
  onClearSync: () => void;
  onResetWorkspace: () => void;
  onUpsertVendor: (draft: VendorDraft) => void;
  onDeleteVendor: (id: string) => void;
  onUpsertVenue: (draft: VenueDraft) => void;
  onDeleteVenue: (id: string) => void;
  onUpsertDestination: (draft: DestinationDraft) => void;
  onDeleteDestination: (id: string) => void;
  onUpsertCulturalChecklistItem: (draft: CulturalChecklistDraft) => void;
  onDeleteCulturalChecklistItem: (payload: { weddingId: string; itemId: string }) => void;
  onUpsertClientApproval: (draft: ClientApprovalDraft) => void;
  onDeleteClientApproval: (id: string) => void;
  syncError?: string;
  importPackageError?: unknown;
  isLoadingTasks: boolean;
}

function currency(v: number, code: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(v);
  } catch {
    return `${code} ${Math.round(v).toLocaleString()}`;
  }
}

function percent(v: number) {
  return `${v.toFixed(1)}%`;
}

function formatDate(value: string, tz = "UTC") {
  const d = new Date(value);
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: tz }).format(d);
}

function statusClass(status: string) {
  const key = status.toLowerCase().replace(/ /g, "-");
  return `status-chip status-${key}`;
}

function tableStatusClass(value: string) {
  return `pill ${value.toLowerCase()}`;
}

const readinessLabels: Record<ReadinessArea, string> = {
  VENDOR: "Vendor readiness",
  VENUE: "Venue readiness",
  DESTINATION: "Destination readiness"
};

export default function Dashboard({
  state,
  onGuestTargetChange,
  onTaskStatusChange,
  onSyncModeChange,
  activeWeddingId,
  onActiveWeddingChange,
  syncDiagnostics,
  syncSummary,
  onRunSync,
  syncIsRunning,
  onSetSyncEndpoint,
  onSetPlannerId,
  onExportPackage,
  onImportPackage,
  onClearSync,
  onResetWorkspace,
  onUpsertVendor,
  onDeleteVendor,
  onUpsertVenue,
  onDeleteVenue,
  onUpsertDestination,
  onDeleteDestination,
  onUpsertCulturalChecklistItem,
  onDeleteCulturalChecklistItem,
  onUpsertClientApproval,
  onDeleteClientApproval,
  syncError,
  importPackageError,
  isLoadingTasks
}: DashboardProps) {
  const selected = state.weddings.find((w) => w.id === activeWeddingId) ?? state.weddings[0];
  const selectedTasks = state.tasks.filter((task) => task.weddingId === selected.id);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [plannerIdInput, setPlannerIdInput] = useState("");
  const [endpointInput, setEndpointInput] = useState("");
  const [packageStatus, setPackageStatus] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [venueName, setVenueName] = useState("");
  const [destinationName, setDestinationName] = useState("");
  const [cultureLabel, setCultureLabel] = useState("");
  const [approvalTitle, setApprovalTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setPlannerIdInput(syncDiagnostics?.plannerId ?? state.profile.email);
  }, [syncDiagnostics?.plannerId, state.profile.email]);

  useEffect(() => {
    setEndpointInput(syncDiagnostics?.endpoint ?? "");
  }, [syncDiagnostics?.endpoint]);

  const planned = selected.budget.lines.reduce((sum, l) => sum + l.planned, 0);
  const spent = selected.budget.lines.reduce((sum, l) => sum + l.actual, 0);
  const openTasks = selectedTasks.filter((t) => t.status !== "DONE").length;
  const blockedCount = selectedTasks.filter((t) => t.status === "BLOCKED").length;
  const pendingGuestGap = Math.max(0, selected.guestTarget - selected.rsvpYes - selected.rsvpPending);
  const budgetVariance = planned > 0 ? ((spent / planned) - 1) * 100 : 0;
  const rsvpProgress = selected.guestTarget > 0 ? (selected.rsvpYes / selected.guestTarget) * 100 : 0;
  const taskProgress =
    selectedTasks.length > 0
      ? (selectedTasks.filter((t) => t.status === "DONE").length / selectedTasks.length) * 100
      : 0;

  const totalRoomsNeed = selected.guestGroups.reduce((sum, g) => sum + g.roomNeed, 0);
  const totalGroups = selected.guestGroups.reduce((sum, g) => sum + g.total, 0);
  const readinessGroups = (["VENDOR", "VENUE", "DESTINATION"] as ReadinessArea[]).map((area) => {
    const items = selected.readinessItems.filter((item) => item.area === area);
    const score = items.length > 0 ? Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length) : 0;
    return { area, label: readinessLabels[area], items, score };
  });
  const cultureDone = selected.culturalChecklist.filter((item) => item.status === "DONE").length;
  const cultureProgress =
    selected.culturalChecklist.length > 0 ? (cultureDone / selected.culturalChecklist.length) * 100 : 0;
  const selectedVendors = state.vendors.filter((vendor) => vendor.weddingId === selected.id);
  const selectedVenues = state.venues.filter((venue) => venue.weddingId === selected.id);
  const selectedDestinations = state.destinations.filter((destination) => destination.weddingId === selected.id);
  const selectedApprovals = state.clientApprovals.filter((approval) => approval.weddingId === selected.id);

  const impactRows: ImpactRow[] = [
    {
      area: "Guest Ops",
      title: "Estimated rooming",
      change: `${Math.round(totalRoomsNeed * 1.15)} rooms (with 15% flexibility)`
    },
    {
      area: "Vendor Load",
      title: "Projected catering shift",
      change: `${Math.round((selected.guestTarget * 2.2) / 10) * 10} portions / day`
    },
    {
      area: "Timeline",
      title: "Buffer pressure",
      change: selected.riskLevel === "HIGH" ? "Tight 48h planning window" : "Within normal buffer"
    },
    {
      area: "Operations",
      title: "RSVP urgency",
      change: pendingGuestGap > 0 ? `${pendingGuestGap} responses needed for target close` : "Target is near-confirmed"
    }
  ];

  const nextActions = selectedTasks
    .filter((task) => task.status !== "DONE")
    .filter((task) => {
      if (task.dependsOn.length === 0) return true;
      return task.dependsOn.every((dep) => {
        const depTask = selectedTasks.find((x) => x.id === dep);
        return depTask?.status === "DONE";
      });
    })
    .slice(0, 3);

  const diagnosticSummary = syncDiagnostics
    ? {
        deviceId: syncDiagnostics.deviceId,
        endpoint: syncDiagnostics.endpoint || "not set",
        plannerId: syncDiagnostics.plannerId || "not set",
        syncStatus: syncDiagnostics.syncStatus,
        pendingSyncs: syncDiagnostics.pendingSyncs,
        outboxCount: syncDiagnostics.outboxCount,
        lastRemoteRevision: syncDiagnostics.lastRemoteRevision,
        nextRevision: syncDiagnostics.nextRevision,
        lastSyncAt: syncDiagnostics.lastSyncAt,
        lastSyncError: syncDiagnostics.lastSyncError
      }
    : {
        deviceId: "not loaded",
        endpoint: "not set",
        plannerId: "not set",
        syncStatus: "idle",
        pendingSyncs: 0,
        outboxCount: 0,
        lastRemoteRevision: 0,
        nextRevision: 0,
        lastSyncAt: undefined,
        lastSyncError: undefined
      };

  const syncResultText = syncSummary
    ? syncSummary.status === "success"
      ? `Sync: ${syncSummary.pushed} pushed · ${syncSummary.pulled} pulled · ${syncSummary.conflicts.length} conflicts`
      : syncSummary.reason
    : diagnosticSummary.lastSyncAt
      ? `Last sync: ${new Intl.DateTimeFormat().format(new Date(diagnosticSummary.lastSyncAt))}`
      : "No sync run yet";

  const importErrorText =
    importPackageError instanceof Error
      ? importPackageError.message
      : importPackageError
        ? "Could not import package."
        : "";
  const canRunSync = Boolean(syncDiagnostics?.endpoint) && !syncIsRunning;
  const productHome = "/";
  const marketingHome = "https://www.playoramusic.com";

  async function handleExportPackage() {
    try {
      const payload = await onExportPackage();
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const fileName = `bliss-planner-sync-package-${new Date().toISOString()}.json`;

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      setPackageStatus("Workspace package exported locally.");
    } catch {
      setPackageStatus("Could not export package.");
    }
  }

  function handleImportPackage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        setPackageStatus("Could not read package file.");
        return;
      }

      void onImportPackage(result)
        .then((summary) => {
          if (summary.ok) {
            setPackageStatus("Workspace package imported.");
          } else {
            setPackageStatus(summary.warning ?? "Could not import package.");
          }
        })
        .catch(() => {
          setPackageStatus("Could not import package.");
        });
    };

    reader.readAsText(file);
    event.currentTarget.value = "";
  }

  function addVendor() {
    const name = vendorName.trim();
    if (!name) return;
    onUpsertVendor({
      weddingId: selected.id,
      name,
      category: "OTHER",
      owner: "Planner",
      status: "LEAD",
      estimate: 0,
      currency: selected.currency,
      linkedTaskIds: [],
      notes: "New vendor lead."
    });
    setVendorName("");
  }

  function addVenue() {
    const name = venueName.trim();
    if (!name) return;
    onUpsertVenue({
      weddingId: selected.id,
      name,
      city: selected.destination.split(",")[0]?.trim() || "City",
      country: selected.destination.split(",")[1]?.trim() || "Country",
      status: "SHORTLISTED",
      capacity: selected.guestTarget,
      curfew: "TBD",
      linkedTaskIds: [],
      notes: "New venue option."
    });
    setVenueName("");
  }

  function addDestination() {
    const name = destinationName.trim();
    if (!name) return;
    onUpsertDestination({
      weddingId: selected.id,
      name,
      region: "Global",
      travelRisk: "MEDIUM",
      visaNotes: "Confirm visa and passport requirements.",
      weatherNotes: "Add seasonal weather guidance.",
      culturalNotes: "Add guest cultural briefing.",
      linkedTaskIds: []
    });
    setDestinationName("");
  }

  function addCultureItem() {
    const label = cultureLabel.trim();
    if (!label) return;
    onUpsertCulturalChecklistItem({
      weddingId: selected.id,
      label,
      culture: selected.type.replace(/_/g, " ").toLowerCase(),
      owner: "Client Experience",
      status: "TODO",
      linkedTaskIds: []
    });
    setCultureLabel("");
  }

  function addApproval() {
    const title = approvalTitle.trim();
    if (!title) return;
    onUpsertClientApproval({
      weddingId: selected.id,
      title,
      owner: state.profile.name,
      state: "DRAFT",
      dueAt: selected.date,
      linkedTaskIds: []
    });
    setApprovalTitle("");
  }

  const columns = useMemo<ColumnDef<(typeof selectedTasks)[number], unknown>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Task",
        cell: ({ getValue }) => <strong>{String(getValue() ?? "")}</strong>,
        enableColumnFilter: true
      },
      {
        accessorKey: "owner",
        header: "Owner",
        enableColumnFilter: true
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ getValue }) => <span className={tableStatusClass(String(getValue() ?? "").toLowerCase())}>{String(getValue())}</span>,
        filterFn: "equals"
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => <span className={tableStatusClass(String(getValue() ?? "").toLowerCase())}>{String(getValue())}</span>,
        filterFn: "equals"
      },
      {
        accessorKey: "dueAt",
        header: "Due",
        cell: ({ cell }) => {
          const dueAt = String(cell.getValue() ?? "");
          return <span>{dueAt ? formatDate(dueAt, selected.timezone) : "Not set"}</span>;
        }
      },
      {
        id: "impacts",
        header: "Impacts",
        accessorFn: (row) => row.impacts.join(", "),
        cell: ({ getValue }) => <span>{String(getValue() ?? "")}</span>
      },
      {
        id: "actions",
        header: "Action",
        enableSorting: false,
        enableColumnFilter: false,
        cell: ({ row }) => {
          const task = row.original;
          return (
            <button
              onClick={() => onTaskStatusChange(task.id)}
              className="btn btn-soft"
              disabled={isLoadingTasks}
              data-testid="table-task-action"
            >
              {task.status === "DONE" ? "Undo" : "Mark done"}
            </button>
          );
        }
      }
    ] as ColumnDef<(typeof selectedTasks)[number], unknown>[],
    [onTaskStatusChange, selected.timezone, isLoadingTasks]
  );

  const table = useReactTable({
    data: selectedTasks,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    autoResetAll: false
  });
  const visibleTaskRows = table.getRowModel().rows;

  return (
    <main className="app-shell dashboard-shell">
      <header className="dashboard-top card">
        <div className="title-col">
          <p className="kicker">Wedding operations center</p>
          <h1>Bliss Planner Dashboard</h1>
          <p>{state.profile.businessName} workspace for {state.profile.name}</p>
        </div>
        <div className="dashboard-actions">
          <div className="dashboard-cta-row">
            <a href={productHome} className="btn btn-brand" aria-label="Open Bliss Planner">
              <span className="brand-mark" aria-hidden="true">
                <img src="/icons/bliss-planner-mark.svg" alt="" />
              </span>
              Open product
            </a>
            <a href="/manual" className="btn btn-primary">
              Instruction manual
            </a>
            <a
              href={marketingHome}
              className="btn btn-ghost"
              target="_blank"
              rel="noopener noreferrer"
            >
              Playora home
            </a>
          </div>
          <div className="dashboard-meta-row">
            <span className={statusClass(`Mode ${state.settings.syncMode}`)}>
              {state.settings.syncMode.replace("_", " ")}
            </span>
            <span className="sync-chip">
              {canRunSync ? "Endpoint set" : "Set sync endpoint"}
            </span>
          </div>
        </div>
      </header>

      <ConnectivityBanner />

      <section className="controls panel card">
        <label className="wedding-picker">
          Wedding Workspace
          <select value={selected.id} onChange={(e) => onActiveWeddingChange(e.target.value)}>
            {state.weddings.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title}
              </option>
            ))}
          </select>
        </label>
        <div className="summary-pill">
          <strong>{selected.title}</strong>
          <span>·</span>
          <span>{selected.destination}</span>
          <span>·</span>
          <span>{formatDate(selected.date, selected.timezone)}</span>
        </div>
      </section>

      <section className="operations-rail" aria-label="Operations snapshot">
        <article className="ops-tile">
          <span>Today</span>
          <strong>{nextActions[0]?.title ?? "No urgent action"}</strong>
          <p>{nextActions[0] ? `Owner: ${nextActions[0].owner}` : "Workspace is clear for immediate operations."}</p>
        </article>
        <article className="ops-tile">
          <span>This week</span>
          <strong>{openTasks} open tasks</strong>
          <p>{blockedCount} blocked items need planner attention.</p>
        </article>
        <article className="ops-tile">
          <span>Client experience</span>
          <strong>{Math.round(rsvpProgress)}% RSVP target</strong>
          <p>{pendingGuestGap > 0 ? `${pendingGuestGap} more responses to close target.` : "Guest target is close to locked."}</p>
        </article>
      </section>

      <section className="panel sync-panel card">
        <div className="section-header">
          <div>
            <h3>Cross-device continuity</h3>
            <p className="note">{syncResultText}</p>
          </div>
          <div>
            <button className="btn btn-primary" onClick={onRunSync} disabled={!canRunSync}>
              {syncIsRunning ? "Sync in progress…" : "Run sync now"}
            </button>
          </div>
          <select
            value={state.settings.syncMode}
            onChange={(e) => onSyncModeChange(e.target.value as AppState["settings"]["syncMode"])}
            aria-label="Sync mode selector"
          >
            <option value="LOCAL_ONLY">Local only</option>
            <option value="LOCAL_FIRST">Local-first sync (opt-in)</option>
            <option value="OPT_IN_SYNC">Cloud mirror</option>
          </select>
        </div>

        <div className="sync-status-grid">
          <p className="sync-stat">
            <strong>Device:</strong> {diagnosticSummary.deviceId}
          </p>
          <p className="sync-stat">
            <strong>Planner ID:</strong> {diagnosticSummary.plannerId}
          </p>
          <p className="sync-stat">
            <strong>Sync state:</strong>
            <span className={statusClass(`sync ${diagnosticSummary.syncStatus}`)}>{diagnosticSummary.syncStatus}</span>
          </p>
          <p className="sync-stat">
            <strong>Queue:</strong> {diagnosticSummary.pendingSyncs} pending · {diagnosticSummary.outboxCount} queued
          </p>
          <p className="sync-stat">
            <strong>Revisions:</strong> local {diagnosticSummary.nextRevision} · remote {diagnosticSummary.lastRemoteRevision}
          </p>
          <p className="sync-stat">
            <strong>Endpoint:</strong> {diagnosticSummary.endpoint}
          </p>
          {!syncDiagnostics?.endpoint ? <p className="sync-error">Add a sync endpoint to push/pull changes across devices.</p> : null}
          {diagnosticSummary.lastSyncError ? <p className="sync-error">{diagnosticSummary.lastSyncError}</p> : null}
          {syncError ? <p className="sync-error">{syncError}</p> : null}
          {importErrorText ? <p className="sync-error">{importErrorText}</p> : null}
        </div>

        <div className="sync-controls">
          <div className="sync-control-grid">
            <label className="sync-control-group">
              Sync identity
              <div className="row-actions">
                <input
                  type="url"
                  value={endpointInput}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setEndpointInput(event.target.value)}
                  placeholder="https://api.yourdomain.com"
                  aria-label="sync-endpoint"
                />
                <button className="btn btn-soft" onClick={() => onSetSyncEndpoint(endpointInput.trim() || undefined)}>
                  Save endpoint
                </button>
              </div>
            </label>

            <label className="sync-control-group">
              Planner identity
              <div className="row-actions">
                <input
                  value={plannerIdInput}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setPlannerIdInput(event.target.value)}
                  placeholder="planner-id"
                  aria-label="planner-id"
                />
                <button className="btn btn-soft" onClick={() => onSetPlannerId(plannerIdInput.trim() || undefined)}>
                  Save planner id
                </button>
              </div>
            </label>

            <label className="sync-control-group">
              Backup package
              <div className="row-actions">
                <button className="btn btn-primary" data-testid="export-workspace-package" onClick={() => void handleExportPackage()}>
                  Export workspace package
                </button>
                <button className="btn" data-testid="import-workspace-package" onClick={() => fileInputRef.current?.click()}>
                  Import package
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleImportPackage}
                  hidden
                />
              <button className="btn btn-danger" onClick={onClearSync}>
                Reset sync
              </button>
              </div>
            </label>

            <label className="sync-control-group">
              Workspace controls
              <button
                className="btn btn-ghost"
                onClick={() => {
                  if (window.confirm("Reset all local planner data to onboarding seed and clear sync metadata?")) {
                    onResetWorkspace();
                  }
                }}
                data-testid="reset-seed-data"
              >
                Reset seed data
              </button>
            </label>
          </div>
        </div>

        {packageStatus ? <p className="note">{packageStatus}</p> : null}
      </section>

      <section className="grid four metrics-grid">
        <article className="panel card metric-card">
          <span className="metric-label">Budget</span>
          <h3>Budget health</h3>
          <p className="metric">{currency(spent, selected.currency)} spent</p>
          <p>of {currency(planned, selected.currency)} planned</p>
          <div className="mini-meter" aria-hidden="true">
            <span style={{ width: `${Math.min(100, (spent / planned) * 100)}%` }} />
          </div>
          <p className="variance">Variance {percent(budgetVariance)}</p>
        </article>
        <article className="panel card metric-card">
          <span className="metric-label">Clients</span>
          <h3>Guest movement</h3>
          <p className="metric">{selected.rsvpYes}</p>
          <p>confirmed / target {selected.guestTarget}</p>
          <div className="mini-meter" aria-hidden="true">
            <span style={{ width: `${Math.min(100, rsvpProgress)}%` }} />
          </div>
          <p>{selected.rsvpPending} pending replies</p>
        </article>
        <article className="panel card metric-card">
          <span className="metric-label">Delivery</span>
          <h3>Tasks</h3>
          <p className="metric">{openTasks}</p>
          <p>open tasks</p>
          <div className="mini-meter" aria-hidden="true">
            <span style={{ width: `${Math.min(100, taskProgress)}%` }} />
          </div>
          <p>
            {blockedCount} blocked · {selectedTasks.filter((t) => t.status === "DONE").length}/{selectedTasks.length} completed
          </p>
        </article>
        <article className="panel card metric-card">
          <span className="metric-label">Risk</span>
          <h3>Risk signal</h3>
          <p className="metric">{selected.riskLevel}</p>
          <p>Rooms needed {totalRoomsNeed}</p>
          <div className="mini-meter risk-meter" aria-hidden="true">
            <span style={{ width: selected.riskLevel === "HIGH" ? "76%" : "42%" }} />
          </div>
          <p>Groups {selected.guestGroups.length} / {totalGroups} people</p>
        </article>
      </section>

      <section className="grid three readiness-grid" aria-label="Wedding readiness modules">
        {readinessGroups.map((group) => (
          <article key={group.area} className="panel card readiness-card">
            <div className="readiness-head">
              <div>
                <span className="metric-label">{group.area.toLowerCase()}</span>
                <h3>{group.label}</h3>
              </div>
              <strong>{group.score}%</strong>
            </div>
            <div className="mini-meter" aria-hidden="true">
              <span style={{ width: `${Math.min(100, group.score)}%` }} />
            </div>
            <div className="readiness-list">
              {group.items.map((item) => (
                <div key={item.id} className="readiness-row">
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.notes}</p>
                    <small>
                      {item.owner} · {item.linkedTaskIds.length} linked task{item.linkedTaskIds.length === 1 ? "" : "s"}
                    </small>
                  </div>
                  <span className={`pill readiness-${item.status.toLowerCase()}`}>{item.status}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="grid two equal">
        <article className="panel card">
          <h3>Live planning impact</h3>
          <div className="impact-grid">
            {impactRows.map((row) => (
              <div key={row.area} className="impact-item">
                <span>{row.area}</span>
                <strong>{row.title}</strong>
                <p>{row.change}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel card">
          <h3>Guest target and downstream effects</h3>
          <label>
            Guest target
            <input
              data-testid="guest-target-slider"
              type="range"
              min={120}
              max={320}
              step={5}
              value={selected.guestTarget}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onGuestTargetChange(selected.id, Number(event.target.value))
              }
            />
          </label>
          <p className="note">Moving this value updates projected catering, rooming, and logistics suggestions.</p>
          <p>
            <strong>Current target:</strong> {selected.guestTarget}
          </p>
          <p>
            <strong>Derived rooming pressure:</strong> {Math.round(selected.guestTarget * 0.45)} rooms
          </p>
          <p>
            <strong>Transport seats impact:</strong> {Math.ceil(selected.guestTarget / 22)} shuttle blocks
          </p>
          <div className="impact-summary">
            <span>Catering</span>
            <strong>{Math.round(selected.guestTarget * 2.2)} portions</strong>
            <span>Rooming</span>
            <strong>{Math.round(selected.guestTarget * 0.45)} rooms</strong>
          </div>
        </article>
      </section>

      <section className="panel card crud-panel" aria-label="Operational records">
        <div className="section-header">
          <div>
            <h3>Operational records</h3>
            <p className="note">Create and maintain the live vendor, venue, destination, culture, and approval records for this wedding.</p>
          </div>
          <span className="sync-chip">{selectedVendors.length + selectedVenues.length + selectedDestinations.length + selectedApprovals.length} records</span>
        </div>

        <div className="crud-grid">
          <article className="crud-card">
            <h4>Vendors</h4>
            <div className="inline-create">
              <input value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Add vendor" aria-label="Add vendor" />
              <button className="btn btn-soft" onClick={addVendor}>Add</button>
            </div>
            <div className="record-list">
              {selectedVendors.map((vendor) => (
                <div key={vendor.id} className="record-row">
                  <div>
                    <strong>{vendor.name}</strong>
                    <p>{vendor.category.replace("_", " ")} · {vendor.owner} · {currency(vendor.estimate, vendor.currency)}</p>
                  </div>
                  <div className="record-actions">
                    <button className="btn btn-ghost" onClick={() => onUpsertVendor({ ...vendor, status: vendor.status === "CONTRACTED" ? "PAID" : "CONTRACTED" })}>Advance</button>
                    <button className="btn btn-danger" onClick={() => onDeleteVendor(vendor.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="crud-card">
            <h4>Venues</h4>
            <div className="inline-create">
              <input value={venueName} onChange={(e) => setVenueName(e.target.value)} placeholder="Add venue" aria-label="Add venue" />
              <button className="btn btn-soft" onClick={addVenue}>Add</button>
            </div>
            <div className="record-list">
              {selectedVenues.map((venue) => (
                <div key={venue.id} className="record-row">
                  <div>
                    <strong>{venue.name}</strong>
                    <p>{venue.city}, {venue.country} · {venue.status.replace("_", " ")} · cap {venue.capacity}</p>
                  </div>
                  <div className="record-actions">
                    <button className="btn btn-ghost" onClick={() => onUpsertVenue({ ...venue, status: venue.status === "READY" ? "HOLD" : "READY" })}>Ready</button>
                    <button className="btn btn-danger" onClick={() => onDeleteVenue(venue.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="crud-card">
            <h4>Destinations</h4>
            <div className="inline-create">
              <input value={destinationName} onChange={(e) => setDestinationName(e.target.value)} placeholder="Add destination profile" aria-label="Add destination" />
              <button className="btn btn-soft" onClick={addDestination}>Add</button>
            </div>
            <div className="record-list">
              {selectedDestinations.map((destination) => (
                <div key={destination.id} className="record-row">
                  <div>
                    <strong>{destination.name}</strong>
                    <p>{destination.region} · travel risk {destination.travelRisk}</p>
                  </div>
                  <div className="record-actions">
                    <button className="btn btn-ghost" onClick={() => onUpsertDestination({ ...destination, travelRisk: destination.travelRisk === "LOW" ? "MEDIUM" : "LOW" })}>Toggle risk</button>
                    <button className="btn btn-danger" onClick={() => onDeleteDestination(destination.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="crud-card">
            <h4>Culture</h4>
            <div className="inline-create">
              <input value={cultureLabel} onChange={(e) => setCultureLabel(e.target.value)} placeholder="Add cultural checklist item" aria-label="Add cultural checklist item" />
              <button className="btn btn-soft" onClick={addCultureItem}>Add</button>
            </div>
            <div className="record-list">
              {selected.culturalChecklist.map((item) => (
                <div key={item.id} className="record-row">
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.culture} · {item.owner} · {item.status.replace("_", " ")}</p>
                  </div>
                  <div className="record-actions">
                    <button className="btn btn-ghost" onClick={() => onUpsertCulturalChecklistItem({ weddingId: selected.id, ...item, status: item.status === "DONE" ? "TODO" : "DONE" })}>Toggle</button>
                    <button className="btn btn-danger" onClick={() => onDeleteCulturalChecklistItem({ weddingId: selected.id, itemId: item.id })}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="crud-card">
            <h4>Client approvals</h4>
            <div className="inline-create">
              <input value={approvalTitle} onChange={(e) => setApprovalTitle(e.target.value)} placeholder="Add client approval" aria-label="Add client approval" />
              <button className="btn btn-soft" onClick={addApproval}>Add</button>
            </div>
            <div className="record-list">
              {selectedApprovals.map((approval) => (
                <div key={approval.id} className="record-row">
                  <div>
                    <strong>{approval.title}</strong>
                    <p>{approval.owner} · {approval.state.replace("_", " ")} · {formatDate(approval.dueAt, selected.timezone)}</p>
                  </div>
                  <div className="record-actions">
                    <button className="btn btn-ghost" onClick={() => onUpsertClientApproval({ ...approval, state: approval.state === "APPROVED" ? "CLIENT_REVIEW" : "APPROVED" })}>Approve</button>
                    <button className="btn btn-danger" onClick={() => onDeleteClientApproval(approval.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="grid two equal">
        <article className="panel card client-summary-card">
          <div className="section-header">
            <div>
              <h3>Client status summary</h3>
              <p className="note">For the next client update and approval conversation.</p>
            </div>
            <span className={statusClass(selected.clientStatus.approvalState)}>
              {selected.clientStatus.approvalState.replace("_", " ")}
            </span>
          </div>
          <div className="client-score">
            <strong>{selected.clientStatus.experienceScore}</strong>
            <span>experience score</span>
          </div>
          <div className="impact-summary">
            <span>Owner</span>
            <strong>{selected.clientStatus.relationshipOwner}</strong>
            <span>Next update</span>
            <strong>{formatDate(selected.clientStatus.nextClientUpdateAt, state.settings.timezone)}</strong>
            <span>Sentiment</span>
            <strong>{selected.clientStatus.sentiment}</strong>
            <span>Risk</span>
            <strong>{selected.riskLevel}</strong>
          </div>
          <div className="decision-list">
            {selected.clientStatus.pendingDecisions.map((decision) => (
              <span key={decision}>{decision}</span>
            ))}
          </div>
        </article>

        <article className="panel card cultural-card">
          <div className="section-header">
            <div>
              <h3>Cultural checklist</h3>
              <p className="note">{cultureDone}/{selected.culturalChecklist.length} items complete.</p>
            </div>
            <strong>{Math.round(cultureProgress)}%</strong>
          </div>
          <div className="mini-meter" aria-hidden="true">
            <span style={{ width: `${Math.min(100, cultureProgress)}%` }} />
          </div>
          <div className="culture-list">
            {selected.culturalChecklist.map((item) => (
              <div key={item.id} className="culture-row">
                <span className={`culture-check ${item.status === "DONE" ? "checked" : ""}`} aria-hidden="true" />
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.culture} · {item.owner} · {item.linkedTaskIds.length} linked task{item.linkedTaskIds.length === 1 ? "" : "s"}</p>
                </div>
                <span className={tableStatusClass(item.status.toLowerCase())}>{item.status}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid two equal">
        <article className="panel card">
          <h3>Next actions</h3>
          {nextActions.map((task) => (
            <div key={task.id} className="task-item">
              <div>
                <strong>{task.title}</strong>
                <p>Priority: {task.priority}</p>
                <p>Owner: {task.owner}</p>
              </div>
              <button className="btn btn-soft" data-testid="next-action-button" onClick={() => onTaskStatusChange(task.id)}>
                {task.status === "DONE" ? "Undo" : "Mark done"}
              </button>
            </div>
          ))}
          {nextActions.length === 0 ? <p className="note">No immediate follow-up actions.</p> : null}
        </article>

        <article className="panel card">
          <h3>Task impact map</h3>
          <div className="table-toolbar">
            <input
              aria-label="Search tasks"
              placeholder="Search tasks by title, owner, impacts"
              value={globalFilter ?? ""}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setGlobalFilter(event.target.value)}
            />
            <label>
              Status
              <select
                value={(columnFilters.find((filter) => filter.id === "status")?.value as string) ?? "ALL"}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                  const value = event.target.value;
                  setColumnFilters((prev) => {
                    const next = prev.filter((item) => item.id !== "status");
                    if (value === "ALL") return next;
                    return [...next, { id: "status", value }];
                  });
                }}
              >
                <option value="ALL">All</option>
                <option value="TODO">Todo</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="BLOCKED">Blocked</option>
                <option value="DONE">Done</option>
              </select>
            </label>
            <label>
              Priority
              <select
                value={(columnFilters.find((filter) => filter.id === "priority")?.value as string) ?? "ALL"}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                  const value = event.target.value;
                  setColumnFilters((prev) => {
                    const next = prev.filter((item) => item.id !== "priority");
                    if (value === "ALL") return next;
                    return [...next, { id: "priority", value }];
                  });
                }}
              >
                <option value="ALL">All</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </label>
          </div>
          <div className="table-wrap">
            <table className="task-table">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id}>
                        {header.isPlaceholder ? null : (
                          <button
                            type="button"
                            className="sortable-header"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getIsSorted() === "asc"
                              ? " ▲"
                              : header.column.getIsSorted() === "desc"
                                ? " ▼"
                                : " ↕"}
                          </button>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {visibleTaskRows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        <span className={`align-${cell.column.id}`}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleTaskRows.length === 0 ? <p className="note">No matching tasks for this wedding.</p> : null}
          </div>
          <div className="task-card-list" aria-label="Task cards">
            {visibleTaskRows.map((row) => {
              const task = row.original;
              return (
                <article key={task.id} className="task-card-row">
                  <div className="task-card-head">
                    <strong>{task.title}</strong>
                    <span className={tableStatusClass(task.priority.toLowerCase())}>{task.priority}</span>
                  </div>
                  <div className="task-card-meta">
                    <span>{task.owner}</span>
                    <span>{formatDate(task.dueAt, selected.timezone)}</span>
                  </div>
                  <div className="task-card-impacts">
                    {task.impacts.map((impact) => (
                      <span key={impact}>{impact}</span>
                    ))}
                  </div>
                  <div className="task-card-foot">
                    <span className={tableStatusClass(task.status.toLowerCase())}>{task.status}</span>
                    <button
                      onClick={() => onTaskStatusChange(task.id)}
                      className="btn btn-soft"
                      disabled={isLoadingTasks}
                      data-testid="mobile-task-action"
                    >
                      {task.status === "DONE" ? "Undo" : "Mark done"}
                    </button>
                  </div>
                </article>
              );
            })}
            {visibleTaskRows.length === 0 ? <p className="note">No matching tasks for this wedding.</p> : null}
          </div>
        </article>
      </section>

      <section className="panel card">
        <h3>Notes</h3>
        <p>{selected.notes}</p>
      </section>
    </main>
  );
}
