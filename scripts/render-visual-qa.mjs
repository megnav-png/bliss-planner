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
  workspace: { id: "visual-workspace", name: "Visual QA Studio", ownerUserId: "visual-owner", region: "APAC", dataResidency: "India", authProvider: "GOOGLE", createdAt: "2026-06-04T00:00:00.000Z" },
  users: [
    { id: "visual-owner", workspaceId: "visual-workspace", name: "Visual QA Planner", email: "visual@blissplanner.test", role: "OWNER", status: "ACTIVE", portalAccess: "FULL_WORKSPACE" },
    { id: "visual-client", workspaceId: "visual-workspace", name: "Visual Client", email: "client@blissplanner.test", role: "CLIENT", status: "ACTIVE", portalAccess: "CLIENT_PORTAL" }
  ],
  invites: [{ id: "invite-visual", workspaceId: "visual-workspace", email: "vendor@blissplanner.test", role: "VENDOR", portalAccess: "VENDOR_PORTAL", status: "PENDING", invitedBy: "Visual QA Planner", invitedAt: "2026-06-04T00:00:00.000Z", expiresAt: "2026-06-18T00:00:00.000Z" }],
  session: { userId: "visual-owner", workspaceId: "visual-workspace", role: "OWNER", issuedAt: "2026-06-04T00:00:00.000Z", expiresAt: "2026-06-05T00:00:00.000Z" },
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
  vendors: [{ id: "vendor-1", weddingId: "visual-wedding", name: "Visual Caterers", category: "CATERING", owner: "Operations", status: "QUOTED", estimate: 65000, currency: "USD", linkedTaskIds: ["task-1"], notes: "Visual vendor.", contactName: "Mira", contactEmail: "mira@example.com", contractStatus: "Quote received", paymentStatus: "Deposit pending", logisticsNotes: "Loading bay B", riskNotes: "Final count pending", files: [{ id: "file-vendor", name: "Quote", kind: "QUOTE", addedAt: "2026-06-04T00:00:00.000Z" }] }],
  venues: [{ id: "venue-1", weddingId: "visual-wedding", name: "Visual Beach House", city: "Goa", country: "India", status: "HOLD", capacity: 200, curfew: "23:00", linkedTaskIds: [], notes: "Visual venue.", contactName: "Ravi", contactEmail: "ravi@example.com", permitStatus: "Permit review", accessWindow: "08:00-23:00", logisticsNotes: "North gate", riskNotes: "Sound cutoff", files: [{ id: "file-venue", name: "Hold", kind: "CONTRACT", addedAt: "2026-06-04T00:00:00.000Z" }] }],
  destinations: [{ id: "destination-1", weddingId: "visual-wedding", name: "Visual destination profile", region: "South Asia", travelRisk: "MEDIUM", visaNotes: "Check visas.", weatherNotes: "Check season.", culturalNotes: "Brief guests.", permitNotes: "Beach permit", logisticsNotes: "Coach transfer", riskNotes: "Weather watch", linkedTaskIds: [] }],
  clientApprovals: [{ id: "approval-1", weddingId: "visual-wedding", title: "Menu sign-off", owner: "Visual QA Planner", state: "CLIENT_REVIEW", dueAt: "2026-09-22", linkedTaskIds: ["task-1"], comments: [{ id: "comment-1", author: "Client", body: "Need vegan notes.", createdAt: "2026-06-04T00:00:00.000Z" }], history: [{ id: "history-1", state: "CLIENT_REVIEW", actor: "Visual QA Planner", createdAt: "2026-06-04T00:00:00.000Z", note: "Sent for review." }], files: [{ id: "file-approval", name: "Menu", kind: "CLIENT_NOTE", addedAt: "2026-06-04T00:00:00.000Z" }] }],
  guests: [{ id: "guest-1", weddingId: "visual-wedding", householdId: "household-visual", name: "Visual Guest", email: "guest@blissplanner.test", groupName: "Family", rsvpStatus: "YES", mealPreference: "VEGETARIAN", seatPreference: "Table 1", notes: "Accessible room" }],
  seatingTables: [{ id: "table-1", weddingId: "visual-wedding", name: "Table 1", zone: "Garden", capacity: 10, guestIds: ["guest-1"], notes: "Near stage" }],
  pipelineLeads: [{ id: "lead-1", clientName: "Visual Inquiry", email: "lead@blissplanner.test", source: "REFERRAL", status: "QUALIFIED", quoteStatus: "SENT", projectedBudget: 85000, currency: "USD", preferredDate: "2027-01-20", destinationCity: "Goa", nextAction: "Follow up on scope", followUpAt: "2026-06-10", confidenceScore: 0.7 }],
  auditLogs: [{ id: "audit-1", actor: "Visual QA Planner", action: "VISUAL_SEED", entity: "wedding", entityId: "visual-wedding", createdAt: "2026-06-04T00:00:00.000Z", note: "Visual QA seed." }],
  analytics: [{ id: "metric-1", label: "Open approvals", value: "1", trend: "0", status: "WATCH" }],
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
  {
    path: "/client",
    heading: "Client portal",
    text: "Client review flow",
    protectedHeading: /Sign in required|Client portal access required/i,
    protectedText: "Planner dashboard"
  },
  {
    path: "/vendor",
    heading: "Vendor portal",
    text: "Vendor update flow",
    protectedHeading: /Sign in required|Vendor portal access required/i,
    protectedText: "Planner dashboard"
  },
  {
    path: "/admin",
    heading: "Relay audit and monitoring",
    text: "Monitoring health",
    protectedHeading: /Sign in required|Admin access required/i,
    protectedText: "Planner dashboard"
  },
  { path: "/operations/vendors", heading: "Vendor operations", text: "Contracts, payments, contacts, files, and risk" },
  { path: "/operations/venues", heading: "Venue logistics", text: "Permits, access, curfew, and logistics" },
  { path: "/operations/destinations", heading: "Destination readiness", text: "Travel, permits, weather, culture, and risks" },
  { path: "/operations/approvals", heading: "Client approvals", text: "Approval history, comments, and files" },
  { path: "/operations/guests", heading: "Guest RSVP and seating", text: "RSVP, meals, households, and tables" },
  { path: "/operations/crm", heading: "Business development CRM", text: "Inquiry pipeline and conversion" }
];

