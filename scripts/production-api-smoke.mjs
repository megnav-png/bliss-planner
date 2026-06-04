#!/usr/bin/env node

const appUrl = (process.env.BLISS_APP_URL || "https://bliss-planner.onrender.com").replace(/\/$/, "");
const report = {
  appUrl,
  checks: [],
  startedAt: new Date().toISOString()
};

async function check(name, fn) {
  try {
    const details = await fn();
    report.checks.push({ name, status: "PASS", details });
  } catch (error) {
    report.checks.push({ name, status: "FAIL", details: error instanceof Error ? error.message : String(error) });
  }
}

async function json(path, init) {
  const response = await fetch(`${appUrl}${path}`, init);
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

await check("production health", async () => {
  const { response, body } = await json("/api/production/health");
  if (!response.ok || !body.ok) throw new Error(`Health failed: ${response.status}`);
  return body.productionStore;
});

await check("monitoring health includes production store", async () => {
  const { response, body } = await json("/api/monitoring/health");
  if (!response.ok || !body.productionStore) throw new Error("Production store missing from monitoring health.");
  return {
    commit: body.commit,
    productionStore: body.productionStore,
    fileStorage: body.fileStorage,
    billingProviderConfigured: body.billingProviderConfigured
  };
});

await check("records read endpoint", async () => {
  const { response, body } = await json("/api/records/weddings?workspaceId=default-workspace");
  if (!response.ok || !body.ok || !Array.isArray(body.records)) throw new Error(`Records read failed: ${response.status}`);
  return { entity: body.entity, count: body.records.length };
});

await check("client portal protected without cookie", async () => {
  const { response, body } = await json("/api/portal/client");
  if (![401, 403].includes(response.status) || body.ok !== false) throw new Error(`Expected protected client portal, got ${response.status}`);
  return { status: response.status, error: body.error };
});

await check("vendor portal protected without cookie", async () => {
  const { response, body } = await json("/api/portal/vendor");
  if (![401, 403].includes(response.status) || body.ok !== false) throw new Error(`Expected protected vendor portal, got ${response.status}`);
  return { status: response.status, error: body.error };
});

console.log(JSON.stringify(report, null, 2));
if (report.checks.some((item) => item.status !== "PASS")) {
  process.exitCode = 1;
}
