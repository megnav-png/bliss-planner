#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_HOST="${APP_HOST:-0.0.0.0}"
APP_PORT="${APP_PORT:-3002}"
WOVOPS_APP_URL="${WOVOPS_APP_URL:-http://127.0.0.1:${APP_PORT}}"
WOVOPS_SKIP_LOCAL_START="${WOVOPS_SKIP_LOCAL_START:-false}"
WOVOPS_PILOT_SKIP_IPV6="${WOVOPS_PILOT_SKIP_IPV6:-true}"
WOVOPS_PILOT_SKIP_PRECHECK="${WOVOPS_PILOT_SKIP_PRECHECK:-true}"
WOVOPS_PILOT_ALLOW_HOST_ALIASES="${WOVOPS_PILOT_ALLOW_HOST_ALIASES:-false}"
WOVOPS_PILOT_FORCE_IPV4_LOOPBACK="${WOVOPS_PILOT_FORCE_IPV4_LOOPBACK:-true}"
WOVOPS_STARTUP_MAX_TRIES="${WOVOPS_STARTUP_MAX_TRIES:-20}"
WOVOPS_LOG_DIR="${WOVOPS_LOG_DIR:-/tmp}"
DEV_LOG="${WOVOPS_LOG_DIR}/wovops-dev.log"
PILOT_LOG="${WOVOPS_LOG_DIR}/wovops-phase6-cloud-pilot.log"

cd "$ROOT_DIR"

export NEXT_DISABLE_ESLINT=1

if [[ ! -d node_modules ]]; then
  npm ci
fi

if ! node -e "require('playwright')" >/dev/null 2>&1; then
  npx playwright install chromium
fi

is_running() {
  if kill -0 "$1" 2>/dev/null; then
    return 0
  fi
  return 1
}

start_dev_server() {
  local bind_host="$1"
  DEV_LOG="${WOVOPS_LOG_DIR}/wovops-dev-${bind_host//./_}.log"

  npm run dev -- --hostname "$bind_host" --port "$APP_PORT" >"$DEV_LOG" 2>&1 &
  DEV_PID=$!

  for _ in $(seq 1 "$WOVOPS_STARTUP_MAX_TRIES"); do
    if grep -q "listen EPERM" "$DEV_LOG" 2>/dev/null; then
      echo "Bind permission blocked while starting Next.js on ${bind_host}:${APP_PORT} (listen EPERM)."
      if is_running "$DEV_PID"; then
        kill "$DEV_PID" 2>/dev/null || true
        wait "$DEV_PID" 2>/dev/null || true
        DEV_PID=""
      fi
      return 1
    fi
    if curl -fsS "$WOVOPS_APP_URL" >/dev/null; then
      return 0
    fi
    sleep 0.25
  done

  if is_running "$DEV_PID"; then
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
    DEV_PID=""
    return 1
  fi
  DEV_PID=""
  return 1
}

wait_for_app() {
  local tries=0
  local maxTries=60
  while (( tries < maxTries )); do
    if curl -fsS "$WOVOPS_APP_URL" >/dev/null; then
      return 0
    fi
    tries=$((tries + 1))
    sleep 0.25
  done
  return 1
}

HOSTS_TO_TRY=("$APP_HOST" "127.0.0.1" "localhost")
UNIQUE_HOSTS=()
SEEN_HOSTS=" "
for host in "${HOSTS_TO_TRY[@]}"; do
  if [[ -n "$host" && " $SEEN_HOSTS " != *" $host "* ]]; then
    UNIQUE_HOSTS+=("$host")
    SEEN_HOSTS="${SEEN_HOSTS}${host} "
  fi
done

LOCAL_SERVER_STARTED=false

if [[ "${WOVOPS_SKIP_LOCAL_START:-false}" == "true" ]]; then
  if ! wait_for_app; then
    echo "WOVOPS_SKIP_LOCAL_START=true and app URL not reachable: ${WOVOPS_APP_URL}" >&2
    echo "Start the app outside this environment and rerun with the same WOVOPS_APP_URL." >&2
    exit 1
  fi
else
  for bind_host in "${UNIQUE_HOSTS[@]}"; do
    if start_dev_server "$bind_host"; then
      LOCAL_SERVER_STARTED=true
      APP_HOST="$bind_host"
      break
    fi
    echo "Dev server failed on --hostname $bind_host; trying fallback host."
  done
fi

if [[ "${WOVOPS_SKIP_LOCAL_START:-false}" == "true" ]]; then
  if ! wait_for_app; then
    echo "App did not become reachable on ${WOVOPS_APP_URL}. See ${DEV_LOG}" >&2
    exit 1
  fi
elif [[ "$LOCAL_SERVER_STARTED" != true ]]; then
  echo "App did not become reachable on ${WOVOPS_APP_URL}. See ${DEV_LOG}" >&2
  tail -n 50 "$DEV_LOG" >&2 || true
  exit 1
fi

cleanup() {
  if [[ -n "${DEV_PID:-}" ]] && kill -0 "$DEV_PID" 2>/dev/null; then
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

APP_HOST="$APP_HOST" \
APP_PORT="$APP_PORT" \
WOVOPS_APP_URL="$WOVOPS_APP_URL" \
WOVOPS_PILOT_SKIP_IPV6="$WOVOPS_PILOT_SKIP_IPV6" \
WOVOPS_PILOT_SKIP_PRECHECK="$WOVOPS_PILOT_SKIP_PRECHECK" \
WOVOPS_PILOT_ALLOW_HOST_ALIASES="$WOVOPS_PILOT_ALLOW_HOST_ALIASES" \
WOVOPS_PILOT_FORCE_IPV4_LOOPBACK="$WOVOPS_PILOT_FORCE_IPV4_LOOPBACK" \
npm run phase6:pilot 2>&1 | tee "$PILOT_LOG"
