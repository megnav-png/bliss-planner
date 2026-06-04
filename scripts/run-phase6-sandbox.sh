#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_HOST="${APP_HOST:-127.0.0.1}"
APP_PORT="${APP_PORT:-3002}"
APP_URL="${WOVOPS_APP_URL:-http://$APP_HOST:$APP_PORT}"
LOG_DIR="${WOVOPS_LOG_DIR:-/tmp}"
DEV_LOG="${LOG_DIR}/wovops-dev.log"
PILOT_LOG="${LOG_DIR}/wovops-pilot.log"

cd "$ROOT_DIR"

npm install

cleanup() {
  if [[ -n "${DEV_PID:-}" ]] && kill -0 "$DEV_PID" 2>/dev/null; then
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# Prefer 127.0.0.1 for in-browser consistency.
npm run dev -- --hostname "$APP_HOST" --port "$APP_PORT" >"$DEV_LOG" 2>&1 &
DEV_PID=$!

for _ in {1..40}; do
  if curl -sf "${APP_URL}" >/dev/null; then
    break
  fi
  sleep 0.5
done

if ! curl -sf "${APP_URL}" >/dev/null; then
  echo "App did not become reachable on ${APP_URL}. See ${DEV_LOG}" >&2
  tail -n 40 "$DEV_LOG" >&2 || true
  exit 1
fi

APP_HOST="$APP_HOST" APP_PORT="$APP_PORT" WOVOPS_APP_URL="$APP_URL" \
  WOVOPS_PILOT_SKIP_IPV6=true \
  WOVOPS_PILOT_SKIP_PRECHECK=true \
  WOVOPS_PILOT_ALLOW_HOST_ALIASES=false \
  WOVOPS_PILOT_FORCE_IPV4_LOOPBACK=true \
  npm run phase6:pilot | tee "$PILOT_LOG"

