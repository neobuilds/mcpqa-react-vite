#!/usr/bin/env bash
# Run the browser smoke test against a locally served production bundle.
#
#   1. scripts/build.sh -> release marker (VERSION) + static bundle dist/
#   2. Serve dist/ with vite preview (the production static server).
#   3. Run scripts/smoke.mjs, which drives a real headless Chrome via
#      puppeteer-core and exercises:
#        - CRUD: create / read / update / delete
#        - search and status/priority filters
#        - deep links to a task (#/tasks/:id)
#        - invalid input (blank title) producing a visible error
#        - localStorage persistence across a full reload
#        - the release marker and storage labelling in the footer
#   4. Cleanly stops the production server.
#
# Usage:
#   scripts/smoke.sh
#
# Exit codes: 0 = passed, nonzero = failed (server or assertions).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PORT="${PREVIEW_PORT:-4173}"
HOST="${PREVIEW_HOST:-127.0.0.1}"
CHROME="${CHROME_PATH:-}"
if [ -z "$CHROME" ]; then
  for c in /usr/bin/google-chrome /usr/bin/chromium /usr/bin/chromium-browser /snap/bin/chromium; do
    if [ -x "$c" ]; then CHROME="$c"; break; fi
  done
fi
if [ -z "$CHROME" ]; then
  echo "no chrome/chromium executable found; set CHROME_PATH" >&2
  exit 1
fi
echo "chrome: $CHROME"

if [ ! -d dist ]; then
  bash scripts/build.sh
fi

# --strictPort so a stale process on the port fails fast.
npm run preview -- --host "$HOST" --port "$PORT" --strictPort > dist/preview.log 2>&1 &
SERVER_PID=$!
cleanup() {
  if kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID"
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# Wait for the server to accept connections.
for _ in $(seq 1 30); do
  if curl -fsS "http://$HOST:$PORT/" >/dev/null 2>&1; then break; fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "preview server exited early:" >&2
    cat dist/preview.log >&2
    exit 1
  fi
  sleep 0.5
done

if ! curl -fsS "http://$HOST:$PORT/" >/dev/null 2>&1; then
  echo "preview server did not start" >&2
  cat dist/preview.log >&2
  exit 1
fi

BASE_URL="http://$HOST:$PORT/" CHROME_PATH="$CHROME" node scripts/smoke.mjs

echo "smoke passed against http://$HOST:$PORT/"