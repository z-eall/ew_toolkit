# What's the technical shape of a Monaco-based validator on GitHub Pages + Actions?

Type: research
Status: open
Blocked by: (none)

## Question

Investigate the mechanics of embedding Monaco Editor + monaco-yaml in a static web app for JSON-Schema-driven YAML validation/autocomplete: how a JSON Schema gets delivered to/consumed by the client, GitHub Pages hosting constraints (base path, static asset serving), and GitHub Actions free-tier scheduling limits/cron syntax for a periodic "check Jere's repo, regenerate schema, redeploy" workflow. Confirm the whole pipeline is realistically $0 forever at expected usage levels.

Save findings to `.scratch/ewp-toolkit/research/05-web-app-mechanics.md`.
