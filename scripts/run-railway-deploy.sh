#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v railway >/dev/null 2>&1; then
  echo "Railway CLI not found. Install it with: npm i -g @railway/cli" >&2
  exit 1
fi

if [[ "${RAILWAY_TOKEN:-}" == "" && "${RAILWAY_API_TOKEN:-}" == "" ]]; then
  echo "No Railway token detected. Run `railway login` once, or set RAILWAY_TOKEN/RAILWAY_API_TOKEN." >&2
  exit 1
fi

echo "Building project before deploy..."
npm run build

echo "Launching Railway deploy..."
railway up "$@"
