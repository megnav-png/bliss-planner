#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const projectRoot = process.cwd();
const profilePath = path.join(projectRoot, "phase7", "desktop-export-profile.json");
const shellMode = process.platform === "win32";

const ELECTRON_BUILDER = process.env.BLISS_ELECTRON_BUILDER || process.env.WOVOPS_ELECTRON_BUILDER || "electron-builder";
const ALLOW_NPX_FALLBACK = String(process.env.BLISS_ALLOW_NPX_PACKAGER || process.env.WOVOPS_ALLOW_NPX_PACKAGER || "false").toLowerCase() === "true";

const npx = process.platform === "win32" ? "npx.cmd" : "npx";

const builderCandidates = [
  path.join(projectRoot, "node_modules", ".bin", process.platform === "win32" ? "electron-builder.cmd" : "electron-builder"),
  path.join(projectRoot, "node_modules", "electron-builder", "out", "cli", "cli.js"),
  path.join(projectRoot, "node_modules", "electron-builder", "bin", "electron-builder.js")
];

if (!existsSync(profilePath)) {
  throw new Error(`Missing export profile: ${profilePath}`);
}

const profile = JSON.parse(readFileSync(profilePath, "utf8"));

console.log("Running production web build before desktop packaging...");
const buildResult = spawnSync("npm", ["run", "build"], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: shellMode
});
if (buildResult.status !== 0) {
  process.exit(buildResult.status || 1);
}

console.log(`Packaging with profile: ${profilePath}`);

const packageArgs = ["--config", profilePath, "--publish=never"];

const localBuilder = resolveBuilderPath();

if (localBuilder) {
  const isJs = localBuilder.endsWith(".js");
  const packageResult = spawnSync(isJs ? process.execPath : localBuilder, isJs ? [localBuilder, ...packageArgs] : packageArgs, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: shellMode
  });

  if (packageResult.status !== 0) {
    process.exit(packageResult.status || 1);
  }
} else {
  if (!ALLOW_NPX_FALLBACK) {
    console.error("electron-builder binary not found locally.");
    console.error("Install dependencies and retry:");
    console.error("npm install -D electron electron-builder");
    console.error("Or set BLISS_ALLOW_NPX_PACKAGER=true and retry to fetch builder remotely.");
    process.exit(1);
  }

  console.log("Local electron-builder not found. Falling back to npx.");
  const packageResult = spawnSync(npx, ["-y", ELECTRON_BUILDER, ...packageArgs], {
    cwd: projectRoot,
    stdio: "inherit",
    shell: shellMode
  });

  if (packageResult.status !== 0) {
    process.exit(packageResult.status || 1);
  }
}

console.log(`Release package created. Output directory: ${profile.directories?.output || "release"}`);

function resolveBuilderPath() {
  for (const candidate of builderCandidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}
