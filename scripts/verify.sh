#!/usr/bin/env bash
# Full verification for the React + Vite taskboard.
#
#   a. Preflight: node/npm present, chrome available.
#   b. Clean install with the frozen lockfile.
#   c. Build the production bundle (marker + dist/).
#   d. Unit tests for the task model (node --test).
#   e. Browser smoke against the production static server:
#      CRUD, search/filter, deep links, invalid input, localStorage
#      persistence across reload, release marker, storage labelling.
#   f. Restart/redeploy persistence: rebuild + restart the server and
#      confirm data written by the prior browser session still reads back.
#
# Usage:
#   scripts/verify.sh
#
# Exit codes: 0 = all checks passed, nonzero = a check failed. The first
# failing step aborts with its own nonzero code.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

step() { printf '\n=== %s ===\n' "$*"; }

step "preflight"
NODE="$(command -v node || true)"
NPM="$(command -v npm || true)"
[ -n "$NODE" ] && [ -n "$NPM" ] || { echo "node and npm are required" >&2; exit 1; }
echo "node: $("$NODE" --version)"
echo "npm:  $("$NPM" --version)"

step "production build (clean install + marker + bundle)"
rm -rf node_modules
"$NPM" ci --no-audit --no-fund
bash scripts/build.sh
[ -f dist/index.html ] || { echo "dist/index.html missing after build" >&2; exit 1; }
echo "VERSION: $(cat VERSION)"

step "release marker recorded"
[ -s dist/build-info.json ] || { echo "dist/build-info.json missing after build" >&2; exit 1; }
if ! grep -q "$(cat VERSION)" dist/build-info.json; then
  echo "release marker mismatch in build info" >&2
  exit 1
fi
echo "build info: $(cat dist/build-info.json)"

step "unit tests (task model: validation + filtering)"
"$NPM" test

step "browser smoke (production static server)"
bash scripts/smoke.sh

step "restart/redeploy persistence check"
PORT="${PREVIEW_PORT:-4173}"
HOST="${PREVIEW_HOST:-127.0.0.1}"
CHROME="${CHROME_PATH:-}"
if [ -z "$CHROME" ]; then
  for c in /usr/bin/google-chrome /usr/bin/chromium /usr/bin/chromium-browser /snap/bin/chromium; do
    if [ -x "$c" ]; then CHROME="$c"; break; fi
  done
fi
[ -n "$CHROME" ] || { echo "no chrome/chromium executable found for persistence check" >&2; exit 1; }

start_server() {
  npm run preview -- --host "$HOST" --port "$PORT" --strictPort > "$1" 2>&1 &
  SERVER_PID=$!
  for _ in $(seq 1 30); do
    if curl -fsS "http://$HOST:$PORT/" >/dev/null 2>&1; then return; fi
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
      echo "preview server exited early:" >&2
      cat "$1" >&2
      exit 1
    fi
    sleep 0.5
  done
  echo "preview server did not start" >&2
  cat "$1" >&2
  exit 1
}

stop_server() {
  if [ -n "${SERVER_PID:-}" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID"
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}

# Start server, write a survivor task into a persistent browser profile.
start_server dist/persist-preview.log
BASE_URL="http://$HOST:$PORT/" CHROME_PATH="$CHROME" node scripts/persist-write.mjs
stop_server

# Restart server (redeploy) and verify the survivor task survived.
start_server dist/persist-preview-2.log
BASE_URL="http://$HOST:$PORT/" CHROME_PATH="$CHROME" node scripts/persist-read.mjs
stop_server

step "verification complete (all steps passed)"
printf '%s\n' "marker: $(cat VERSION)"
printf '%s\n' "dist size: $(du -sh dist | cut -f1)"