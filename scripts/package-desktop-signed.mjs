#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const projectRoot = process.cwd();
const profilePath = path.join(projectRoot, "phase7", "desktop-export-profile.json");
const required = ["APPLE_ID", "APPLE_APP_SPECIFIC_PASSWORD", "APPLE_TEAM_ID"];
const signingIdentityAvailable = Boolean(process.env.CSC_LINK || process.env.CSC_NAME);
const missing = required.filter((key) => !process.env[key]);

if (!existsSync(profilePath)) {
  throw new Error(`Missing export profile: ${profilePath}`);
}

if (missing.length > 0 || !signingIdentityAvailable) {
  console.error("Signed/notarized macOS packaging preflight failed.");
  console.error("Required environment:");
  console.error("- APPLE_ID");
  console.error("- APPLE_APP_SPECIFIC_PASSWORD");
  console.error("- APPLE_TEAM_ID");
  console.error("- CSC_LINK + CSC_KEY_PASSWORD, or CSC_NAME for an installed Developer ID Application certificate");
  console.error(`Missing: ${[...missing, signingIdentityAvailable ? "" : "CSC_LINK or CSC_NAME"].filter(Boolean).join(", ")}`);
  process.exit(1);
}

console.log("Running production web build before signed macOS packaging...");
const buildResult = spawnSync("npm", ["run", "build"], { cwd: projectRoot, stdio: "inherit" });
if (buildResult.status !== 0) {
  process.exit(buildResult.status || 1);
}

const profile = JSON.parse(readFileSync(profilePath, "utf8"));
const signedProfilePath = path.join(tmpdir(), `bliss-planner-electron-builder-signed-${Date.now()}.json`);
delete profile.mac.identity;
profile.mac.hardenedRuntime = true;
profile.mac.gatekeeperAssess = false;
profile.mac.notarize = {
  teamId: process.env.APPLE_TEAM_ID
};
writeFileSync(signedProfilePath, JSON.stringify(profile, null, 2));

console.log(`Packaging signed macOS build with profile: ${signedProfilePath}`);
const builder = path.join(projectRoot, "node_modules", ".bin", "electron-builder");
const packageResult = spawnSync(builder, ["--mac", "--config", signedProfilePath, "--publish=never"], {
  cwd: projectRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    CSC_IDENTITY_AUTO_DISCOVERY: process.env.CSC_IDENTITY_AUTO_DISCOVERY || "true"
  }
});

process.exit(packageResult.status || 0);
