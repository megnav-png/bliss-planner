# Phase 7 — Packaging, Export Profile, and Release Checklist

## Release readiness checklist

1. **Code freeze**
   - [ ] Phase 6 pilot report is clean.
   - [ ] No PASS regressions in functional scenarios.
   - [ ] No new critical console or network errors in latest pilot run.

2. **Desktop wrapper smoke validation**
   - [ ] `npm run phase6:pilot:single` passes before packaging.
   - [ ] `npm run phase7:desktop:launch` opens app window and shows onboarding/dashboard flow.
   - [ ] App reconnects after host tab close/reopen using same local storage keys.
   - [ ] Window resize works on 1024x720 minimum and portrait mobile simulation from devtools remains readable.

3. **Export profile**
   - [ ] `phase7/desktop-export-profile.json` reviewed for:
     - `appId`, `productName`, and output folder
     - icon paths
     - OS targets
     - included files (`.next`, `public`, `desktop`, runtime runtime deps)
   - [ ] App assets copied correctly (`public/icons/wovops-icon-512.png`).
   - [ ] Release bundle excludes test fixtures, script caches, and logs.

4. **Build + package validation**
   - [ ] `npm run phase7:desktop:package` completes.
   - [ ] Installer opens and launches the app successfully.
   - [ ] A fresh install keeps local storage and sync profile behavior intact.
   - [ ] Re-import package flow remains available after install.
   - [ ] `npm install -D electron electron-builder` has been run for packaging environment.

5. **Distribution prep**
   - [ ] Add platform signing credentials.
   - [ ] Decide update strategy (manual distribution vs signed auto-update).
   - [ ] Capture release notes with:
     - version bump
     - known constraints (no cloud sync by default / optional local-first mode)
     - target OS versions.

## Suggested release order
1. `npm run phase6:pilot:single`
2. `npm run build`
3. `npm run phase7:desktop:package`
4. Install package artifact in a clean machine profile and run:
   - onboarding flow
   - reset + onboarding recheck
   - task interaction + guest target slider
   - export/import package roundtrip
   - offline mode banner + local edits

## Gate
If any gating item fails, keep build as **Release Candidate** and patch with a follow-up mini pass.
