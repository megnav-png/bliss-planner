#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WOVOPS_APP_URL="${WOVOPS_APP_URL:-}"

if [[ -z "$WOVOPS_APP_URL" ]]; then
  cat <<'EOF' >&2
Usage:
  WOVOPS_APP_URL=https://your-app.example.com npm run phase6:pilot:remote
EOF
  exit 1
fi

cd "$ROOT_DIR"

export WOVOPS_APP_URL
export WOVOPS_PILOT_SKIP_IPV6="${WOVOPS_PILOT_SKIP_IPV6:-true}"
export WOVOPS_PILOT_SKIP_PRECHECK="${WOVOPS_PILOT_SKIP_PRECHECK:-false}"
export WOVOPS_PILOT_ALLOW_HOST_ALIASES="${WOVOPS_PILOT_ALLOW_HOST_ALIASES:-false}"
export WOVOPS_PILOT_FORCE_IPV4_LOOPBACK="${WOVOPS_PILOT_FORCE_IPV4_LOOPBACK:-false}"
export WOVOPS_SKIP_LOCAL_START=true
export WOVOPS_PILOT_KEEP_SERVER="${WOVOPS_PILOT_KEEP_SERVER:-false}"

echo "Running Phase 6 pilot against ${WOVOPS_APP_URL}"
npm run phase6:pilot "$@"
