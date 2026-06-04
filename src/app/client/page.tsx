import Link from "next/link";
import { seedState } from "@/lib/fakeData";
import { getManagedAuthStatus } from "@/lib/server/managedAuth";

export const dynamic = "force-dynamic";

export default async function ClientPortalPage() {
  const auth = await getManagedAuthStatus();
  const allowed = ["CLIENT_PORTAL", "FULL_WORKSPACE"].includes(auth.session.portalAccess);
  if (!allowed) {
    return (
      <main className="portal-shell">
        <section className="panel card">
          <p className="kicker">Protected portal</p>
          <h1>Client portal access required</h1>
          <p>This view is only available to invited client users or workspace planners.</p>
          <Link href="/" className="btn btn-brand">Planner dashboard</Link>
        </section>
      </main>
    );
  }
  const wedding = seedState.weddings.find((item) => item.id === seedState.activeWeddingId) ?? seedState.weddings[0];
  const tasks = seedState.tasks.filter((task) => task.weddingId === wedding.id);
  const approvals = seedState.clientApprovals.filter((approval) => approval.weddingId === wedding.id);
  const decisions = wedding.clientStatus.pendingDecisions;
  const reviewSteps = [
    "Review the approval center",
    "Confirm pending decisions",
    "Wait for the next planner update"
  ];

  return (
    <main className="portal-shell">
      <header className="portal-hero card">
        <div>
          <p className="kicker">Client portal</p>
          <h1>{wedding.title}</h1>
          <p>{wedding.destination} · {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(wedding.date))} · {auth.session.email}</p>
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

        <article className="panel card portal-action-card">
          <h3>Client review flow</h3>
          <div className="portal-steps" aria-label="Client review workflow">
            {reviewSteps.map((step, index) => (
              <div key={step} className="portal-step">
                <span>{index + 1}</span>
                <strong>{step}</strong>
              </div>
            ))}
          </div>
          <div className="portal-actions">
            <button className="btn btn-primary" type="button">Send decision note</button>
            <button className="btn btn-soft" type="button">Request planner call</button>
          </div>
        </article>
      </section>

      <section className="grid two equal">
        <article className="panel card">
          <h3>Pending decisions</h3>
          <div className="portal-list">
            {decisions.map((decision) => (
              <div key={decision} className="portal-row">
                <strong>{decision}</strong>
                <p>Client-visible and reviewed in the next planner update.</p>
              </div>
            ))}
          </div>
        </article>

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
      </section>

      <section className="grid two equal">
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

        <article className="panel card portal-action-card">
          <h3>Experience summary</h3>
          <div className="portal-grid">
            <div>
              <span className="metric-label">Relationship owner</span>
              <strong>{wedding.clientStatus.relationshipOwner}</strong>
            </div>
            <div>
              <span className="metric-label">Sentiment</span>
              <strong>{wedding.clientStatus.sentiment}</strong>
            </div>
            <div>
              <span className="metric-label">Next update</span>
              <strong>{new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(wedding.clientStatus.nextClientUpdateAt))}</strong>
            </div>
            <div>
              <span className="metric-label">Portal access</span>
              <strong>Client only</strong>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
