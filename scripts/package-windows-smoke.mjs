#!/usr/bin/env node

import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const projectRoot = process.cwd();
const profilePath = path.join(projectRoot, "phase7", "desktop-export-profile.json");
const builder = path.join(projectRoot, "node_modules", ".bin", process.platform === "win32" ? "electron-builder.cmd" : "electron-builder");

if (!existsSync(profilePath)) {
  throw new Error(`Missing export profile: ${profilePath}`);
}

if (!existsSync(builder)) {
  console.error("electron-builder is not installed locally. Run npm install first.");
  process.exit(1);
}

console.log("Running production web build before Windows packaging smoke...");
const buildResult = spawnSync("npm", ["run", "build"], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: process.platform === "win32"
});
if (buildResult.status !== 0) {
  process.exit(buildResult.status || 1);
}

console.log("Running Windows packaging smoke with electron-builder --win --dir.");
const smokeResult = spawnSync(builder, ["--win", "--dir", "--config", profilePath, "--publish=never"], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    CSC_IDENTITY_AUTO_DISCOVERY: "false"
  }
});

if (smokeResult.status !== 0) {
  console.error("Windows packaging smoke failed. On macOS this usually means Wine/Windows icon tooling is missing.");
  process.exit(smokeResult.status || 1);
}

console.log("Windows packaging smoke completed.");
