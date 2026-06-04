const schema = {
  weddings: [
    {
      id: "w1",
      couple: "Maya & Kenji",
      location: "Kyoto, Japan",
      date: "2026-10-18",
      culture: ["Shinto", "Jewish"],
      type: "destination",
      phase: "Vendor lock",
      budget: 184000,
      committed: 141800,
      paid: 86500,
      guestTarget: 142,
      rsvpYes: 96,
      rsvpPending: 37,
      roomsHeld: 68,
      roomsBooked: 43,
      portal: 78,
      timezone: "JST",
      mealSplit: { veg: 24, fish: 38, beef: 41, kids: 6 },
      rituals: ["San-san-kudo", "Ketubah signing", "Family tea welcome"],
      nextSteps: [
        ["18 Jun", "Confirm bilingual officiant script", "Culture and ceremony copy", 62],
        ["22 Jun", "Close hotel room block attrition review", "Rooms, shuttles, guest travel", 45],
        ["04 Jul", "Menu tasting with allergy matrix", "Catering count linked to RSVP", 70],
        ["16 Jul", "Floral installation load-in plan", "Venue, decor, contractor schedule", 54]
      ],
      risks: [
        ["high", "Room block pace is 19 rooms behind", "May trigger attrition clause after 30 June."],
        ["medium", "Ketubah calligraphy proof pending", "Client approval needed before print vendor deadline."],
        ["low", "Rain backup needs revised signage", "Garden ceremony route changes if forecast holds."]
      ],
      clientTasks: [
        ["OK", "Design board approved", "Decor palette, linens, and ceremony arch locked."],
        ["2", "Family expectation notes", "Two elder blessing moments need final wording."],
        ["5", "Guest travel page", "Add shuttle times and passport reminder."]
      ],
      vendors: [
        ["Venue", "Hoshinoya Kyoto", "Contracted", "$52,000", "Deposit paid", "Floor plan due"],
        ["Caterer", "Sora Table", "Tasting", "$41,500", "40% due", "Allergy matrix open"],
        ["Decorator", "Aki Bloom Studio", "In design", "$28,400", "Quote variance", "Install crew needed"],
        ["Photo", "Nakamura & Co.", "Contracted", "$14,600", "Paid", "Shot list pending"]
      ],
      runSheet: [
        ["08:30", "Vendor load-in opens at service gate B"],
        ["10:10", "Tea welcome rehearsal with both families"],
        ["15:20", "Ceremony processional and San-san-kudo"],
        ["18:45", "Dinner service starts with allergy table sweep"]
      ]
    },
    {
      id: "w2",
      couple: "Amina & Lucas",
      location: "Marrakech, Morocco",
      date: "2026-08-27",
      culture: ["Moroccan", "French"],
      type: "culture",
      phase: "Experience design",
      budget: 236000,
      committed: 198400,
      paid: 122600,
      guestTarget: 210,
      rsvpYes: 166,
      rsvpPending: 28,
      roomsHeld: 96,
      roomsBooked: 82,
      portal: 86,
      timezone: "WEST",
      mealSplit: { veg: 38, fish: 58, beef: 64, kids: 12 },
      rituals: ["Henna night", "Zaffa entrance", "French civil toast"],
      nextSteps: [
        ["09 Jun", "Confirm henna-night privacy zones", "Culture, guest flow, decor", 74],
        ["14 Jun", "Approve tented courtyard lighting", "Venue, decorator, power contractor", 58],
        ["29 Jun", "Lock late-night catering stations", "Guest count and service staffing", 67],
        ["08 Jul", "Finalize airport transfer waves", "Destination logistics", 82]
      ],
      risks: [
        ["medium", "Generator quote exceeds allowance", "Lighting design adds 22 amps above original plan."],
        ["medium", "Three VIP flights arrive after welcome dinner", "Client decision needed on late hospitality."],
        ["low", "Printed program translation review", "French copy is approved; Arabic proof pending."]
      ],
      clientTasks: [
        ["OK", "Moodboard round three complete", "Client marked all decor zones approved."],
        ["1", "Welcome bag inserts", "Currency and tipping notes are still missing."],
        ["3", "Family procession order", "Planner needs final names from both families."]
      ],
      vendors: [
        ["Venue", "Riad El Fenn", "Contracted", "$88,000", "Paid", "Courtyard plan open"],
        ["Caterer", "Maison Saveur", "Contracted", "$59,200", "30% due", "Late-night stations"],
        ["Decorator", "Atlas Events", "Quote review", "$44,800", "Variance", "Power plan needed"],
        ["Transport", "Menara Fleet", "Shortlisted", "$12,300", "Not contracted", "Flight waves"]
      ],
      runSheet: [
        ["11:00", "Courtyard production meeting"],
        ["16:30", "Henna artists arrive at suite level"],
        ["19:20", "Zaffa entrance begins from north gate"],
        ["23:45", "Late-night station opens in lower garden"]
      ]
    },
    {
      id: "w3",
      couple: "Priya & Arjun",
      location: "Goa, India",
      date: "2027-01-12",
      culture: ["Hindu", "Punjabi"],
      type: "destination",
      phase: "Budget shaping",
      budget: 312000,
      committed: 174600,
      paid: 62000,
      guestTarget: 380,
      rsvpYes: 214,
      rsvpPending: 132,
      roomsHeld: 178,
      roomsBooked: 96,
      portal: 64,
      timezone: "IST",
      mealSplit: { veg: 188, fish: 42, beef: 0, kids: 26 },
      rituals: ["Mehendi", "Haldi", "Anand Karaj", "Sangeet"],
      nextSteps: [
        ["12 Jun", "Split ceremonies across beach and ballroom", "Venue capacity and weather backup", 39],
        ["20 Jun", "Catering proposal by ritual day", "Guest count, menu, kitchen load", 31],
        ["03 Jul", "Decor mandap engineering quote", "Decorator and contractor dependency", 28],
        ["21 Jul", "Room block expansion decision", "Destination and guest travel", 44]
      ],
      risks: [
        ["high", "Guest count could exceed ballroom cap", "Current invited list is 34 over indoor backup."],
        ["high", "Mandap structure not engineered", "Wind-load certificate required by venue."],
        ["medium", "Room block expansion not approved", "High-season inventory is moving quickly."]
      ],
      clientTasks: [
        ["4", "Ceremony priorities", "Family has not ranked rituals by must-have moments."],
        ["7", "Budget approval", "Planner needs signoff on three-day catering range."],
        ["OK", "Planner discovery complete", "Client notes captured in shared brief."]
      ],
      vendors: [
        ["Venue", "Solmar Goa", "Soft hold", "$118,000", "Deposit due", "Capacity review"],
        ["Caterer", "Coastal Rasoi", "Proposal", "$96,000", "Open", "Menu by event"],
        ["Decorator", "Mandap Works", "Engineering", "$72,000", "Open", "Wind certificate"],
        ["Entertainment", "Beat Baraat", "Shortlisted", "$31,000", "Open", "Stage rider"]
      ],
      runSheet: [
        ["09:00", "Haldi floral reset starts"],
        ["13:30", "Beach mandap inspection"],
        ["17:00", "Anand Karaj family seating"],
        ["20:15", "Sangeet stage cue-to-cue"]
      ]
    },
    {
      id: "w4",
      couple: "Sofia & Mateo",
      location: "Cartagena, Colombia",
      date: "2026-11-06",
      culture: ["Colombian", "Catholic"],
      type: "destination",
      phase: "Guest experience",
      budget: 158000,
      committed: 119600,
      paid: 73400,
      guestTarget: 118,
      rsvpYes: 77,
      rsvpPending: 31,
      roomsHeld: 54,
      roomsBooked: 39,
      portal: 82,
      timezone: "COT",
      mealSplit: { veg: 14, fish: 33, beef: 29, kids: 4 },
      rituals: ["Catholic mass", "Lasso ceremony", "Hora loca"],
      nextSteps: [
        ["15 Jun", "Finalize cathedral paperwork", "Legal and ceremony dependency", 73],
        ["01 Jul", "Approve hora loca performer contract", "Entertainment and client experience", 66],
        ["11 Jul", "Guest transfer route audit", "Destination logistics", 52],
        ["19 Jul", "Decor strike window with venue", "Contractor and venue rules", 61]
      ],
      risks: [
        ["medium", "Cathedral document apostille pending", "Legal paperwork must arrive before August."],
        ["low", "Old City street closure alert", "Transport route may need extra buffer."],
        ["low", "Decorator strike window tight", "Venue has brunch reset the next morning."]
      ],
      clientTasks: [
        ["OK", "Welcome itinerary approved", "Client portal can publish this week."],
        ["2", "Ceremony readers", "Two family readers still unnamed."],
        ["1", "Music selections", "Mass processional needs final choice."]
      ],
      vendors: [
        ["Venue", "Casa San Agustin", "Contracted", "$46,000", "Paid", "Strike plan"],
        ["Caterer", "Luz Cocina", "Contracted", "$38,400", "20% due", "Seafood tasting"],
        ["Decorator", "Tierra Floral", "Contracted", "$24,800", "Paid", "Reuse plan"],
        ["Entertainment", "Noche Viva", "Negotiation", "$13,600", "Open", "Hora loca rider"]
      ],
      runSheet: [
        ["10:00", "Cathedral document check"],
        ["14:40", "Guest shuttles depart hotel"],
        ["16:00", "Catholic mass begins"],
        ["22:30", "Hora loca performer entrance"]
      ]
    }
  ],
  pipeline: [
    ["Corporate luxury referral", "Discovery booked", "$94,000", "72%", "New York", "Planner intro"],
    ["Lake Como intimate wedding", "Proposal sent", "$128,000", "48%", "Italy", "Venue partner"],
    ["Cape Town multicultural brief", "Qualification", "$176,000", "34%", "South Africa", "Website"],
    ["Bali renewal weekend", "Nurture", "$62,000", "21%", "Indonesia", "Instagram"]
  ]
};

