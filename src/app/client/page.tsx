import Link from "next/link";
import { seedState } from "@/lib/fakeData";

export default function ClientPortalPage() {
  const wedding = seedState.weddings.find((item) => item.id === seedState.activeWeddingId) ?? seedState.weddings[0];
  const tasks = seedState.tasks.filter((task) => task.weddingId === wedding.id);
  const approvals = seedState.clientApprovals.filter((approval) => approval.weddingId === wedding.id);
  const decisions = wedding.clientStatus.pendingDecisions;

  return (
    <main className="portal-shell">
      <header className="portal-hero card">
        <div>
          <p className="kicker">Client portal</p>
          <h1>{wedding.title}</h1>
          <p>{wedding.destination} · {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(wedding.date))}</p>
        </div>
        <Link href="/" className="btn btn-brand">Planner dashboard</Link>
      </header>

      <section className="grid four metrics-grid">
        <article className="panel card metric-card">
          <span className="metric-label">Experience</span>
          <p className="metric">{wedding.clientStatus.experienceScore}</p>
          <p>{wedding.clientStatus.sentiment.toLowerCase()} client sentiment</p>
        </article>
        <article className="panel card metric-card">
          <span className="metric-label">Approvals</span>
          <p className="metric">{approvals.filter((item) => item.state !== "APPROVED").length}</p>
          <p>pending decisions</p>
        </article>
        <article className="panel card metric-card">
          <span className="metric-label">Guests</span>
          <p className="metric">{wedding.rsvpYes}</p>
          <p>confirmed of {wedding.guestTarget}</p>
        </article>
        <article className="panel card metric-card">
          <span className="metric-label">Next update</span>
          <p className="metric small-metric">{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(wedding.clientStatus.nextClientUpdateAt))}</p>
          <p>{wedding.clientStatus.relationshipOwner}</p>
        </article>
      </section>

      <section className="grid two equal">
        <article className="panel card">
          <h3>Approval center</h3>
          <div className="portal-list">
            {approvals.map((approval) => (
              <div key={approval.id} className="portal-row">
                <strong>{approval.title}</strong>
                <p>{approval.owner} · due {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(approval.dueAt))}</p>
                <span className={`pill ${approval.state.toLowerCase()}`}>{approval.state.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel card">
          <h3>Pending decisions</h3>
          <div className="portal-list">
            {decisions.map((decision) => (
              <div key={decision} className="portal-row">
                <strong>{decision}</strong>
                <p>Reviewed in the next planner update.</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid two equal">
        <article className="panel card">
          <h3>Schedule snapshot</h3>
          <div className="portal-list">
            {tasks.map((task) => (
              <div key={task.id} className="portal-row">
                <strong>{task.title}</strong>
                <p>{task.owner} · {task.priority} · {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(task.dueAt))}</p>
                <span className={`pill ${task.status.toLowerCase()}`}>{task.status.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel card">
          <h3>Guest and cultural notes</h3>
          <div className="portal-list">
            {wedding.culturalChecklist.map((item) => (
              <div key={item.id} className="portal-row">
                <strong>{item.label}</strong>
                <p>{item.culture} · owner {item.owner}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
