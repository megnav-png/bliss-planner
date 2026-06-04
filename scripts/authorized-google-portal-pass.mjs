#!/usr/bin/env node

import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const APP_URL = (process.env.BLISS_APP_URL || "https://bliss-planner.onrender.com").replace(/\/$/, "");
const ROLE = (process.env.BLISS_TEST_ROLE || "planner").toLowerCase();
const HEADLESS = process.env.HEADLESS === "true";
const REPORT_FILE = path.join(tmpdir(), `bliss-planner-authorized-${ROLE}-portal-${Date.now()}.json`);

const roleRoutes = {
  admin: { route: "/admin", expected: /Relay audit and monitoring|Admin access required/i },
  planner: { route: "/", expected: /Bliss Planner Dashboard/i },
  client: { route: "/client", expected: /Client portal/i },
  vendor: { route: "/vendor", expected: /Vendor portal/i }
};

const target = roleRoutes[ROLE] || roleRoutes.planner;
const report = {
  appUrl: APP_URL,
  role: ROLE,
  route: target.route,
  checks: [],
  consoleErrors: [],
  reportPath: REPORT_FILE
};

function addCheck(name, status, details) {
  report.checks.push({ name, status, details });
}

const browser = await chromium.launch({ headless: HEADLESS });
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await context.newPage();
page.on("console", (message) => {
  if (message.type() === "error") report.consoleErrors.push(message.text());
});
page.on("pageerror", (error) => report.consoleErrors.push(error.message));

try {
  await page.goto(`${APP_URL}${target.route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const body = await page.locator("body").innerText({ timeout: 30_000 });

  if (/Sign in required/i.test(body)) {
    if (HEADLESS) {
      throw new Error("Sign-in required. Run without HEADLESS=true to complete Google login interactively.");
    }
    await page.getByRole("link", { name: /sign in/i }).click();
    console.log(`Complete Google sign-in for ${ROLE}, then return here. Waiting up to 3 minutes...`);
    await page.waitForURL((url) => url.origin === new URL(APP_URL).origin, { timeout: 180_000 });
    await page.goto(`${APP_URL}${target.route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  }

  await page.getByText(target.expected).first().waitFor({ timeout: 30_000 });
  const finalText = await page.locator("body").innerText({ timeout: 10_000 });
  if (/access required|sign in required/i.test(finalText) && ROLE !== "admin") {
    throw new Error(`Signed in, but ${ROLE} still does not have required portal access.`);
  }
  addCheck("authorized portal route", "PASS", {
    url: page.url(),
    bodyTextLength: finalText.length
  });
} catch (error) {
  addCheck("authorized portal route", "FAIL", error instanceof Error ? error.message : String(error));
} finally {
  await browser.close();
}

writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
console.log(`Authorized Google portal report: ${REPORT_FILE}`);

if (report.checks.some((item) => item.status !== "PASS") || report.consoleErrors.length > 0) {
  process.exitCode = 1;
}