const icons = {
  layout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M3 10h18"/></svg>',
  rings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="14" r="5"/><circle cx="15" cy="14" r="5"/><path d="M12 5l2 3h-4z"/></svg>',
  vendor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 8h16M6 8v12h12V8M8 8V6a4 4 0 0 1 8 0v2"/></svg>',
  guests: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 20v-2a4 4 0 0 0-8 0v2"/><circle cx="12" cy="8" r="4"/><path d="M20 20v-2a3 3 0 0 0-2-2.8M4 20v-2a3 3 0 0 1 2-2.8"/></svg>',
  wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16v14H4z"/><path d="M4 7l3-4h13v4"/><path d="M16 14h4"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a8 8 0 0 0 .1-2l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L15 5h-4l-.4 3.1a8 8 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a8 8 0 0 0 .1 2l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.7 1l.4 3.1h4l.4-3.1a8 8 0 0 0 1.7-1l2.4 1 2-3.4z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 12a8 8 0 0 1-14.9 4M4 12A8 8 0 0 1 18.9 8"/><path d="M20 4v4h-4M4 20v-4h4"/></svg>'
};

let selectedId = schema.weddings[0].id;
let activeFilter = "all";
let tableView = "vendor";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const els = {
  weddingCards: document.querySelector("#weddingCards"),
  metricGrid: document.querySelector("#metricGrid"),
  selectedWeddingTitle: document.querySelector("#selectedWeddingTitle"),
  timelineSummary: document.querySelector("#timelineSummary"),
  timeline: document.querySelector("#timeline"),
  portalScore: document.querySelector("#portalScore"),
  clientTasks: document.querySelector("#clientTasks"),
  riskList: document.querySelector("#riskList"),
  tableHead: document.querySelector("#tableHead"),
  tableBody: document.querySelector("#tableBody"),
  runSheet: document.querySelector("#runSheet"),
  timezoneLabel: document.querySelector("#timezoneLabel"),
  schemaInsight: document.querySelector("#schemaInsight"),
  searchInput: document.querySelector("#searchInput")
};

