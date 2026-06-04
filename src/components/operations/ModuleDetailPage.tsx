"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getPlannerState } from "@/lib/repository";
import { AppState } from "@/lib/types";

const moduleLabels: Record<string, string> = {
  vendors: "Vendor operations",
  venues: "Venue logistics",
  destinations: "Destination readiness",
  approvals: "Client approvals",
  guests: "Guest RSVP and seating",
  crm: "Business development CRM"
};

export default function ModuleDetailPage({ module }: { module: string }) {
  const [state, setState] = useState<AppState | null>(null);

  useEffect(() => {
    void getPlannerState().then(setState);
  }, []);

  const selected = useMemo(() => {
    if (!state) return null;
    return state.weddings.find((wedding) => wedding.id === state.activeWeddingId) ?? state.weddings[0] ?? null;
  }, [state]);

  if (!state || !selected) {
    return (
      <main className="dashboard-shell">
        <section className="panel card">
          <h1>Loading module</h1>
        </section>
      </main>
    );
  }

  const title = moduleLabels[module] ?? "Operations module";
  const vendors = state.vendors.filter((item) => item.weddingId === selected.id);
  const venues = state.venues.filter((item) => item.weddingId === selected.id);
  const destinations = state.destinations.filter((item) => item.weddingId === selected.id);
  const approvals = state.clientApprovals.filter((item) => item.weddingId === selected.id);
  const guests = state.guests.filter((item) => item.weddingId === selected.id);
  const tables = state.seatingTables.filter((item) => item.weddingId === selected.id);

  return (
    <main className="dashboard-shell module-shell">
      <section className="panel card">
        <Link href="/" className="btn btn-ghost">Back to dashboard</Link>
        <p className="eyebrow">Bliss Planner</p>
        <h1>{title}</h1>
        <p className="note">{selected.title} · {selected.destination} · {selected.date}</p>
      </section>

      {module === "vendors" ? (
        <section className="panel card">
          <h2>Contracts, payments, contacts, files, and risk</h2>
          <div className="detail-page-grid">
            {vendors.map((vendor) => (
              <article key={vendor.id} className="access-card">
                <h3>{vendor.name}</h3>
                <p>{vendor.category} · {vendor.status} · {vendor.owner}</p>
                <p>{vendor.contactName ?? "No contact"} · {vendor.contactEmail ?? "No email"}</p>
                <div className="portal-grid mini-detail-grid">
                  <div><span>Contract</span><strong>{vendor.contractStatus ?? "Open"}</strong></div>
                  <div><span>Payment</span><strong>{vendor.paymentStatus ?? "Open"}</strong></div>
                  <div><span>Estimate</span><strong>{vendor.currency} {vendor.estimate.toLocaleString()}</strong></div>
                  <div><span>Files</span><strong>{vendor.files?.length ?? 0}</strong></div>
                </div>
                <p>{vendor.logisticsNotes ?? vendor.notes}</p>
                <small>{vendor.riskNotes ?? "No risk note."}</small>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {module === "venues" ? (
        <section className="panel card">
          <h2>Permits, access, curfew, and logistics</h2>
          <div className="detail-page-grid">
            {venues.map((venue) => (
              <article key={venue.id} className="access-card">
                <h3>{venue.name}</h3>
                <p>{venue.city}, {venue.country} · {venue.status}</p>
                <p>{venue.contactName ?? "No contact"} · {venue.contactEmail ?? "No email"}</p>
                <div className="portal-grid mini-detail-grid">
                  <div><span>Permit</span><strong>{venue.permitStatus ?? "Open"}</strong></div>
                  <div><span>Access</span><strong>{venue.accessWindow ?? "TBD"}</strong></div>
                  <div><span>Capacity</span><strong>{venue.capacity}</strong></div>
                  <div><span>Files</span><strong>{venue.files?.length ?? 0}</strong></div>
                </div>
                <p>{venue.logisticsNotes ?? venue.notes}</p>
                <small>{venue.riskNotes ?? "No risk note."}</small>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {module === "destinations" ? (
        <section className="panel card">
          <h2>Travel, permits, weather, culture, and risks</h2>
          <div className="detail-page-grid">
            {destinations.map((destination) => (
              <article key={destination.id} className="access-card">
                <h3>{destination.name}</h3>
                <p>{destination.region} · risk {destination.travelRisk}</p>
                <p>{destination.visaNotes}</p>
                <p>{destination.weatherNotes}</p>
                <p>{destination.permitNotes ?? "Permit checklist open."}</p>
                <small>{destination.riskNotes ?? destination.culturalNotes}</small>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {module === "approvals" ? (
        <section className="panel card">
          <h2>Approval history, comments, and files</h2>
          <div className="detail-page-grid">
            {approvals.map((approval) => (
              <article key={approval.id} className="access-card">
                <h3>{approval.title}</h3>
                <p>{approval.owner} · {approval.state.replace("_", " ")} · due {approval.dueAt}</p>
                <p>{approval.comments?.at(-1)?.body ?? "No comments yet."}</p>
                <small>{approval.history?.length ?? 0} history entries · {approval.files?.length ?? 0} files</small>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {module === "guests" ? (
        <section className="panel card">
          <h2>RSVP, meals, households, and tables</h2>
          <div className="detail-page-grid">
            {guests.map((guest) => (
              <article key={guest.id} className="access-card">
                <h3>{guest.name}</h3>
                <p>{guest.groupName} · {guest.rsvpStatus.replace("_", " ")} · {guest.mealPreference}</p>
                <small>{guest.seatPreference ?? "No seating preference"} · {guest.email ?? "No email"}</small>
              </article>
            ))}
            {tables.map((table) => (
              <article key={table.id} className="access-card">
                <h3>{table.name}</h3>
                <p>{table.zone} · {table.guestIds.length}/{table.capacity} seated</p>
                <small>{table.notes ?? "No table notes."}</small>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {module === "crm" ? (
        <section className="panel card">
          <h2>Inquiry pipeline and conversion</h2>
          <div className="detail-page-grid">
            {state.pipelineLeads.map((lead) => (
              <article key={lead.id} className="access-card">
                <h3>{lead.clientName}</h3>
                <p>{lead.source} · {lead.status} · quote {lead.quoteStatus.replace("_", " ")}</p>
                <p>{lead.destinationCity} · {lead.currency} {lead.projectedBudget.toLocaleString()}</p>
                <small>{lead.nextAction} · follow up {lead.followUpAt}</small>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
