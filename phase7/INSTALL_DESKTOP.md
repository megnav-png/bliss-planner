# Desktop Installation & Distribution

## Scope
Phase 7 packages this project as a local desktop wrapper and defines a repeatable release profile.

## Prerequisites
- Node.js 18+ (for local build and launcher scripts)
- npm 9+
- Apple code signing / Windows installer cert for production distribution (optional during internal QA)
- Desktop wrapper deps:
  - `npm i -D electron electron-builder`

## One-command desktop launch (from project root)
```bash
cd "/Users/megnav/Documents/Set recorder"
npm run phase7:desktop:launch
```

This will:
1. Build a production-ready Next.js server process (`.next`) if available (desktop shell starts it on `127.0.0.1:3002`).
2. Launch the Electron wrapper.

If Electron is not installed locally, it falls back to `npx electron@latest`.

To use a custom port:
```bash
cd "/Users/megnav/Documents/Set recorder"
WOVOPS_APP_HOST=127.0.0.1 WOVOPS_APP_PORT=3030 npm run phase7:desktop:launch
```

## Production package
```bash
cd "/Users/megnav/Documents/Set recorder"
npm run phase7:desktop:package
```

The package output is placed in:
- `release/`

This runs:
1. `npm run build`
2. `electron-builder` using `phase7/desktop-export-profile.json`

If dependencies are not installed yet:
```bash
npm install -D electron electron-builder
npm run phase7:desktop:package
```

If you need a one-off network fallback, set:
```bash
WOVOPS_ALLOW_NPX_PACKAGER=true npm run phase7:desktop:package
```

To pin electron-builder version or pass a different package wrapper:
```bash
cd "/Users/megnav/Documents/Set recorder"
WOVOPS_ELECTRON_BUILDER="electron-builder@24.13.3" npm run phase7:desktop:package
```

## Installer outputs
- macOS: `.dmg`, `.zip`
- Windows: `.exe` setup
- Linux: `.AppImage`, `.tar.gz`

Artifacts are created in:
- `release/WovOpsPlanner-...` and `WovOpsPlanner-...`

## Notes for your first release
- For internal pilot, keep signing off and distribute the `.dmg`/`.exe` directly.
- For public release, add signing credentials and auto-update feed before running publish.
- Always validate against a clean machine profile (fresh user data) before publishing QA builds.