function iconHydrate() {
  document.querySelectorAll("[data-icon]").forEach((node) => {
    node.innerHTML = icons[node.dataset.icon] ?? "";
  });
}

function currentWedding() {
  return schema.weddings.find((wedding) => wedding.id === selectedId) ?? schema.weddings[0];
}

function weddingHealth(wedding) {
  const rsvpRate = wedding.rsvpYes / wedding.guestTarget;
  const budgetRate = wedding.committed / wedding.budget;
  const roomRate = wedding.roomsBooked / wedding.roomsHeld;
  const riskPenalty = wedding.risks.filter(([level]) => level === "high").length * 0.12;
  return Math.max(0.2, Math.min(0.98, (rsvpRate + (1 - budgetRate * 0.32) + roomRate + wedding.portal / 100) / 4 - riskPenalty));
}

function statusTag(wedding) {
  const health = weddingHealth(wedding);
  return health > 0.72 ? ["On track", ""] : health > 0.54 ? ["Watch", "warn"] : ["Critical", "warn"];
}

function renderWeddingCards() {
  const query = els.searchInput.value.trim().toLowerCase();
  const filtered = schema.weddings.filter((wedding) => {
    const matchesFilter =
      activeFilter === "all" ||
      wedding.type === activeFilter ||
      (activeFilter === "culture" && wedding.culture.length > 1);
    const matchesQuery = [wedding.couple, wedding.location, wedding.culture.join(" "), wedding.phase]
      .join(" ")
      .toLowerCase()
      .includes(query);
    return matchesFilter && matchesQuery;
  });

  els.weddingCards.innerHTML = filtered
    .map((wedding) => {
      const [label, tone] = statusTag(wedding);
      return `
        <button class="wedding-card ${wedding.id === selectedId ? "active" : ""}" type="button" data-id="${wedding.id}">
          <span class="card-title">
            <strong>${wedding.couple}</strong>
            <span class="status-tag ${tone}">${label}</span>
          </span>
          <span class="card-meta">
            <span>${wedding.location}</span>
            <span>${new Date(wedding.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            <span>${wedding.guestTarget} guests</span>
            <span>${wedding.phase}</span>
          </span>
        </button>
      `;
    })
    .join("");

  if (!filtered.some((wedding) => wedding.id === selectedId) && filtered[0]) {
    selectedId = filtered[0].id;
    render();
  }
}

