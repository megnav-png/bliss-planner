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

const seedState = {
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
      notes: "Deterministic vendor."
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
      notes: "Deterministic venue."
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
      linkedTaskIds: ["task-1"]
    }
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

  await page.getByRole("textbox", { name: "Add vendor" }).fill("Pilot Florals");
  await page.locator(".crud-card:has(h4:has-text('Vendors')) button:has-text('Add')").click();
  await waitForStoredState(page, "state => state.vendors?.some(vendor => vendor.name === 'Pilot Florals')");
  await page.getByLabel("Operational records").getByText("Pilot Florals").first().waitFor({ timeout: 10_000 });
  addResult("Vendor CRUD", "PASS", "Vendor create flow added a new vendor record.");

  await page.locator(".crud-card:has(h4:has-text('Vendors')) .record-row:has-text('Pilot Florals') button:has-text('Edit')").click();
  await page.getByLabel("Record detail drawer").waitFor({ timeout: 10_000 });
  await page.getByLabel("Record detail drawer").getByLabel("Vendor name").fill("Pilot Florals Studio");
  await page.getByTestId("save-record-detail").click();
  await waitForStoredState(page, "state => state.vendors?.some(vendor => vendor.name === 'Pilot Florals Studio')");
  await page.getByLabel("Operational records").getByText("Pilot Florals Studio").first().waitFor({ timeout: 10_000 });
  addResult("Record detail drawer", "PASS", "Vendor detail drawer edited and saved a record.");

  await page.getByRole("textbox", { name: "Add client approval" }).fill("Final music approval");
  await page.locator(".crud-card:has(h4:has-text('Client approvals')) button:has-text('Add')").click();
  await waitForStoredState(page, "state => state.clientApprovals?.some(approval => approval.title === 'Final music approval')");
  await page.getByLabel("Operational records").getByText("Final music approval").first().waitFor({ timeout: 10_000 });
  addResult("Client approval CRUD", "PASS", "Client approval create flow added a new approval record.");
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
