#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const projectRoot = process.cwd();
const profilePath = path.join(projectRoot, "phase7", "desktop-export-profile.json");
const builder = path.join(projectRoot, "node_modules", ".bin", process.platform === "win32" ? "electron-builder.cmd" : "electron-builder");
const certificateLink = process.env.WIN_CSC_LINK || process.env.CSC_LINK;
const certificatePassword = process.env.WIN_CSC_KEY_PASSWORD || process.env.CSC_KEY_PASSWORD;
const missing = [];

if (!existsSync(profilePath)) {
  throw new Error(`Missing export profile: ${profilePath}`);
}

if (!existsSync(builder)) {
  console.error("electron-builder is not installed locally. Run npm install first.");
  process.exit(1);
}

if (!certificateLink) {
  missing.push("WIN_CSC_LINK or CSC_LINK");
}

if (!certificatePassword) {
  missing.push("WIN_CSC_KEY_PASSWORD or CSC_KEY_PASSWORD");
}

if (missing.length > 0) {
  console.error("Signed Windows installer preflight failed.");
  console.error("Required environment:");
  console.error("- WIN_CSC_LINK or CSC_LINK pointing to a .p12/.pfx certificate path, base64 data, or HTTPS certificate URL");
  console.error("- WIN_CSC_KEY_PASSWORD or CSC_KEY_PASSWORD for the certificate");
  console.error("- Optional WIN_CERT_SUBJECT_NAME when selecting a certificate from the Windows store");
  console.error(`Missing: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("Running production web build before signed Windows packaging...");
const buildResult = spawnSync("npm", ["run", "build"], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: process.platform === "win32"
});

if (buildResult.status !== 0) {
  process.exit(buildResult.status || 1);
}

const profile = JSON.parse(readFileSync(profilePath, "utf8"));
const signedProfilePath = path.join(tmpdir(), `bliss-planner-electron-builder-win-signed-${Date.now()}.json`);
profile.win = {
  ...profile.win,
  certificateSubjectName: process.env.WIN_CERT_SUBJECT_NAME || profile.win?.certificateSubjectName,
  signingHashAlgorithms: ["sha256"]
};
writeFileSync(signedProfilePath, JSON.stringify(profile, null, 2));

console.log(`Packaging signed Windows installer with profile: ${signedProfilePath}`);
const packageResult = spawnSync(builder, ["--win", "--config", signedProfilePath, "--publish=never"], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    CSC_LINK: certificateLink,
    CSC_KEY_PASSWORD: certificatePassword
  }
});

process.exit(packageResult.status || 0);
