# Build the multi-tool build/deploy pipeline

Type: task
Status: open
Blocked by: [16-restructure-into-hub-layout.md](16-restructure-into-hub-layout.md)

## Question

Extend the validator's existing single GitHub Actions workflow (`.github/workflows/`) so it builds every Tool independently (each keeps its own `package.json`/`vite.config`, per this map's Notes) and the landing page, copies each build's output into `dist/<subpath>/`, and deploys the combined `dist/` as one GitHub Pages artifact.

Needs to preserve what already works: the existing workflow's daily-scheduled schema regeneration + build + deploy for the validator (see the validator map's [ticket 05](05-web-app-mechanics.md)) must keep working once it's one step among several, not the whole workflow.

Plain root build scripts only — no workspace/monorepo tooling (npm workspaces, Turborepo, Nx) per this map's Notes, unless resolving this ticket surfaces a real reason plain scripts don't hold up.

## Answer

(pending)
