import Link from "next/link";
import { seedState } from "@/lib/fakeData";

export default function VendorPortalPage() {
  const wedding = seedState.weddings.find((item) => item.id === seedState.activeWeddingId) ?? seedState.weddings[0];
  const vendors = seedState.vendors.filter((vendor) => vendor.weddingId === wedding.id);
  const tasks = seedState.tasks.filter((task) => task.weddingId === wedding.id && task.impacts.includes("VENDORS"));
  const venues = seedState.venues.filter((venue) => venue.weddingId === wedding.id);

  return (
    <main className="portal-shell">
      <header className="portal-hero card">
        <div>
          <p className="kicker">Vendor portal</p>
          <h1>{wedding.title}</h1>
          <p>{wedding.destination} · shared operational brief</p>
        </div>
        <Link href="/" className="btn btn-brand">Planner dashboard</Link>
      </header>

      <section className="grid three readiness-grid">
        {vendors.map((vendor) => (
          <article key={vendor.id} className="panel card readiness-card">
            <span className="metric-label">{vendor.category.replace("_", " ")}</span>
            <h3>{vendor.name}</h3>
            <p>{vendor.owner} · {vendor.status.replace("_", " ")}</p>
            <p>{vendor.notes}</p>
          </article>
        ))}
      </section>

      <section className="grid two equal">
        <article className="panel card">
          <h3>Vendor task board</h3>
          <div className="portal-list">
            {tasks.map((task) => (
              <div key={task.id} className="portal-row">
                <strong>{task.title}</strong>
                <p>{task.owner} · {task.priority} · due {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(task.dueAt))}</p>
                <span className={`pill ${task.status.toLowerCase()}`}>{task.status.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel card">
          <h3>Venue and logistics brief</h3>
          <div className="portal-list">
            {venues.map((venue) => (
              <div key={venue.id} className="portal-row">
                <strong>{venue.name}</strong>
                <p>{venue.city}, {venue.country} · capacity {venue.capacity} · curfew {venue.curfew}</p>
                <span className={`pill ${venue.status.toLowerCase()}`}>{venue.status.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel card">
        <h3>Shared constraints</h3>
        <div className="portal-grid">
          <div>
            <span className="metric-label">Guest target</span>
            <strong>{wedding.guestTarget}</strong>
          </div>
          <div>
            <span className="metric-label">Risk</span>
            <strong>{wedding.riskLevel}</strong>
          </div>
          <div>
            <span className="metric-label">Cultural notes</span>
            <strong>{wedding.culturalChecklist.length} checklist items</strong>
          </div>
          <div>
            <span className="metric-label">Readiness</span>
            <strong>{wedding.readinessItems.filter((item) => item.area === "VENDOR").length} vendor gates</strong>
          </div>
        </div>
      </section>
    </main>
  );
}
