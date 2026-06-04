#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_HOST="${APP_HOST:-127.0.0.1}"
APP_PORT="${APP_PORT:-3002}"
FORCE_REINSTALL="${WOVOPS_PILOT_FORCE_REINSTALL:-false}"
RUN_DEV="${WOVOPS_PILOT_RUN_DEV:-true}"
AUTO_FALLBACK_NO_LISTEN="${WOVOPS_PILOT_NO_LISTEN_FALLBACK:-true}"
WOVOPS_PILOT_AUTO_FIX_ADDRINUSE="${WOVOPS_PILOT_AUTO_FIX_ADDRINUSE:-true}"
WOVOPS_PILOT_PORT_RETRY_ATTEMPTS="${WOVOPS_PILOT_PORT_RETRY_ATTEMPTS:-8}"
WOVOPS_PILOT_AUTO_INCREMENT_PORT="${WOVOPS_PILOT_AUTO_INCREMENT_PORT:-true}"
WOVOPS_APP_URL="${WOVOPS_APP_URL:-http://$APP_HOST:$APP_PORT}"

cd "$ROOT_DIR"

NEXTPATH="${ROOT_DIR}/node_modules/next/dist/build/polyfills/polyfill-nomodule.js"
DEV_PID=""

cleanup_server() {
  if [[ -n "${DEV_PID}" ]] && kill -0 "$DEV_PID" 2>/dev/null; then
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
  fi
}
trap cleanup_server EXIT

kill_port_listeners() {
  local port="$1"

  if ! command -v lsof >/dev/null 2>&1; then
    echo "WARN: lsof not available; unable to pre-kill listeners on port ${port}." >&2
    return 0
  fi

  local pids
  pids="$(lsof -tiTCP:"${port}" -sTCP:LISTEN -n -P 2>/dev/null || true)"
  if [[ -z "$pids" ]]; then
    return 0
  fi

  echo "Releasing existing listeners on port ${port}: ${pids}" >&2
  for pid in $pids; do
    kill -TERM "$pid" 2>/dev/null || true
  done
  sleep 0.6

  pids="$(lsof -tiTCP:"${port}" -sTCP:LISTEN -n -P 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    for pid in $pids; do
      kill -KILL "$pid" 2>/dev/null || true
    done
    sleep 0.3
  fi
}

remove_path() {
  local target=$1

  if [[ ! -e "$target" ]]; then
    return 0
  fi

  if ! rm -rf "$target" 2>/tmp/wovops-clean-rm.err; then
    echo "WARN: non-fatal cleanup issue for ${target}. Trying fallback cleanup."
    cat /tmp/wovops-clean-rm.err
    chmod -R u+w "$target" 2>/dev/null || true
    find "$target" -mindepth 1 -delete 2>/tmp/wovops-clean-rm.find.err || true
    rmdir "$target" 2>/dev/null || true
    if [[ -e "$target" ]]; then
      echo "WARN: ${target} could not be fully removed; continuing with install fallback."
    fi
    return 0
  fi

  return 0
}

printf 'Cleaning stale artifacts...\n'
remove_path ".next"

if [[ "${FORCE_REINSTALL}" == "true" ]]; then
  remove_path "node_modules"
fi

if [[ ! -d node_modules ]]; then
  printf 'Installing dependencies...\n'
  if [[ -f package-lock.json ]]; then
    npm ci --include=dev
  else
    npm install
  fi
else
  printf 'Reusing existing dependencies; skipping full reinstall unless repair is needed.\n'
fi

if [[ ! -f "$NEXTPATH" ]]; then
  echo "WARN: Next.js polyfill file missing after install, repairing dependency tree..."
  rm -rf node_modules
  npm cache clean --force
  if [[ -f package-lock.json ]]; then
    npm ci --include=dev
  else
    npm install
  fi
fi

if ! npm run build >/tmp/wovops-clean-build.log 2>&1; then
  echo "Build failed. See /tmp/wovops-clean-build.log"
  exit 1
fi

