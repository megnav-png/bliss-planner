#!/usr/bin/env node

import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const APP_URL = process.env.WOVOPS_APP_URL || process.env.BLISS_APP_URL || "https://bliss-planner.onrender.com";
const REPORT_FILE = path.join(tmpdir(), `bliss-planner-render-visual-qa-${Date.now()}.json`);
const STORAGE_KEY = "wovops.phase2.state";

const seedState = {
  profile: { name: "Visual QA Planner", email: "visual@blissplanner.test", businessName: "Visual QA Studio" },
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
      id: "visual-wedding",
      title: "Visual QA Wedding",
      date: "2026-11-14",
      timezone: "Asia/Kolkata",
      destination: "Goa, India",
      type: "DESTINATION_CULTURAL",
      status: "PLANNING",
      currency: "USD",
      guestTarget: 180,
      rsvpYes: 120,
      rsvpPending: 30,
      budget: { lines: [{ id: "budget-1", category: "Venue", planned: 100000, actual: 35000 }] },
      riskLevel: "MEDIUM",
      guestGroups: [{ id: "group-1", name: "Family", total: 90, vegetarian: 25, standard: 60, seafood: 5, roomNeed: 45 }],
      readinessItems: [
        { id: "ready-1", area: "VENDOR", label: "Caterer contract", owner: "Ops", status: "WATCH", score: 70, linkedTaskIds: [], notes: "Awaiting final count." },
        { id: "ready-2", area: "VENUE", label: "Venue hold", owner: "Planner", status: "READY", score: 90, linkedTaskIds: [], notes: "Hold confirmed." },
        { id: "ready-3", area: "DESTINATION", label: "Travel briefing", owner: "Guest Ops", status: "WATCH", score: 64, linkedTaskIds: [], notes: "Guide pending." }
      ],
      culturalChecklist: [{ id: "culture-1", label: "Welcome ritual briefing", culture: "Global guests", owner: "Client Experience", status: "TODO", linkedTaskIds: [] }],
      clientStatus: {
        relationshipOwner: "Visual QA Planner",
        approvalState: "CLIENT_REVIEW",
        nextClientUpdateAt: "2026-09-22",
        experienceScore: 82,
        sentiment: "ENGAGED",
        pendingDecisions: ["Menu sign-off"]
      },
      notes: "Visual QA seed."
    }
  ],
  tasks: [{ id: "task-1", weddingId: "visual-wedding", title: "Confirm caterer", owner: "Operations", priority: "HIGH", status: "IN_PROGRESS", dueAt: "2026-10-01", dependsOn: [], impacts: ["GUESTS", "BUDGET", "VENDORS"] }],
  vendors: [{ id: "vendor-1", weddingId: "visual-wedding", name: "Visual Caterers", category: "CATERING", owner: "Operations", status: "QUOTED", estimate: 65000, currency: "USD", linkedTaskIds: ["task-1"], notes: "Visual vendor." }],
  venues: [{ id: "venue-1", weddingId: "visual-wedding", name: "Visual Beach House", city: "Goa", country: "India", status: "HOLD", capacity: 200, curfew: "23:00", linkedTaskIds: [], notes: "Visual venue." }],
  destinations: [{ id: "destination-1", weddingId: "visual-wedding", name: "Visual destination profile", region: "South Asia", travelRisk: "MEDIUM", visaNotes: "Check visas.", weatherNotes: "Check season.", culturalNotes: "Brief guests.", linkedTaskIds: [] }],
  clientApprovals: [{ id: "approval-1", weddingId: "visual-wedding", title: "Menu sign-off", owner: "Visual QA Planner", state: "CLIENT_REVIEW", dueAt: "2026-09-22", linkedTaskIds: ["task-1"] }],
  activeWeddingId: "visual-wedding",
  onboarded: true
};

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "mobile", width: 390, height: 844 }
];

const browser = await chromium.launch({ headless: true });
const checks = [];
const consoleErrors = [];

const portalChecks = [
  { path: "/client", heading: "Client portal", text: "Approval center" },
  { path: "/vendor", heading: "Vendor portal", text: "Vendor task board" }
];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    await context.addInitScript(
      ({ storageKey, state }) => {
        window.localStorage.setItem(storageKey, JSON.stringify(state));
      },
      { storageKey: STORAGE_KEY, state: seedState }
    );
    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(`${viewport.name}: ${message.text()}`);
    });
    page.on("pageerror", (error) => consoleErrors.push(`${viewport.name}: ${error.message}`));
    await page.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 25_000 });
    await page.getByRole("heading", { name: "Bliss Planner Dashboard" }).waitFor({ timeout: 20_000 });
    await page.getByTestId("deploy-version-marker").waitFor({ timeout: 10_000 });
    await page.getByLabel("Operational records").waitFor({ timeout: 10_000 });
    await page.getByText("Visual Caterers").waitFor({ timeout: 10_000 });

    const metrics = await page.evaluate(() => {
      const body = document.body;
      const horizontalOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
      const overlayText = document.querySelector("[data-nextjs-dialog-overlay], nextjs-portal")?.textContent || "";
      return {
        bodyTextLength: body.innerText.length,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        horizontalOverflow,
        deployMarker: document.querySelector("[data-testid='deploy-version-marker']")?.textContent || "",
        hasFrameworkOverlay: /Unhandled Runtime Error|Build Error|Application error|Failed to compile/i.test(overlayText)
      };
    });

    checks.push({
      viewport: viewport.name,
      size: `${viewport.width}x${viewport.height}`,
      status: metrics.bodyTextLength > 500 && !metrics.horizontalOverflow && !metrics.hasFrameworkOverlay ? "PASS" : "REVIEW",
      metrics
    });
    await context.close();
  }

  const portalContext = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  for (const portal of portalChecks) {
    const page = await portalContext.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(`${portal.path}: ${message.text()}`);
    });
    page.on("pageerror", (error) => consoleErrors.push(`${portal.path}: ${error.message}`));
    await page.goto(new URL(portal.path, APP_URL).toString(), { waitUntil: "domcontentloaded", timeout: 25_000 });
    await page.getByText(portal.heading).waitFor({ timeout: 10_000 });
    await page.getByText(portal.text).waitFor({ timeout: 10_000 });
    checks.push({
      viewport: portal.path,
      size: "1280x820",
      status: "PASS",
      metrics: {
        bodyTextLength: await page.evaluate(() => document.body.innerText.length),
        scrollWidth: await page.evaluate(() => document.documentElement.scrollWidth),
        clientWidth: await page.evaluate(() => document.documentElement.clientWidth),
        horizontalOverflow: await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1),
        deployMarker: "portal",
        hasFrameworkOverlay: false
      }
    });
    await page.close();
  }
  await portalContext.close();
} finally {
  await browser.close();
}

const report = {
  appUrl: APP_URL,
  checks,
  consoleErrors,
  reportPath: REPORT_FILE
};

writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
console.log(`Render visual QA report: ${REPORT_FILE}`);

if (checks.some((check) => check.status !== "PASS") || consoleErrors.length > 0) {
  process.exitCode = 1;
}
