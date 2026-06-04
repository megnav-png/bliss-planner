#!/usr/bin/env node

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

function readGitCommit() {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "local";
  }
}

const projectRoot = process.cwd();
const packageVersion = process.env.npm_package_version || "0.1.0";
const commit =
  process.env.NEXT_PUBLIC_RENDER_GIT_COMMIT ||
  process.env.RENDER_GIT_COMMIT ||
  process.env.NEXT_PUBLIC_BLISS_COMMIT ||
  readGitCommit();
const service =
  process.env.NEXT_PUBLIC_RENDER_SERVICE_NAME ||
  process.env.RENDER_SERVICE_NAME ||
  process.env.NEXT_PUBLIC_BLISS_SERVICE ||
  "local";
const environment = process.env.RENDER ? "render" : process.env.NODE_ENV || "development";

const outputPath = path.join(projectRoot, "src", "lib", "generatedBuildInfo.ts");
mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(
  outputPath,
  `export const generatedBuildInfo = ${JSON.stringify(
    {
      version: process.env.NEXT_PUBLIC_BLISS_VERSION || packageVersion,
      commit,
      environment,
      service
    },
    null,
    2
  )} as const;\n`
);