function renderMetrics(wedding) {
  const committed = Math.round((wedding.committed / wedding.budget) * 100);
  const rsvp = Math.round((wedding.rsvpYes / wedding.guestTarget) * 100);
  const rooms = Math.round((wedding.roomsBooked / wedding.roomsHeld) * 100);
  const meals = Object.values(wedding.mealSplit).reduce((sum, count) => sum + count, 0);

  const metrics = [
    ["Budget exposure", `${committed}%`, `${currency.format(wedding.budget - wedding.committed)} unallocated`],
    ["RSVP signal", `${rsvp}%`, `${wedding.rsvpPending} decisions pending`],
    ["Room block", `${rooms}%`, `${wedding.roomsHeld - wedding.roomsBooked} rooms unclaimed`],
    ["Catering count", meals, `${wedding.mealSplit.veg} veg, ${wedding.mealSplit.kids} kids meals`]
  ];

  els.metricGrid.innerHTML = metrics
    .map(
      ([label, value, detail]) => `
        <div class="metric">
          <span>${label}</span>
          <strong>${value}</strong>
          <small>${detail}</small>
        </div>
      `
    )
    .join("");
}

function renderTimeline(wedding) {
  els.timelineSummary.textContent = `${wedding.nextSteps.length} active milestones`;
  els.timeline.innerHTML = wedding.nextSteps
    .map(
      ([date, title, detail, progress]) => `
        <div class="timeline-row">
          <span class="time-pill">${date}</span>
          <span class="task-copy">
            <strong>${title}</strong>
            <span>${detail}</span>
          </span>
          <span class="progress-bar" aria-label="${progress}% complete"><span style="width:${progress}%"></span></span>
        </div>
      `
    )
    .join("");
}

function renderSidePanels(wedding) {
  els.portalScore.textContent = `${wedding.portal}%`;
  els.clientTasks.innerHTML = wedding.clientTasks
    .map(
      ([state, title, detail]) => `
        <div class="task-item">
          <span class="task-state">${state}</span>
          <span class="item-copy"><strong>${title}</strong><span>${detail}</span></span>
        </div>
      `
    )
    .join("");

  els.riskList.innerHTML = wedding.risks
    .map(
      ([level, title, detail]) => `
        <div class="risk-item">
          <span class="risk-state ${level}">${level.slice(0, 1).toUpperCase()}</span>
          <span class="item-copy"><strong>${title}</strong><span>${detail}</span></span>
        </div>
      `
    )
    .join("");
}

