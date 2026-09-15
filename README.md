# mcpqa-react-vite

Minimal Vite + React (JavaScript) fixture app for xCloud git-deployment QA.

## Commands

- Install: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build` (outputs to `dist/`)
- Preview build: `npm run preview`

## Marker

The home page renders `mcpqa-react-vite OK` plus a `build: <value>` line
sourced from the `VITE_BUILD` env var (falls back to `local`).
