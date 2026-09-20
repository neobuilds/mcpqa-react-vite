# Verification record

React + Vite taskboard — xCloud app-compatibility fixture.

## Candidate commit

- Commit SHA: `pending` (filled by the PR head)
- Branch/PR: `feat/compatibility-react-vite` (PR pending reviewer)
- Repository: `neobuilds/mcpqa-react-vite` (planned canonical destination
  `xCloudNobin/react-taskboard` has a pending, unverified transfer — see
  `Verification record` blocking note below)

## Environment

- Date: 2026-09-20 (UTC)
- Node.js: 22.23.2
- npm: 10.9.8
- Vite: 5.4.11
- React / react-dom: 18.3.1 / 18.3.1
- react-router-dom: 6.30.x
- Browser: system Google Chrome (headless) via puppeteer-core
- Category: React + Vite static client (browser-only localStorage)
- Build method: `scripts/build.sh` → `VERSION` marker + `dist/`;

## Local verification (`scripts/verify.sh`)

`scripts/verify.sh` runs each step below and aborts on any failure. Full local
run executed on 2026-09-20 (exit 0):

1. Preflight — node/npm/chrome present.
2. Clean install — `rm -rf node_modules && npm ci` (lockfile pinned).
3. Production build — release marker `93e939a` written to `VERSION`
   (`build-info.json` recorded) and static bundle emitted to `dist/`.
4. Unit tests — `node --test` task-model suite: **13 pass, 0 fail**
   (validation positives/negatives: blank/over-long title, invalid
   status/priority, multiple errors; field error accumulation; create
   trimming; update via `applyChanges` throws `ValidationError`; case-
   insensitive search; status/priority filtering; sort immutability).
5. Browser smoke — real headless Chrome against `vite preview`
   (production static server), **18 passed / 0 failed**:
   - storage label "browser-only localStorage" and `build:` release marker
     rendered;
   - invalid input: blank title shows visible `Title is required.`; no record
     is created;
   - create task via the UI → redirect to its deep link and persisted value;
   - board lists the created task;
   - search: matching task found, non-matching excluded (empty state);
   - status filter: excludes mismatched tasks, restores on selection;
   - update: title changed via keyboard, `saved` notice shown;
   - deep link reload: editing URL reloads and still shows the updated task;
   - persistence: task survives a full reload and is visible in a fresh tab
     on the same origin (localStorage);
   - delete: confirmation path removes the survivor task;
   - deep link to a nonexistent task id renders "Task not found".
6. Restart/redeploy persistence — `persist-write.mjs` creates a survivor task
   in a persistent Chrome profile, the production server is stopped and
   restarted, then `persist-read.mjs` opens a fresh page and confirms
   `REDEPLOY-survivor task` survived the server restart.

## Limitations

- Local verification only. Live xCloud category deployment and external
  qualification are **not** claimed; status stays `local-verified` until then.
- Data is browser-only `localStorage` by design (per the app brief); a
  browser-profile change or clearing of site data removes tasks. No backend,
  no server-side persistence, no CSRF/session surface.
- Storage is per-origin: a redeploy to the same origin keeps existing browser
  data; a new origin starts empty.
- Task title length is bounded (120 chars); typing is capped by the input
  `maxLength`, so UI tokens are bounded.

## Transfer / ownership blocker

Per the parent coordination docs (MIGRATION.md, AGENTS.md), the planned
canonical destination `xCloudNobin/react-taskboard` must not be created while
a transfer from `neobuilds/mcpqa-react-vite` is pending. GitHub reports the
target as not found (HTTP 404); no transfer completion is observable yet.
Implementation therefore landed on the current source repository
`neobuilds/mcpqa-react-vite` on branch `feat/compatibility-react-vite`; the
branch and PR will carry over to `xCloudNobin/react-taskboard` once the
transfer completes. Reviewer confirmation of the final owner/name is still
required.

## Evidence chain

Command run at the candidate commit: `scripts/verify.sh` (exit 0). Smoke
summary line:
`=== React smoke summary: 18 passed, 0 failed ===`
Unit test summary: `# pass 13, # fail 0` from `node --test`.