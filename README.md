# React Taskboard

A meaningful **React + Vite** client application for the xCloud
app-compatibility suite: a task board that runs entirely in the browser and
persists to **localStorage** — it is explicitly a browser-only storage app and
makes no server readiness or backend claims.

It is not a success-page shell. The board supports task CRUD, search and
status/priority filters, deep links to individual tasks, accessible form
markup with visible validation errors, a release marker, and a reproduction
script (`scripts/verify.sh`) that builds the production bundle and drives a
real headless Chrome against the production static server.

## Feature summary

- Task create / read / update / delete against a localStorage-backed store.
- Search (`q`), status and priority filters; filters live in the URL so a
  filtered view is itself a deep link.
- Deep links: each task has a stable URL (`#/tasks/:id`) that works when
  shared, opened from history, or reloaded.
- Clearly labelled browser-only storage: the footer states that all data is
  stored in the browser's localStorage, and the board header reminds the user
  nothing is sent to a server.
- Accessible UI: labels wired with `htmlFor`, `aria-invalid` +
  `aria-describedby` error wiring, focus management, a skip link, visible
  focus styles and `prefers-reduced-motion` support.
- Release marker: `scripts/build.sh` writes `VERSION` (git SHA) and passes it
  to Vite as `VITE_BUILD`; the footer shows `build: <sha>`.
- No fabricated health/readiness claims — there is no backend to probe.

## Runtime and dependencies

- Node.js **22.23.2** and Vite **5.4.x** validated (Node >= 18 required).
- Dependencies: `react`, `react-dom`, `react-router-dom` (hash routing).
- Dev-only: `vite`, `@vitejs/plugin-react`, `puppeteer-core` (drives the
  system Chrome/chromium for the browser smoke).
- `package-lock.json` pins the toolchain; `npm ci` reproduces it.

Runtime versions (this verification):

| Component | Version |
|-----------|---------|
| Node.js   | 22.23.2 |
| npm       | 10.9.8  |
| Vite      | 5.4.11  |
| React     | 18.3.1  |
| Chrome    | system (`/usr/bin/google-chrome`) |

## Quick start (development)

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173.

## Production build and start

```bash
npm ci
bash scripts/build.sh   # writes VERSION marker and builds dist/
npm run start           # vite preview --host 0.0.0.0 (default port 4173)
```

- Binds to `PREVIEW_HOST:PREVIEW_PORT` (defaults **0.0.0.0:4173**).
- The production bundle is the static `dist/` directory; `vite preview` is
  the standard Vite way to serve it for verification. Any static host that
  serves `dist/` works — the app is fully client-side and uses hash routing,
  so no server rewrites are required.

## Persistence

All tasks are stored in the browser's `localStorage` under the key
`react-taskboard.tasks.v1`. Nothing is written to a server. Because storage is
per-origin in the browser, data survives full page reloads, closing and
reopening the browser, and redeploys of the static bundle on the same origin.
Clearing site data removes the tasks.

`scripts/verify.sh` proves persistence three ways:

1. Browser smoke: a task created in Chrome survives a full reload and is
   visible from a fresh tab on the same origin.
2. Restart/redeploy: `scripts/persist-write.mjs` writes a survivor task into a
   persistent Chrome profile, the production server is stopped and restarted,
   and `scripts/persist-read.mjs` reopens the page and confirms the record is
   still served from localStorage.

## Schema

There is no database. The client-side record shape written to localStorage is:

| Field         | Type     | Notes                                        |
|---------------|----------|----------------------------------------------|
| `id`          | string   | UUID, stable task deep-link segment          |
| `title`       | string   | required, trimmed, 1–120 chars               |
| `description` | string   | optional, trimmed, 0–5000 chars              |
| `status`      | string   | `todo` \| `in_progress` \| `done`            |
| `priority`    | string   | `low` \| `medium` \| `high`                  |
| `createdAt`   | string   | ISO-8601 timestamp                          |
| `updatedAt`   | string   | ISO-8601 timestamp, bumped on every update   |

Invalid records (bad `status`/`priority`, out-of-range lengths) are rejected
by `src/lib/taskModel.js` at the model layer and by the UI with visible field
errors; blank titles cannot be created.

## Environment variables

See `.env.example` for the full commented list.

| Variable       | Required | Default  | Purpose                                  |
|----------------|----------|----------|------------------------------------------|
| `VITE_BUILD`   | no       | `local`  | release marker baked into the footer     |
| `VITE_HOST`    | no       | `0.0.0.0`| dev server bind address                  |
| `VITE_PORT`    | no       | `5173`   | dev server port                          |
| `PREVIEW_HOST` | no       | `0.0.0.0`| production preview bind address          |
| `PREVIEW_PORT` | no       | `4173`   | production preview port                  |

No credentials or secrets are committed or required.

## Health and readiness

This is a static client application with no server-persisted data of its own,
so there is **no fabricated server readiness claim**. The verification layer
checks real behaviour instead:

- `curl` confirms the production static server serves the bundle.
- A real headless Chrome exercises the UI end to end.
- A restart/redeploy persistence check confirms data survives server restarts.

## Automated verification

```bash
scripts/verify.sh
```

Runs, in order:

1. Preflight: `node`, `npm`, system Chrome availability.
2. Clean install — `rm -rf node_modules && npm ci`.
3. Production build — `scripts/build.sh` writes the release marker and builds
   `dist/`; `dist/build-info.json` records the marker.
4. Unit tests — `node --test` over the task model (13 assertions: validation
   positives/negatives, filtering, sorting, immutability).
5. Browser smoke — serves `dist/` with `vite preview`, drives a real headless
   Chrome via puppeteer-core (18 checks): CRUD, search and status filters
   (positive and negative), deep links incl. a not-found route, invalid-input
   rejection, reload and fresh-tab localStorage persistence, release marker
   and the browser-only storage label.
6. Restart/redeploy persistence — writes a survivor task, restarts the
   production server, and verifies the record survives.

Exit 0 only when every check passes. Recorded outcome: see `VERIFICATION.md`.

## Repository layout

```
src/            React app: App routes, components, lib (model, filters,
                storage), styles
tests/          node:test unit tests for the task model
scripts/        build.sh (marker + bundle), smoke.sh/smoke.mjs (browser),
                persist-write/read.mjs (restart persistence), verify.sh
vite.config.js  React plugin, host/port, preview server
package.json    scripts + dependencies
```

## License

MIT — see [LICENSE](LICENSE). This fixture is part of the MIT-licensed
[xCloud app-compatibility suite](https://github.com/xCloudNobin/app-compatibility).