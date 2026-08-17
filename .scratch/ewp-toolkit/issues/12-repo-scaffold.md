# Decide repo structure/scaffold and initial bootstrapping

Type: grilling
Status: open
Blocked by: (none)

## Question

Decide how `ewp_toolkit` is laid out now that the technical shape (Vite, Monaco/monaco-yaml, single combined schedule-triggered GitHub Actions workflow per ticket 05) and validation approach (tickets 06/08/09/10) are settled:

- Directory layout: where does the schema-generation script live vs. the web app vs. the GitHub Actions workflow file(s)?
- The one-time GitHub Pages "Build and deployment source → GitHub Actions" repo setting needs to be switched manually (per ticket 05) — when does that happen relative to the first working build?
- License: given the public/cost-free-for-community intent (from the original scoping), add a license now (e.g. MIT), or defer until there's actual code to license?
- Bare-minimum README: worth adding now for anyone who stumbles on the repo mid-build, or wait until v1 is functional?

See tickets [05](05-web-app-mechanics.md) and [10](10-discriminatorless-array-prototype.md) for the technical decisions this scaffolding needs to reflect.
