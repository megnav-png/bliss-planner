# Phase 7 — Desktop Packaging Profile

This phase introduces a desktop execution wrapper and formal release path.

## What was added
- **Desktop shell** (`desktop/main.cjs`)  
  Wraps the web app in an Electron shell, launches Next locally on start, and serves the app via a local URL.
- **Launcher script** (`scripts/run-desktop.mjs`)  
  Single command to launch the desktop shell.
- **Desktop smoke script** (`npm run phase7:desktop:smoke`)  
  Launches Electron in smoke-test mode, confirms the local app loads, then exits.
- **Packaging script** (`scripts/package-desktop.mjs`)  
  Builds web artifacts and runs `electron-builder` using the export profile.
- **Signed macOS packaging preflight** (`scripts/package-desktop-signed.mjs`)  
  Builds with hardened runtime/notarization settings when Apple Developer credentials and signing identity are available.
- **Windows packaging smoke** (`scripts/package-windows-smoke.mjs`)  
  Runs a cross-platform `electron-builder --win --dir` packaging check.
- **Signed Windows installer preflight** (`scripts/package-windows-signed.mjs`)  
  Builds a production Windows installer when a code-signing certificate is configured.
- **Export profile** (`phase7/desktop-export-profile.json`)  
  Defines package IDs, output targets, icons, artifact names, and OS targets.
- **Sync backend architecture** (`phase7/SYNC_BACKEND_ARCHITECTURE.md`)  
  Defines the optional encrypted relay approach for cross-device continuity without storing readable planner data.
- **Encrypted relay prototype** (`sync-relay/prototype-server.mjs`)  
  Provides a persistent local AES-256-GCM at-rest push/pull relay with optional bearer auth, device pairing, workspace scoping, and delete-cloud-data.
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
- Run deterministic dashboard pilot:
  ```bash
  WOVOPS_APP_URL=http://127.0.0.1:3002 npm run phase6:pilot:deterministic
  ```
- Run local encrypted relay prototype:
  ```bash
  BLISS_RELAY_SECRET=dev-secret BLISS_RELAY_TOKEN=dev-token npm run sync:relay:prototype
  ```
- Validate local relay flow:
  ```bash
  BLISS_RELAY_TOKEN=dev-token npm run sync:relay:smoke
  ```
- Run Render visual QA checklist:
  ```bash
  BLISS_APP_URL=https://bliss-planner.onrender.com npm run qa:render:visual
  ```
- Run Windows packaging smoke:
  ```bash
  npm run phase7:desktop:package:win-smoke
  ```
- Run signed Windows installer packaging:
  ```bash
  WIN_CSC_LINK=... WIN_CSC_KEY_PASSWORD=... npm run phase7:desktop:package:win-signed
  ```
- Run signed/notarized macOS packaging:
  ```bash
  APPLE_ID=... APPLE_APP_SPECIFIC_PASSWORD=... APPLE_TEAM_ID=... CSC_LINK=... CSC_KEY_PASSWORD=... npm run phase7:desktop:package:signed
  ```

## Rollback
- If desktop launch fails, run web-only first and confirm `npm run build` succeeds:
  ```bash
  npm run phase6:pilot:single
  ```
- If packaging fails on the host, regenerate profile entries in `phase7/desktop-export-profile.json` and rerun packaging.
- Local macOS and Windows smoke packages are development artifacts. Production distribution still needs Apple Developer signing/notarization and a Windows code-signing certificate.
