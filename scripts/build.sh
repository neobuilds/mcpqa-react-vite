#!/usr/bin/env bash
# Build the production bundle for the React taskboard.
#
#   1. Writes the release marker into VERSION (git SHA by default).
#   2. Passes that marker to Vite as VITE_BUILD so the footer can display
#      which revision this bundle was built from.
#   3. Runs `vite build` and emits the static bundle into dist/.
#
# Usage:
#   scripts/build.sh
#
# Exit codes: 0 = success, nonzero = build failed.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MARKER="${BUILD_MARKER:-}"
if [ -z "$MARKER" ]; then
  if [ -x "$(command -v git)" ] && git rev-parse --short HEAD >/dev/null 2>&1; then
    MARKER="$(git rev-parse --short HEAD)"
  else
    MARKER="local"
  fi
fi

printf '%s\n' "$MARKER" > VERSION
echo "release marker: $MARKER"

VITE_BUILD="$MARKER" npm run build-vite

# Emit machine-readable build info alongside the bundle for verification.
printf '{"marker":"%s","builtAt":"%s"}\n' "$MARKER" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > dist/build-info.json
echo "build info written to dist/build-info.json"