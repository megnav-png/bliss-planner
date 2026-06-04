#!/usr/bin/env node

import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const APP_URL = process.env.BLISS_APP_URL || process.env.WOVOPS_APP_URL || "https://bliss-planner.onrender.com";
const REPORT_FILE = path.join(tmpdir(), `bliss-planner-portal-ux-pass-${Date.now()}.json`);
const STORAGE_KEY = "wovops.phase2.state";

const sampleState = {
  profile: { name: "Render UX Planner", email: "planner@blissplanner.test", businessName: "Render UX Studio" },
  workspace: {
    id: "render-ux-workspace",
    name: "Render UX Studio",
    ownerUserId: "render-ux-owner",
    region: "Global",
    dataResidency: "United States",
    authProvider: "GOOGLE",
    createdAt: "2026-06-04T00:00:00.000Z"
  },
  users: [
    { id: "render-ux-owner", workspaceId: "render-ux-workspace", name: "Render UX Planner", email: "planner@blissplanner.test", role: "OWNER", status: "ACTIVE", portalAccess: "FULL_WORKSPACE" },
    { id: "render-ux-client", workspaceId: "render-ux-workspace", name: "Sample Client", email: "client@blissplanner.test", role: "CLIENT", status: "ACTIVE", portalAccess: "CLIENT_PORTAL" },
    { id: "render-ux-vendor", workspaceId: "render-ux-workspace", name: "Sample Vendor", email: "vendor@blissplanner.test", role: "VENDOR", status: "ACTIVE", portalAccess: "VENDOR_PORTAL" }
  ],
  invites: [],
  session: { userId: "render-ux-owner", workspaceId: "render-ux-workspace", role: "OWNER", issuedAt: "2026-06-04T00:00:00.000Z", expiresAt: "2026-06-05T00:00:00.000Z" },
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
      id: "render-ux-wedding",
      title: "Render UX Wedding",
      date: "2026-12-18",
      timezone: "Asia/Kolkata",
      destination: "Udaipur, India",
      type: "DESTINATION_CULTURAL",
      status: "PLANNING",
      currency: "USD",
      guestTarget: 140,
      rsvpYes: 88,
      rsvpPending: 32,
      budget: { lines: [{ id: "budget-ux", category: "Venue", planned: 90000, actual: 25000 }] },
      riskLevel: "MEDIUM",
      guestGroups: [],
      readinessItems: [],
      culturalChecklist: [],
      clientStatus: {
        relationshipOwner: "Render UX Planner",
        approvalState: "CLIENT_REVIEW",
        nextClientUpdateAt: "2026-08-10",
        experienceScore: 84,
        sentiment: "ENGAGED",
        pendingDecisions: ["Design board"]
      },
      notes: "Live Render UX pass seed."
    }
  ],
  tasks: [{ id: "render-ux-task", weddingId: "render-ux-wedding", title: "Confirm sample vendor update", owner: "Planner", priority: "HIGH", status: "IN_PROGRESS", dueAt: "2026-08-01", dependsOn: [], impacts: ["VENDORS"] }],
  vendors: [{ id: "render-ux-vendor-record", weddingId: "render-ux-wedding", name: "Sample Caterer", category: "CATERING", owner: "Planner", status: "QUOTED", estimate: 42000, currency: "USD", linkedTaskIds: ["render-ux-task"], notes: "Sample vendor for live UX pass." }],
  venues: [],
  destinations: [],
  clientApprovals: [{ id: "render-ux-approval", weddingId: "render-ux-wedding", title: "Design board", owner: "Planner", state: "CLIENT_REVIEW", dueAt: "2026-08-10", linkedTaskIds: [], comments: [], history: [], files: [] }],
  guests: [],
  seatingTables: [],
  pipelineLeads: [],
  auditLogs: [],
  analytics: [],
  activeWeddingId: "render-ux-wedding",
  onboarded: true
};

const checks = [];
const consoleErrors = [];

function addCheck(name, status, details) {
  checks.push({ name, status, details });
}

async function assertPortalEntry(page, route, allowedHeading, protectedHeading) {
  await page.goto(new URL(route, APP_URL).toString(), { waitUntil: "domcontentloaded", timeout: 25_000 });
  const bodyText = await page.locator("body").innerText({ timeout: 10_000 });
  if (bodyText.includes(allowedHeading)) {
    return { mode: "authorized", bodyTextLength: bodyText.length };
  }
  if (protectedHeading.test(bodyText) && bodyText.includes("Sign in") && bodyText.includes("Planner dashboard")) {
    return { mode: "protected", bodyTextLength: bodyText.length };
  }
  throw new Error(`${route} did not render authorized or protected portal UX.`);
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await context.addInitScript(
    ({ storageKey, state }) => window.localStorage.setItem(storageKey, JSON.stringify(state)),
    { storageKey: STORAGE_KEY, state: sampleState }
  );

  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 25_000 });
  await page.getByRole("heading", { name: "Bliss Planner Dashboard" }).waitFor({ timeout: 20_000 });
  await page.getByText("Sample Caterer").waitFor({ timeout: 10_000 });
  await page.getByText("Team and portal access").waitFor({ timeout: 10_000 });
  addCheck("Planner dashboard with sample client/vendor records", "PASS", "Dashboard rendered seeded planner workflow on live Render.");

  for (const portal of [
    { route: "/client", allowedHeading: "Client portal", protectedHeading: /Sign in required|Client portal access required/i },
    { route: "/vendor", allowedHeading: "Vendor portal", protectedHeading: /Sign in required|Vendor portal access required/i },
    { route: "/admin", allowedHeading: "Relay audit and monitoring", protectedHeading: /Sign in required|Admin access required/i }
  ]) {
    const result = await assertPortalEntry(page, portal.route, portal.allowedHeading, portal.protectedHeading);
    addCheck(`${portal.route} portal entry`, "PASS", result);
  }

  await context.close();
} catch (error) {
  addCheck("Render planner portal UX pass", "FAIL", error instanceof Error ? error.message : String(error));
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
console.log(`Render portal UX pass report: ${REPORT_FILE}`);

if (checks.some((check) => check.status !== "PASS") || consoleErrors.length > 0) {
  process.exitCode = 1;
}
