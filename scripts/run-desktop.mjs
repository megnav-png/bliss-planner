#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const electronCandidatePaths = [
  path.join(projectRoot, "node_modules", ".bin", process.platform === "win32" ? "electron.cmd" : "electron"),
  path.join(projectRoot, "node_modules", "electron", "dist", "electron")
];
const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";

function resolveElectronBinary() {
  const localBinary = electronCandidatePaths.find((p) => existsSync(p));
  if (localBinary) return localBinary;

  return null;
}

const host = process.env.BLISS_APP_HOST || process.env.WOVOPS_APP_HOST || "127.0.0.1";
const port = process.env.BLISS_APP_PORT || process.env.WOVOPS_APP_PORT || "3002";

const env = {
  ...process.env,
  BLISS_APP_HOST: host,
  BLISS_APP_PORT: port,
  BLISS_DESKTOP_START_SERVER: process.env.BLISS_DESKTOP_START_SERVER || process.env.WOVOPS_DESKTOP_START_SERVER || "true"
};

const electronBinary = resolveElectronBinary();
const desktopMain = path.join(projectRoot, "desktop", "main.cjs");
const electronArgs = [desktopMain];

if (!existsSync(desktopMain)) {
  console.error("Desktop entrypoint missing:", desktopMain);
  process.exit(1);
}

if (electronBinary) {
  const child = spawn(electronBinary, electronArgs, {
    cwd: projectRoot,
    stdio: "inherit",
    env
  });

  child.on("error", (err) => {
    console.error("Failed to launch desktop shell:", err.message);
    process.exit(1);
  });
} else {
  console.log("Electron is not installed locally. Falling back to npx electron download.");
  const child = spawn(npxBin, ["-y", "electron@latest", ...electronArgs], {
    cwd: projectRoot,
    stdio: "inherit",
    env
  });

  child.on("error", (err) => {
    console.error("Failed to launch desktop shell via npx:", err.message);
    console.error("Install locally with: npm i -D electron");
    process.exit(1);
  });
}
