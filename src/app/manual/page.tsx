export default function ManualPage() {
  return (
    <main className="app-shell dashboard-shell">
      <section className="onboarding-panel">
        <p className="kicker">Bliss Planner</p>
        <h1>Instruction Manual</h1>
        <p>
          This guide helps planners start quickly, run day-to-day operations, and manage cross-device workflows.
          All data is saved locally by default, with optional offline-safe cloud sync controls.
        </p>

        <div className="grid two">
          <article className="panel card">
            <h3>1) First launch and onboarding</h3>
            <ol className="manual-list">
              <li>Open the app. If prompted, complete the wizard (planner profile, currencies, timezone/locale).</li>
              <li>Choose your preferred sync mode:
                <ul>
                  <li><strong>Local only</strong> (default): offline-first and no cloud writes.</li>
                  <li><strong>Local-first</strong>: optional local changes + manual/explicit sync.</li>
                  <li><strong>Cloud mirror</strong>: active cross-device replication.</li>
                </ul>
              </li>
              <li>Set business fields and defaults so every wedding inherits valid currency/date/format settings.</li>
            </ol>
          </article>

          <article className="panel card">
            <h3>2) Navigate the dashboard</h3>
            <ol className="manual-list">
              <li>Use <strong>Wedding Workspace</strong> at the top to switch active weddings.</li>
              <li>Review cards:
                <ul>
                  <li><strong>Budget health</strong>: planned vs spent and variance.</li>
                  <li><strong>Guest movement</strong>: confirmed / target / pending.</li>
                  <li><strong>Tasks</strong>: open items and blocked tasks.</li>
                  <li><strong>Risk signal</strong>: operational pressure indicators.</li>
                </ul>
              </li>
              <li>Use <strong>Guest target</strong> to simulate catering and rooming impacts instantly.</li>
            </ol>
          </article>

          <article className="panel card">
            <h3>3) Tasks and planning actions</h3>
            <ul className="manual-list">
              <li>Mark tasks done in <strong>Next actions</strong> and in <strong>Task impact map</strong>.</li>
              <li>Filter by <strong>Status</strong> and <strong>Priority</strong> in the task table.</li>
              <li>Use search to find tasks by title, owner, or impact notes.</li>
              <li>Dependencies are respected; blocked dependencies are surfaced through priority and queue logic.</li>
            </ul>
          </article>

          <article className="panel card">
            <h3>4) Cross-device continuity</h3>
            <ul className="manual-list">
              <li>Configure <strong>Sync endpoint</strong> for the remote mirror API.</li>
              <li>Use <strong>Planner identity</strong> to tie data to the same workspace across devices.</li>
              <li>Export/import package for one-time transfer between machines.</li>
              <li>Use <strong>Reset seed data</strong> only after exporting backup if needed.</li>
            </ul>
          </article>
        </div>

        <article className="panel card">
          <h3>5) Troubleshooting</h3>
          <ol className="manual-list">
            <li>If page reports sync errors, confirm endpoint URL and retry.</li>
            <li>For port conflicts, stop existing dev servers and restart the app on a free port.</li>
            <li>If onboarding fields fail, reset browser cache for this origin and re-run onboarding.</li>
            <li>Use package export/import as your emergency recovery flow before reset operations.</li>
          </ol>
        </article>
      </section>
    </main>
  );
}
