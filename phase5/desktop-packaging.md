# Desktop Executable Packaging Notes

This project is already shaped for a local-first, privacy-preserving planner workflow.
For a production desktop wrapper, the recommended path is:

1. Keep this Next.js app as the renderer shell.
2. Wrap with a local app shell (Tauri preferred by prior stack choice).
3. Keep all planner and sync state in browser localStorage + sync metadata file cache.
4. Bundle offline assets from `public/` so first-launch is deterministic.

## Recommended shell profile

- **Framework:** Tauri (Rust-based shell)
- **Local-first data:** keep existing localStorage + sync metadata keyspace.
- **Sync path:** API endpoint remains external and optional (`/sync/push`, `/sync/pull`).
- **Packaging:** build Next.js output → open via Tauri webview.

## Implementation notes

- Service worker and manifest files are already in `public/`.
- `PWAServiceBridge` initializes offline cache registration (`src/components/PWAServiceBridge.tsx`).
- `ConnectivityBanner` gives planner-visible network mode visibility (`src/components/ConnectivityBanner.tsx`).

## Minimal next-step tasks

1. Add `src-tauri` with shell config and icons.
2. Add `tauri` build scripts (or equivalent Electron scripts if your org requires it).
3. Configure `allowlist` network permissions for sync endpoints only.
4. Add update channel and checksum verification on desktop auto-update.
5. Add launch onboarding flow for first-run and desktop export/import entry points.
