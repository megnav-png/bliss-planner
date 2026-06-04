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

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [workspaceId, setWorkspaceId] = useState("default-workspace");
  const [audit, setAudit] = useState<RelayAuditResponse | null>(null);
  const [monitoring, setMonitoring] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = window.sessionStorage.getItem("bliss.relay.audit.token") || "";
    setToken(saved);
    void fetch("/api/monitoring/health").then((response) => response.json()).then(setMonitoring).catch(() => undefined);
  }, []);

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
    </main>
  );
}
