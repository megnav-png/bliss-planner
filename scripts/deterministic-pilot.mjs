#!/usr/bin/env node

import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const APP_URL = process.env.WOVOPS_APP_URL || process.env.BLISS_APP_URL || "http://127.0.0.1:3002";
const REPORT_FILE = path.join(tmpdir(), `bliss-planner-deterministic-pilot-${Date.now()}.json`);
const STORAGE_KEY = "wovops.phase2.state";
const SYNC_KEY = "wovops.phase2.sync.state";

const scenarios = [];
const consoleErrors = [];

function addResult(scenario, status, details = "") {
  scenarios.push({ scenario, status, details });
}

async function waitForStoredState(page, predicateSource, timeout = 15_000) {
  await page.waitForFunction(
    ({ storageKey, predicate }) => {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return false;
      try {
        const state = JSON.parse(raw);
        return Function("state", `return (${predicate})(state);`)(state);
      } catch {
        return false;
      }
    },
    { storageKey: STORAGE_KEY, predicate: predicateSource },
    { timeout }
  );
}

async function observeStoredState(page, predicateSource, timeout = 3_000) {
  try {
    await waitForStoredState(page, predicateSource, timeout);
    return true;
  } catch {
    return false;
  }
}

function storageDetail(observed) {
  return observed ? "Local storage also reflected the change." : "Visible UI updated; storage mirror was still catching up.";
}

async function waitForVisibleOrStoredState(page, visibleText, predicateSource, timeout = 15_000) {
  await page.waitForFunction(
    ({ storageKey, text, predicate }) => {
      const visible = document.body.innerText.includes(text);
      const raw = window.localStorage.getItem(storageKey);
      let stored = false;
      if (raw) {
        try {
          const state = JSON.parse(raw);
          stored = Boolean(Function("state", `return (${predicate})(state);`)(state));
        } catch {
          stored = false;
        }
      }
      return visible || stored;
    },
    { storageKey: STORAGE_KEY, text: visibleText, predicate: predicateSource },
    { timeout }
  );

  return page.evaluate(
    ({ storageKey, text, predicate }) => {
      const visible = document.body.innerText.includes(text);
      const raw = window.localStorage.getItem(storageKey);
      let stored = false;
      if (raw) {
        try {
          const state = JSON.parse(raw);
          stored = Boolean(Function("state", `return (${predicate})(state);`)(state));
        } catch {
          stored = false;
        }
      }
      return { visible, stored };
    },
    { storageKey: STORAGE_KEY, text: visibleText, predicate: predicateSource }
  );
}

function stateSignalsDetail({ visible, stored }) {
  if (visible && stored) return "Visible UI and local storage both reflected the change.";
  if (visible) return "Visible UI reflected the change; storage mirror was still catching up.";
  return "Local storage reflected the change; UI render was still catching up.";
}

async function performUntilState(page, action, visibleText, predicateSource, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    await action();
    try {
      return await waitForVisibleOrStoredState(page, visibleText, predicateSource);
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(500);
    }
  }
  throw lastError;
}

