import Link from "next/link";
import { seedState } from "@/lib/fakeData";
import { getManagedAuthStatus } from "@/lib/server/managedAuth";

export const dynamic = "force-dynamic";

export default async function VendorPortalPage() {
  const auth = await getManagedAuthStatus();
  const allowed = ["VENDOR_PORTAL", "FULL_WORKSPACE"].includes(auth.session.portalAccess);
  if (!allowed) {
    return (
      <main className="portal-shell">
        <section className="panel card">
          <p className="kicker">Protected portal</p>
          <h1>Vendor portal access required</h1>
          <p>This view is only available to invited vendors or workspace planners.</p>
          <Link href="/" className="btn btn-brand">Planner dashboard</Link>
        </section>
      </main>
    );
  }
  const wedding = seedState.weddings.find((item) => item.id === seedState.activeWeddingId) ?? seedState.weddings[0];
  const vendors = seedState.vendors.filter((vendor) => vendor.weddingId === wedding.id);
  const tasks = seedState.tasks.filter((task) => task.weddingId === wedding.id && task.impacts.includes("VENDORS"));
  const venues = seedState.venues.filter((venue) => venue.weddingId === wedding.id);
  const deliverables = [
    "Confirm final scope and service count",
    "Upload current quote or invoice",
    "Flag access, load-in, or power constraints"
  ];

  return (
    <main className="portal-shell">
      <header className="portal-hero card">
        <div>
          <p className="kicker">Vendor portal</p>
          <h1>{wedding.title}</h1>
          <p>{wedding.destination} · shared operational brief · {auth.session.email}</p>
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

        <article className="panel card portal-action-card">
          <h3>Vendor update flow</h3>
          <form className="portal-form">
            <label>
              Update type
              <select defaultValue="scope">
                <option value="scope">Scope confirmation</option>
                <option value="quote">Quote or payment update</option>
                <option value="risk">Risk or blocker</option>
              </select>
            </label>
            <label>
              Message to planner
              <textarea defaultValue="We are ready to confirm the current scope once guest counts are locked." />
            </label>
            <button className="btn btn-primary" type="button">Submit vendor update</button>
          </form>
        </article>
      </section>

      <section className="grid two equal">
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

        <article className="panel card">
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
        </article>
      </section>

      <section className="panel card portal-action-card">
        <h3>Deliverables checklist</h3>
        <div className="portal-list">
          {deliverables.map((item) => (
            <div key={item} className="portal-row compact">
              <strong>{item}</strong>
              <span className="pill todo">Required before final run sheet</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
