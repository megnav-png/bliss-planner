# Phase 7 — Desktop Packaging Profile

This phase introduces a desktop execution wrapper and formal release path.

## What was added
- **Desktop shell** (`desktop/main.cjs`)  
  Wraps the web app in an Electron shell, launches Next locally on start, and serves the app via a local URL.
- **Launcher script** (`scripts/run-desktop.mjs`)  
  Single command to launch the desktop shell.
- **Packaging script** (`scripts/package-desktop.mjs`)  
  Builds web artifacts and runs `electron-builder` using the export profile.
- **Export profile** (`phase7/desktop-export-profile.json`)  
  Defines package IDs, output targets, icons, artifact names, and OS targets.
- **Sync backend architecture** (`phase7/SYNC_BACKEND_ARCHITECTURE.md`)  
  Defines the optional encrypted relay approach for cross-device continuity without storing readable planner data.
- **Release/Install docs** (`phase7/INSTALL_DESKTOP.md`, `phase7/RELEASE_CHECKLIST.md`)

## Quick commands
- Launch desktop shell:
  ```bash
  npm run phase7:desktop:launch
  ```
- Produce installer artifacts:
  ```bash
  npm run phase7:desktop:package
  ```

## Rollback
- If desktop launch fails, run web-only first and confirm `npm run build` succeeds:
  ```bash
  npm run phase6:pilot:single
  ```
- If packaging fails on the host, regenerate profile entries in `phase7/desktop-export-profile.json` and rerun packaging.