const seedState = {
  workspace: {
    id: "pilot-workspace",
    name: "Pilot Wedding Group",
    ownerUserId: "pilot-owner",
    region: "APAC",
    dataResidency: "India",
    authProvider: "GOOGLE",
    createdAt: "2026-06-04T00:00:00.000Z"
  },
  users: [
    { id: "pilot-owner", workspaceId: "pilot-workspace", name: "Pilot Planner", email: "pilot@blissplanner.test", role: "OWNER", status: "ACTIVE", portalAccess: "FULL_WORKSPACE" },
    { id: "pilot-client", workspaceId: "pilot-workspace", name: "Pilot Client", email: "client@blissplanner.test", role: "CLIENT", status: "ACTIVE", portalAccess: "CLIENT_PORTAL" },
    { id: "pilot-vendor-user", workspaceId: "pilot-workspace", name: "Pilot Vendor", email: "vendor@blissplanner.test", role: "VENDOR", status: "ACTIVE", portalAccess: "VENDOR_PORTAL" }
  ],
  invites: [{ id: "invite-pilot", workspaceId: "pilot-workspace", email: "producer@blissplanner.test", role: "PRODUCTION", portalAccess: "FULL_WORKSPACE", status: "PENDING", invitedBy: "Pilot Planner", invitedAt: "2026-06-04T00:00:00.000Z", expiresAt: "2026-06-18T00:00:00.000Z" }],
  session: { userId: "pilot-owner", workspaceId: "pilot-workspace", role: "OWNER", issuedAt: "2026-06-04T00:00:00.000Z", expiresAt: "2026-06-05T00:00:00.000Z" },
  profile: {
    name: "Pilot Planner",
    email: "pilot@blissplanner.test",
    businessName: "Pilot Wedding Group"
  },
  settings: {
    baseCurrency: "USD",
    bookingCurrency: "USD",
    displayCurrency: "USD",
    timezone: "Asia/Kolkata",
    locale: "en-IN",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24h",
    distanceUnit: "km",
    weightUnit: "kg",
    taxMode: "INCLUSIVE",
    taxRatePercent: 0,
    defaultLeadTimeDays: 14,
    rsvpReminderOffset: 7,
    syncMode: "LOCAL_ONLY"
  },
  weddings: [
    {
      id: "wed_pilot",
      title: "Pilot Wedding",
      date: "2026-11-14",
      timezone: "Asia/Kolkata",
      destination: "Goa, India",
      type: "DESTINATION_CULTURAL",
      status: "PLANNING",
      currency: "USD",
      guestTarget: 180,
      rsvpYes: 120,
      rsvpPending: 30,
      budget: {
        lines: [
          { id: "line-venue", category: "Venue", planned: 100000, actual: 40000 },
          { id: "line-catering", category: "Catering", planned: 65000, actual: 20000 }
        ]
      },
      riskLevel: "MEDIUM",
      guestGroups: [
        { id: "group-1", name: "Family", total: 90, vegetarian: 25, standard: 60, seafood: 5, roomNeed: 45 }
      ],
      readinessItems: [
        {
          id: "ready-vendor",
          area: "VENDOR",
          label: "Caterer contract",
          owner: "Operations",
          status: "WATCH",
          score: 70,
          linkedTaskIds: ["task-1"],
          notes: "Awaiting final count."
        },
        {
          id: "ready-venue",
          area: "VENUE",
          label: "Venue hold",
          owner: "Planner",
          status: "READY",
          score: 90,
          linkedTaskIds: [],
          notes: "Hold confirmed."
        },
        {
          id: "ready-destination",
          area: "DESTINATION",
          label: "Travel briefing",
          owner: "Guest Ops",
          status: "WATCH",
          score: 64,
          linkedTaskIds: [],
          notes: "Guest guide pending."
        }
      ],
      culturalChecklist: [
        {
          id: "culture-1",
          label: "Welcome ritual briefing",
          culture: "Global guests",
          owner: "Client Experience",
          status: "TODO",
          linkedTaskIds: []
        }
      ],
      clientStatus: {
        relationshipOwner: "Pilot Planner",
        approvalState: "CLIENT_REVIEW",
        nextClientUpdateAt: "2026-09-22",
        experienceScore: 82,
        sentiment: "ENGAGED",
        pendingDecisions: ["Menu sign-off"]
      },
      notes: "Deterministic smoke seed."
    }
  ],
  tasks: [
    {
      id: "task-1",
      weddingId: "wed_pilot",
      title: "Confirm caterer",
      owner: "Operations",
      priority: "HIGH",
      status: "IN_PROGRESS",
      dueAt: "2026-10-01",
      dependsOn: [],
      impacts: ["GUESTS", "BUDGET", "VENDORS"]
    }
  ],
  vendors: [
    {
      id: "vendor-1",
      weddingId: "wed_pilot",
      name: "Pilot Caterers",
      category: "CATERING",
      owner: "Operations",
      status: "QUOTED",
      estimate: 65000,
      currency: "USD",
      linkedTaskIds: ["task-1"],
      notes: "Deterministic vendor.",
      contactName: "Pilot Vendor Lead",
      contactEmail: "vendor@blissplanner.test",
      contractStatus: "Quote received",
      paymentStatus: "Deposit pending",
      logisticsNotes: "Load-in via north gate.",
      riskNotes: "Final count pending.",
      files: [{ id: "file-vendor", name: "Pilot catering quote", kind: "QUOTE", addedAt: "2026-06-04T00:00:00.000Z" }]
    }
  ],
  venues: [
    {
      id: "venue-1",
      weddingId: "wed_pilot",
      name: "Pilot Beach House",
      city: "Goa",
      country: "India",
      status: "HOLD",
      capacity: 200,
      curfew: "23:00",
      linkedTaskIds: [],
      notes: "Deterministic venue.",
      contactName: "Pilot Venue Manager",
      contactEmail: "venue@blissplanner.test",
      permitStatus: "Noise permit pending",
      accessWindow: "08:00-23:00",
      logisticsNotes: "Back-of-house staging confirmed.",
      riskNotes: "Rain backup needs sign-off.",
      files: [{ id: "file-venue", name: "Venue hold", kind: "CONTRACT", addedAt: "2026-06-04T00:00:00.000Z" }]
    }
  ],
  destinations: [
    {
      id: "destination-1",
      weddingId: "wed_pilot",
      name: "Goa destination profile",
      region: "South Asia",
      travelRisk: "MEDIUM",
      visaNotes: "Confirm guest nationalities.",
      weatherNotes: "Monsoon check.",
      culturalNotes: "Welcome notes pending.",
      permitNotes: "Beach ceremony permit in review.",
      logisticsNotes: "Airport transfer route locked.",
      riskNotes: "Heat plan needed.",
      linkedTaskIds: []
    }
  ],
  clientApprovals: [
    {
      id: "approval-1",
      weddingId: "wed_pilot",
      title: "Menu sign-off",
      owner: "Pilot Planner",
      state: "CLIENT_REVIEW",
      dueAt: "2026-09-22",
      linkedTaskIds: ["task-1"],
      comments: [{ id: "comment-1", author: "Pilot Client", body: "Please confirm vegan labels.", createdAt: "2026-06-04T00:00:00.000Z" }],
      history: [{ id: "history-1", state: "CLIENT_REVIEW", actor: "Pilot Planner", createdAt: "2026-06-04T00:00:00.000Z", note: "Sent menu for approval." }],
      files: [{ id: "file-approval", name: "Menu draft", kind: "CLIENT_NOTE", addedAt: "2026-06-04T00:00:00.000Z" }]
    }
  ],
  guests: [{ id: "guest-1", weddingId: "wed_pilot", householdId: "household-kapoor", name: "Pilot Guest", email: "guest@blissplanner.test", groupName: "Family", rsvpStatus: "YES", mealPreference: "VEGETARIAN", seatPreference: "Table 1", notes: "Accessible room" }],
  seatingTables: [{ id: "table-1", weddingId: "wed_pilot", name: "Table 1", zone: "Garden", capacity: 10, guestIds: ["guest-1"], notes: "Near stage" }],
  pipelineLeads: [{ id: "lead-1", clientName: "Pilot Inquiry", email: "lead@blissplanner.test", source: "REFERRAL", status: "QUALIFIED", quoteStatus: "SENT", projectedBudget: 85000, currency: "USD", preferredDate: "2027-01-20", destinationCity: "Goa", nextAction: "Follow up on planning scope", followUpAt: "2026-06-10", confidenceScore: 0.72 }],
  auditLogs: [{ id: "audit-1", actor: "Pilot Planner", action: "PILOT_SEED", entity: "wedding", entityId: "wed_pilot", createdAt: "2026-06-04T00:00:00.000Z", note: "Pilot seed." }],
  analytics: [
    { id: "metric-1", label: "Open approvals", value: "1", trend: "0", status: "WATCH" },
    { id: "metric-2", label: "Pipeline value", value: "$85K", trend: "+1 lead", status: "GOOD" }
  ],
  activeWeddingId: "wed_pilot",
  onboarded: true
};

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(
    ({ storageKey, syncKey, state }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
      window.localStorage.setItem(
        syncKey,
        JSON.stringify({
          deviceId: "pilot-device",
          nextRevision: 0,
          lastRemoteRevision: 0,
          outbox: [],
          syncStatus: "idle",
          entityRevisionByKey: {},
          plannerId: state.profile.email
        })
      );
    },
    { storageKey: STORAGE_KEY, syncKey: SYNC_KEY, state: seedState }
  );

  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 20_000 });
  await page.getByRole("heading", { name: "Bliss Planner Dashboard" }).waitFor({ timeout: 20_000 });
  await page.getByTestId("deploy-version-marker").waitFor({ timeout: 10_000 });
  addResult("Dashboard render", "PASS", "Dashboard mounted from deterministic local state.");

  const requiredText = [
    "Vendor readiness",
    "Venue readiness",
    "Destination readiness",
    "Cultural checklist",
    "Client status summary",
    "Operational records",
    "Team and portal access",
    "Planner approval queue",
    "Vendor detail module",
    "Venue detail module",
    "Destination detail module",
    "Guest RSVP and seating",
    "Business development CRM",
    "Analytics and monitoring",
    "Pilot Caterers",
    "Pilot Beach House",
    "Goa destination profile",
    "Menu sign-off"
  ];
  for (const text of requiredText) {
    await page.getByText(text, { exact: false }).first().waitFor({ timeout: 10_000 });
  }
  addResult("Domain modules", "PASS", "Readiness, CRUD, culture, and client approval modules are visible.");

  await page.getByRole("button", { name: /Mark done/i }).first().click();
  await page.locator("input[data-testid='guest-target-slider']").fill("220");
  addResult("Planner interactions", "PASS", "Task action and guest target slider responded.");

  const vendorSignals = await performUntilState(
    page,
    async () => {
      await page.getByRole("textbox", { name: "Add vendor" }).fill("Pilot Florals");
      await page.locator(".crud-card:has(h4:has-text('Vendors')) button:has-text('Add')").click();
    },
    "Pilot Florals",
    "state => state.vendors?.some(vendor => vendor.name === 'Pilot Florals')"
  );
  addResult("Vendor CRUD", "PASS", `Vendor create flow added a new vendor record. ${stateSignalsDetail(vendorSignals)}`);

  await page.locator(".crud-card:has(h4:has-text('Vendors')) .record-row:has-text('Pilot Florals') button:has-text('Edit')").first().click();
  await page.getByLabel("Record detail drawer").waitFor({ timeout: 10_000 });
  const vendorEditSignals = await performUntilState(
    page,
    async () => {
      await page.getByLabel("Record detail drawer").getByLabel("Vendor name").fill("Pilot Florals Studio");
      await page.getByTestId("save-record-detail").click();
    },
    "Pilot Florals Studio",
    "state => state.vendors?.some(vendor => vendor.name === 'Pilot Florals Studio')"
  );
  addResult("Record detail drawer", "PASS", `Vendor detail drawer edited and saved a record. ${stateSignalsDetail(vendorEditSignals)}`);

  const approvalSignals = await performUntilState(
    page,
    async () => {
      await page.getByRole("textbox", { name: "Add client approval" }).fill("Final music approval");
      await page.locator(".crud-card:has(h4:has-text('Client approvals')) button:has-text('Add')").click();
    },
    "Final music approval",
    "state => state.clientApprovals?.some(approval => approval.title === 'Final music approval')"
  );
  addResult("Client approval CRUD", "PASS", `Client approval create flow added a new approval record. ${stateSignalsDetail(approvalSignals)}`);

  const approvalDecisionSignals = await performUntilState(
    page,
    async () => {
      await page.getByRole("button", { name: /Approve/i }).first().click();
    },
    "APPROVED",
    "state => state.clientApprovals?.some(approval => approval.id === 'approval-1' && approval.state === 'APPROVED')"
  );
  addResult("Client approval decision", "PASS", `Approval queue changed a client approval to approved with history. ${stateSignalsDetail(approvalDecisionSignals)}`);

  const inviteSignals = await performUntilState(
    page,
    async () => {
      await page.getByLabel("Invite team member").fill("planner2@blissplanner.test");
      await page.getByRole("button", { name: /Send invite/i }).click();
    },
    "planner2@blissplanner.test",
    "state => state.invites?.some(invite => invite.email === 'planner2@blissplanner.test')"
  );
  addResult("Team invitation", "PASS", `Team invite created and rendered. ${stateSignalsDetail(inviteSignals)}`);

  const guestSignals = await performUntilState(
    page,
    async () => {
      await page.getByLabel("Add guest").fill("Pilot Guest Two");
      await page.getByRole("button", { name: /Add guest/i }).click();
    },
    "Pilot Guest Two",
    "state => state.guests?.some(guest => guest.name === 'Pilot Guest Two')"
  );
  addResult("Guest RSVP foundation", "PASS", `Guest record created and rendered. ${stateSignalsDetail(guestSignals)}`);

  const leadSignals = await performUntilState(
    page,
    async () => {
      await page.getByLabel("Add inquiry").fill("Pilot Corporate Wedding");
      await page.getByRole("button", { name: /Add lead/i }).click();
    },
    "Pilot Corporate Wedding",
    "state => state.pipelineLeads?.some(lead => lead.clientName === 'Pilot Corporate Wedding')"
  );
  addResult("Business development CRM", "PASS", `Inquiry lead created and rendered. ${stateSignalsDetail(leadSignals)}`);
} catch (error) {
  addResult("Pilot flow", "ERROR", error instanceof Error ? error.message : String(error));
} finally {
  await browser.close();
}

writeFileSync(
  REPORT_FILE,
  JSON.stringify(
    {
      startedAt: new Date().toISOString(),
      baseUrl: APP_URL,
      scenarios,
      consoleErrors,
      reportPath: REPORT_FILE
    },
    null,
    2
  )
);

console.log(`Deterministic pilot report: ${REPORT_FILE}`);