if [[ "${RUN_DEV}" == "true" ]]; then
  SERVER_READY=false
  STARTUP_HOST="$APP_HOST"
  if [[ "$STARTUP_HOST" == "localhost" ]]; then
    STARTUP_HOST="127.0.0.1"
  fi

  if [[ "${WOVOPS_PILOT_AUTO_FIX_ADDRINUSE}" == "true" ]]; then
    kill_port_listeners "$APP_PORT"
  fi

  for attempt in $(seq 1 "$WOVOPS_PILOT_PORT_RETRY_ATTEMPTS"); do
    if [[ "${WOVOPS_PILOT_AUTO_INCREMENT_PORT}" == "true" && "$attempt" -gt 1 ]]; then
      APP_PORT="$((APP_PORT + 1))"
    fi
    WOVOPS_APP_URL="http://$APP_HOST:$APP_PORT"

    printf 'Starting app for pilot run on %s:%s (attempt %s of %s)...\n' "$STARTUP_HOST" "$APP_PORT" "$attempt" "$WOVOPS_PILOT_PORT_RETRY_ATTEMPTS"
    npm run dev -- --hostname "$STARTUP_HOST" --port "$APP_PORT" > /tmp/wovops-clean-dev.log 2>&1 &
    DEV_PID=$!

    for _ in {1..120}; do
      if curl -sf "$WOVOPS_APP_URL" >/dev/null; then
        SERVER_READY=true
        break 2
      fi

      if grep -q "listen EADDRINUSE" /tmp/wovops-clean-dev.log 2>/dev/null; then
        if [[ "${WOVOPS_PILOT_AUTO_FIX_ADDRINUSE}" == "true" && "${WOVOPS_PILOT_AUTO_INCREMENT_PORT}" == "true" && "$attempt" -lt "$WOVOPS_PILOT_PORT_RETRY_ATTEMPTS" ]]; then
          echo "Port ${APP_PORT} is already in use. Releasing and retrying startup..." >&2
          if [[ -n "$DEV_PID" ]] && kill -0 "$DEV_PID" 2>/dev/null; then
            kill "$DEV_PID" 2>/dev/null || true
            wait "$DEV_PID" 2>/dev/null || true
          fi
          kill_port_listeners "$APP_PORT"
          continue 2
        fi

        echo "Port ${APP_PORT} is busy and cannot auto-resolve from this run. Set APP_PORT to a free value and retry." >&2
        tail -n 80 /tmp/wovops-clean-dev.log >&2 || true
        exit 1
      fi

      if grep -q "listen EPERM" /tmp/wovops-clean-dev.log 2>/dev/null; then
        if [[ "${AUTO_FALLBACK_NO_LISTEN}" == "true" ]]; then
          echo "Auto-start blocked in this runtime (listen EPERM). Falling back to an already-running app endpoint."
          echo "No app will be auto-started from this command in this environment."
          if [[ -n "${DEV_PID}" ]]; then
            kill "$DEV_PID" 2>/dev/null || true
            wait "$DEV_PID" 2>/dev/null || true
            DEV_PID=""
          fi
          break 2
        fi
      fi

      sleep 0.5
    done

    if [[ -n "$DEV_PID" ]] && kill -0 "$DEV_PID" 2>/dev/null; then
      kill "$DEV_PID" 2>/dev/null || true
      wait "$DEV_PID" 2>/dev/null || true
      DEV_PID=""
    fi
  done

  if [[ "$SERVER_READY" != "true" ]]; then
    echo "App did not become reachable on ${WOVOPS_APP_URL}. See /tmp/wovops-clean-dev.log" >&2
    tail -n 80 /tmp/wovops-clean-dev.log >&2 || true
    if [[ "${AUTO_FALLBACK_NO_LISTEN}" != "true" ]]; then
      exit 1
    fi
  fi
fi

printf 'Using app URL: %s\n' "$WOVOPS_APP_URL"

if ! curl -sf "$WOVOPS_APP_URL" >/dev/null; then
  echo "No app reachable at ${WOVOPS_APP_URL}. Start app manually first, or set WOVOPS_PILOT_RUN_DEV=true in a host terminal with network permissions." >&2
  exit 1
fi

echo "App is reachable at ${WOVOPS_APP_URL}."

echo "Running Phase 6 pilot from clean state..."
APP_HOST="$APP_HOST" \
APP_PORT="$APP_PORT" \
WOVOPS_APP_URL="$WOVOPS_APP_URL" \
WOVOPS_PILOT_SKIP_IPV6="${WOVOPS_PILOT_SKIP_IPV6:-true}" \
WOVOPS_PILOT_SKIP_PRECHECK="${WOVOPS_PILOT_SKIP_PRECHECK:-true}" \
WOVOPS_PILOT_ALLOW_HOST_ALIASES="${WOVOPS_PILOT_ALLOW_HOST_ALIASES:-false}" \
WOVOPS_PILOT_FORCE_IPV4_LOOPBACK="${WOVOPS_PILOT_FORCE_IPV4_LOOPBACK:-true}" \
npm run phase6:pilot
