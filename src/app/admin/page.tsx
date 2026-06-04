"use client";

import { useEffect, useState } from "react";

type RelayAuditResponse = {
  ok: boolean;
  workspaceId?: string;
  cursor?: number;
  durable?: boolean;
  storeBackend?: string;
  tokenVersion?: number;
  auditLogs?: Array<{ id: string; action: string; at: string; deviceId?: string; cursor?: number; metadata?: Record<string, unknown> }>;
  error?: string;
};

type AdminOverview = {
  ok: boolean;
  workspaceId: string;
  productionStore: { configured: boolean; backend: string; dataResidencyPolicy: string[] };
  monitoring: Record<string, unknown>;
  accounts: Array<{ email: string; name: string; role: string; status: string; portalAccess: string; lastActiveAt?: string }>;
  devices: Array<{ id: string; name: string; platform?: string; appVersion?: string; lastSeenAt?: string; revokedAt?: string }>;
  conflicts: Array<{ id: string; entity: string; entityId: string; resolution: string; createdAt: string }>;
  auditLog: Array<{ id: string; actorEmail?: string; action: string; entity?: string; entityId?: string; createdAt: string }>;
  files: Array<{ id: string; fileName: string; provider: string; sizeBytes?: number; createdAt: string; deletedAt?: string | null }>;
  notifications: Array<{ id: string; channel: string; recipientEmail?: string; subject: string; status: string; createdAt: string }>;
  billing?: { plan: string; status: string; provider: string; currentPeriodEnd?: string };
};

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [workspaceId, setWorkspaceId] = useState("default-workspace");
  const [audit, setAudit] = useState<RelayAuditResponse | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [monitoring, setMonitoring] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved = window.sessionStorage.getItem("bliss.relay.audit.token") || "";
    setToken(saved);
    void fetch("/api/monitoring/health").then((response) => response.json()).then(setMonitoring).catch(() => undefined);
    void loadOverview();
  }, []);

  async function loadOverview(nextWorkspaceId = workspaceId) {
    const response = await fetch(`/api/admin/overview?workspaceId=${encodeURIComponent(nextWorkspaceId)}`);
    const body = await response.json().catch(() => ({}));
    if (response.ok) setOverview(body);
  }

  async function loadAudit() {
    setError("");
    window.sessionStorage.setItem("bliss.relay.audit.token", token);
    const response = await fetch(`/api/sync/audit?workspaceId=${encodeURIComponent(workspaceId)}&limit=100`, {
      headers: token ? { authorization: `Bearer ${token}` } : {}
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setAudit(null);
      setError(body?.error || "Could not load relay audit.");
      return;
    }
    setAudit(body);
    await loadOverview(workspaceId);
  }

  async function updateAccount(email: string, patch: Record<string, string>) {
    setMessage("");
    const response = await fetch("/api/admin/accounts", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId, email, ...patch })
    });
    const body = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Account access updated." : body?.error || "Could not update account.");
    await loadOverview();
  }

  async function revokeFile(fileId: string) {
    setMessage("");
    const response = await fetch("/api/files/revoke", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId, fileId })
    });
    const body = await response.json().catch(() => ({}));
    setMessage(response.ok ? "File access revoked." : body?.error || "Could not revoke file.");
    await loadOverview();
  }

  async function resolveConflict(conflictId: string, resolution: string) {
    setMessage("");
    const response = await fetch("/api/sync/conflicts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId, conflictId, resolution })
    });
    const body = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Conflict marked for resolution." : body?.error || "Could not resolve conflict.");
    await loadOverview();
  }

  return (
    <main className="dashboard-shell admin-shell">
      <section className="panel card">
        <p className="eyebrow">Bliss Planner Admin</p>
        <h1>Relay audit and monitoring</h1>
        <p className="note">Use the Render relay token to inspect protected sync health, audit logs, retention, and monitoring status.</p>
        <div className="admin-controls">
          <label>
            Workspace ID
            <input value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)} />
          </label>
          <label>
            Relay token
            <input value={token} onChange={(event) => setToken(event.target.value)} type="password" />
          </label>
          <button className="btn btn-primary" onClick={() => void loadAudit()}>Load audit logs</button>
        </div>
        {error ? <p className="status-chip status-risk">{error}</p> : null}
        {message ? <p className="status-chip">{message}</p> : null}
      </section>

      <section className="grid two equal">
        <article className="panel card">
          <h2>Monitoring health</h2>
          <div className="portal-grid mini-detail-grid">
            <div><span>Service</span><strong>{String(monitoring?.service ?? "Loading")}</strong></div>
            <div><span>Commit</span><strong>{String(monitoring?.commit ?? "unknown").slice(0, 8)}</strong></div>
            <div><span>Sentry</span><strong>{monitoring?.sentryConfigured ? "Configured" : "Fallback log"}</strong></div>
            <div><span>Uptime</span><strong>{String(monitoring?.uptimeSeconds ?? "-")}s</strong></div>
          </div>
        </article>

        <article className="panel card">
          <h2>Relay status</h2>
          <div className="portal-grid mini-detail-grid">
            <div><span>Backend</span><strong>{audit?.storeBackend ?? "Token required"}</strong></div>
            <div><span>Durable</span><strong>{audit ? (audit.durable ? "Yes" : "No") : "-"}</strong></div>
            <div><span>Cursor</span><strong>{audit?.cursor ?? "-"}</strong></div>
            <div><span>Token version</span><strong>{audit?.tokenVersion ?? "-"}</strong></div>
          </div>
        </article>
      </section>

      <section className="panel card">
        <h2>Audit log</h2>
        <div className="record-list">
          {(audit?.auditLogs ?? []).map((entry) => (
            <div key={entry.id} className="record-row stacked-row">
              <div>
                <strong>{entry.action}</strong>
                <p>{entry.deviceId ?? "workspace"} · {new Date(entry.at).toLocaleString()}</p>
                <small>{entry.metadata ? JSON.stringify(entry.metadata) : "No metadata"}</small>
              </div>
              <span className="sync-chip">{entry.cursor ?? "admin"}</span>
            </div>
          ))}
          {audit && !audit.auditLogs?.length ? <p className="note">No audit logs found.</p> : null}
        </div>
      </section>

      <section className="grid two equal">
        <article className="panel card">
          <h2>Production backend</h2>
          <div className="portal-grid mini-detail-grid">
            <div><span>Database</span><strong>{overview?.productionStore.configured ? overview.productionStore.backend : "Not configured"}</strong></div>
            <div><span>Residency</span><strong>{overview?.productionStore.dataResidencyPolicy?.join(", ") ?? "Any"}</strong></div>
            <div><span>Billing</span><strong>{overview?.billing ? `${overview.billing.plan} · ${overview.billing.status}` : "Not loaded"}</strong></div>
            <div><span>Files</span><strong>{overview?.files.length ?? 0} stored</strong></div>
          </div>
        </article>

        <article className="panel card">
          <h2>Notifications</h2>
          <div className="record-list compact-list">
            {(overview?.notifications ?? []).slice(0, 6).map((item) => (
              <div key={item.id} className="record-row stacked-row">
                <div>
                  <strong>{item.subject}</strong>
                  <p>{item.channel} · {item.recipientEmail ?? "workspace"} · {item.status}</p>
                </div>
              </div>
            ))}
            {overview && !overview.notifications.length ? <p className="note">No queued notifications.</p> : null}
          </div>
        </article>
      </section>

      <section className="panel card">
        <h2>Team and portal access</h2>
        <div className="record-list">
          {(overview?.accounts ?? []).map((account) => (
            <div key={account.email} className="record-row stacked-row">
              <div>
                <strong>{account.name}</strong>
                <p>{account.email} · {account.role} · {account.portalAccess} · {account.status}</p>
              </div>
              <div className="row-actions">
                <button className="btn btn-soft" type="button" onClick={() => void updateAccount(account.email, { status: account.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED" })}>
                  {account.status === "SUSPENDED" ? "Restore" : "Suspend"}
                </button>
                <button className="btn btn-soft" type="button" onClick={() => void updateAccount(account.email, { portalAccess: "NONE" })}>
                  Revoke portal
                </button>
              </div>
            </div>
          ))}
          {overview && !overview.accounts.length ? <p className="note">No production accounts found for this workspace.</p> : null}
        </div>
      </section>

      <section className="grid two equal">
        <article className="panel card">
          <h2>Devices and conflicts</h2>
          <div className="record-list compact-list">
            {(overview?.devices ?? []).slice(0, 5).map((device) => (
              <div key={device.id} className="record-row stacked-row">
                <div>
                  <strong>{device.name}</strong>
                  <p>{device.platform ?? "device"} · {device.revokedAt ? "revoked" : "active"}</p>
                </div>
              </div>
            ))}
            {(overview?.conflicts ?? []).map((conflict) => (
              <div key={conflict.id} className="record-row stacked-row">
                <div>
                  <strong>{conflict.entity} conflict</strong>
                  <p>{conflict.entityId} · {conflict.resolution}</p>
                </div>
                <button className="btn btn-soft" type="button" onClick={() => void resolveConflict(conflict.id, "REMOTE_ACCEPTED")}>Accept remote</button>
              </div>
            ))}
            {overview && !overview.devices.length && !overview.conflicts.length ? <p className="note">No devices or conflicts yet.</p> : null}
          </div>
        </article>

        <article className="panel card">
          <h2>File governance</h2>
          <div className="record-list compact-list">
            {(overview?.files ?? []).slice(0, 8).map((file) => (
              <div key={file.id} className="record-row stacked-row">
                <div>
                  <strong>{file.fileName}</strong>
                  <p>{file.provider} · {file.sizeBytes ?? 0} bytes · {file.deletedAt ? "revoked" : "active"}</p>
                </div>
                {!file.deletedAt ? <button className="btn btn-soft" type="button" onClick={() => void revokeFile(file.id)}>Revoke</button> : null}
              </div>
            ))}
            {overview && !overview.files.length ? <p className="note">No uploaded files found.</p> : null}
          </div>
        </article>
      </section>
    </main>
  );
}
