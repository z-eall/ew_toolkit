# What's the technical shape of a Monaco-based validator on GitHub Pages + Actions?

Type: research
Status: resolved
Blocked by: (none)

## Question

Investigate the mechanics of embedding Monaco Editor + monaco-yaml in a static web app for JSON-Schema-driven YAML validation/autocomplete: how a JSON Schema gets delivered to/consumed by the client, GitHub Pages hosting constraints (base path, static asset serving), and GitHub Actions free-tier scheduling limits/cron syntax for a periodic "check Jere's repo, regenerate schema, redeploy" workflow. Confirm the whole pipeline is realistically $0 forever at expected usage levels.

Save findings to `.scratch/ewp-toolkit/research/05-web-app-mechanics.md`.

## Answer

Confirmed $0-forever and buildable as designed. Full findings: [research/05-web-app-mechanics.md](../research/05-web-app-mechanics.md).

Key results:
- monaco-yaml requires a bundler (its own README: no unbundled path exists) — Vite recommended, zero-config static output, matches "GitHub Pages" target.
- Bundle the schema JSON at build time (`import schema from './ewp-schema.json'`) rather than runtime-fetching it — simpler, no CORS, no extra network round-trip.
- GitHub Pages project sites serve at `<owner>.github.io/<repo>/`, not root — Vite `base` must be set to match or assets 404. Single most common Pages+Vite bug.
- GitHub Pages limits (1 GB site, 100 GB/mo bandwidth, 10 builds/hr) are nowhere near what this tool needs.
- Public-repo GitHub Actions on standard runners are unmetered (no 2,000 min/mo cap — that's private-repo only). Scheduling floor is 5 minutes; daily/6-hourly cadence is trivial.
- **Real gotcha**: the default `GITHUB_TOKEN` cannot trigger a second (`on: push`) workflow, so a two-workflow "regen commits → build workflow fires" design would silently never deploy. Fix: do regen + build + deploy as one `schedule`-triggered workflow.
- Repo's Pages "Build and deployment source" must be switched to "GitHub Actions" (one-time setting) for a custom workflow to publish at all.
