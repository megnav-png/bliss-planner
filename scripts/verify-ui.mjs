import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  // Fallback for runtime environments that only keep dependency cache in the codex runtime folder.
  ({ chromium } = require("/Users/megnav/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"));
}

const baseUrl = process.env.WOVOPS_APP_URL || "http://localhost:4173";
const outDir = resolve(process.env.WOVOPS_OUTPUT_DIR || tmpdir());
const desktopPath = `${outDir}/wovops-desktop.png`;
const mobilePath = `${outDir}/wovops-mobile.png`;

const browserArgs = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--no-first-run",
  "--no-default-browser-check"
];

let browser;
try {
  browser = await chromium.launch({
    headless: true,
    args: browserArgs
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    JSON.stringify(
      {
        error: "BROWSER_LAUNCH_FAILED",
        message,
        suggestion:
          "Run this check on a host where Playwright can launch Chromium (or set WOVOPS_PILOT_EXECUTABLE to a permitted Chrome binary)."
      },
      null,
      2
    )
  );
  process.exit(1);
}

const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];

page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
await page.screenshot({ path: desktopPath, fullPage: true });

const desktop = await page.evaluate(() => ({
  title: document.title,
  cards: document.querySelectorAll(".wedding-card").length,
  metrics: document.querySelectorAll(".metric").length,
  timelineRows: document.querySelectorAll(".timeline-row").length,
  bodyWidth: document.documentElement.scrollWidth,
  viewportWidth: innerWidth,
  active: document.querySelector(".wedding-card.active strong")?.textContent,
  tableRows: document.querySelectorAll("tbody tr").length
}));

await page.click('[data-id="w3"]');
await page.click('[data-node="guests"]');
await page.click('[data-view="business"]');

const interaction = await page.evaluate(() => ({
  active: document.querySelector(".wedding-card.active strong")?.textContent,
  insight: document.querySelector("#schemaInsight")?.textContent,
  tableRows: document.querySelectorAll("tbody tr").length,
  firstLead: document.querySelector("tbody tr td strong")?.textContent
}));

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
await page.screenshot({ path: mobilePath, fullPage: true });

const mobile = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  viewportWidth: innerWidth,
  bottomNav: getComputedStyle(document.querySelector(".rail")).position,
  cards: document.querySelectorAll(".wedding-card").length
}));

await browser.close();

console.log(
  JSON.stringify(
    {
      baseUrl,
      desktop,
      interaction,
      mobile,
      errors,
      screenshots: { desktop: desktopPath, mobile: mobilePath }
    },
    null,
    2
  )
);