function renderTable(wedding) {
  if (tableView === "business") {
    els.tableHead.innerHTML = "<tr><th>Lead</th><th>Stage</th><th>Value</th><th>Probability</th><th>Market</th><th>Source</th></tr>";
    els.tableBody.innerHTML = schema.pipeline
      .map(
        (lead) => `
          <tr>
            <td><strong>${lead[0]}</strong><span>New business</span></td>
            <td>${lead[1]}</td>
            <td>${lead[2]}</td>
            <td>${lead[3]}</td>
            <td>${lead[4]}</td>
            <td>${lead[5]}</td>
          </tr>
        `
      )
      .join("");
    return;
  }

  els.tableHead.innerHTML = "<tr><th>Category</th><th>Partner</th><th>Status</th><th>Value</th><th>Payment</th><th>Linked action</th></tr>";
  els.tableBody.innerHTML = wedding.vendors
    .map(
      ([category, partner, status, value, payment, action]) => `
        <tr>
          <td><strong>${category}</strong><span>${wedding.couple}</span></td>
          <td>${partner}</td>
          <td><span class="status-cell ${status.includes("Soft") || status.includes("Quote") || status.includes("Engineering") ? "alert" : ""}">${status}</span></td>
          <td>${value}</td>
          <td>${payment}</td>
          <td>${action}</td>
        </tr>
      `
    )
    .join("");
}

function renderRunSheet(wedding) {
  els.timezoneLabel.textContent = wedding.timezone;
  els.runSheet.innerHTML = wedding.runSheet
    .map(
      ([time, item]) => `
        <div class="run-item">
          <span class="run-time">${time}</span>
          <span class="item-copy"><strong>${item}</strong><span>${wedding.location}</span></span>
        </div>
      `
    )
    .join("");
}

function renderSchemaInsight(wedding) {
  els.schemaInsight.textContent = `${wedding.couple}: ${wedding.rsvpPending} pending RSVPs can shift catering meals, seating, room pickup, transport waves, printed programs, vendor staffing, and ${currency.format(Math.round((wedding.budget / wedding.guestTarget) * wedding.rsvpPending))} in projected budget exposure.`;
}

function render() {
  const wedding = currentWedding();
  els.selectedWeddingTitle.textContent = `${wedding.couple} planning matrix`;
  renderWeddingCards();
  renderMetrics(wedding);
  renderTimeline(wedding);
  renderSidePanels(wedding);
  renderTable(wedding);
  renderRunSheet(wedding);
  renderSchemaInsight(wedding);
}

document.addEventListener("click", (event) => {
  const weddingButton = event.target.closest(".wedding-card");
  if (weddingButton) {
    selectedId = weddingButton.dataset.id;
    render();
  }

  const filterButton = event.target.closest("[data-filter]");
  if (filterButton) {
    activeFilter = filterButton.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((button) => button.classList.toggle("selected", button === filterButton));
    render();
  }

  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    tableView = viewButton.dataset.view;
    document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button === viewButton));
    renderTable(currentWedding());
  }

  const schemaNode = event.target.closest("[data-node]");
  if (schemaNode) {
    const wedding = currentWedding();
    const insights = {
      wedding: "The wedding record owns date, market, couple, cultures, phase, team, and master budget.",
      guests: `Guest movement currently drives ${wedding.rsvpPending} pending RSVP decisions, meal counts, seating, room pickup, and shuttle waves.`,
      vendors: "Vendor contracts link quotes, deposits, insurance, task owners, setup windows, and day-of run sheet dependencies.",
      budget: `${currency.format(wedding.committed)} is committed against a ${currency.format(wedding.budget)} budget, with open variance tied to decor, catering, and logistics.`,
      culture: `${wedding.culture.join(" + ")} rituals shape ceremony order, family approvals, attire, food rules, music, and printed program copy.`,
      logistics: `${wedding.location} logistics connect room blocks, visas or paperwork, transport, weather plans, local vendors, and timezone-aware client updates.`
    };
    els.schemaInsight.textContent = insights[schemaNode.dataset.node];
  }
});

els.searchInput.addEventListener("input", renderWeddingCards);

document.querySelector("#syncPlanButton").addEventListener("click", () => {
  const wedding = currentWedding();
  wedding.portal = Math.min(98, wedding.portal + 2);
  wedding.nextSteps = wedding.nextSteps.map(([date, title, detail, progress], index) => [
    date,
    title,
    detail,
    Math.min(96, progress + (index === 0 ? 8 : 3))
  ]);
  render();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

iconHydrate();
render();