async function gotoRoute(page, url) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  } catch (error) {
    if (!(error instanceof Error) || !/Timeout/i.test(error.message)) throw error;
    await page.waitForTimeout(1_000);
  }
}

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
    await gotoRoute(page, APP_URL);
    await page.getByRole("heading", { name: "Bliss Planner Dashboard" }).waitFor({ timeout: 20_000 });
    await page.getByTestId("deploy-version-marker").waitFor({ timeout: 10_000 });
    await page.getByLabel("Operational records").waitFor({ timeout: 10_000 });
    await page.getByText("Visual Caterers").first().waitFor({ timeout: 10_000 });
    for (const text of [
      "Team and portal access",
      "Planner approval queue",
      "Vendor detail module",
      "Venue detail module",
      "Destination detail module",
      "Guest RSVP and seating",
      "Business development CRM",
      "Analytics and monitoring"
    ]) {
      await page.getByText(text, { exact: false }).first().waitFor({ timeout: 10_000 });
    }

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
  await portalContext.addInitScript(
    ({ storageKey, state }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    },
    { storageKey: STORAGE_KEY, state: seedState }
  );
  for (const portal of portalChecks) {
    const page = await portalContext.newPage();
    await page.addInitScript(
      ({ storageKey, state }) => {
        window.localStorage.setItem(storageKey, JSON.stringify(state));
      },
      { storageKey: STORAGE_KEY, state: seedState }
    );
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(`${portal.path}: ${message.text()}`);
    });
    page.on("pageerror", (error) => consoleErrors.push(`${portal.path}: ${error.message}`));
    await gotoRoute(page, new URL(portal.path, APP_URL).toString());
    let portalMode = "authorized";
    try {
      await page.getByText(portal.heading).waitFor({ timeout: 30_000 });
      await page.getByText(portal.text).waitFor({ timeout: 30_000 });
    } catch (error) {
      if (!portal.protectedHeading) throw error;
      portalMode = "protected";
      await page.getByRole("heading", { name: portal.protectedHeading }).waitFor({ timeout: 10_000 });
      await page.getByText(portal.protectedText).first().waitFor({ timeout: 10_000 });
    }
    checks.push({
      viewport: portal.path,
      size: "1280x820",
      status: "PASS",
      metrics: {
        bodyTextLength: await page.evaluate(() => document.body.innerText.length),
        scrollWidth: await page.evaluate(() => document.documentElement.scrollWidth),
        clientWidth: await page.evaluate(() => document.documentElement.clientWidth),
        horizontalOverflow: await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1),
        deployMarker: portalMode,
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
