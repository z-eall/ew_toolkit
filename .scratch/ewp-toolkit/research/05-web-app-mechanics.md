# Research: Monaco + monaco-yaml on GitHub Pages/Actions — technical shape and $0-forever check

Ticket: `.scratch/ewp-toolkit/issues/05-web-app-mechanics.md`
Date: 2026-08-17

## Bottom line

**Yes — the pipeline described (scheduled Action regenerates a JSON Schema → build → deploy to GitHub Pages) is realistically achievable at $0 forever for a low-traffic public tool.** All four building blocks (Monaco Editor, monaco-yaml, GitHub Pages, GitHub Actions `schedule`) are free for public repos on standard runners, and the numbers involved (a small schema file, a handful of scheduled runs/day, a static site of a few MB) are nowhere near any of GitHub's soft or hard limits.

The plan as stated needs **one concrete fix**: a bundler (Vite is the obvious choice) is not optional — monaco-yaml's own README says it doesn't work without one — so "no backend server" is fine but "no build tooling at all" is not. The plan should also explicitly decide *inline vs. runtime-fetched* schema (recommend bundling the schema JSON as a build-time import, not `enableSchemaRequest` fetching from a URL) and should combine "regenerate schema" + "build" + "deploy" into a **single** workflow run rather than two workflows connected by a `git push`, because the default `GITHUB_TOKEN` cannot trigger a second workflow — a real gotcha that would otherwise silently break the "auto-redeploy" step.

---

## 1. Embedding Monaco Editor + monaco-yaml in a static site

### monaco-yaml repo location (verify first)
The package now lives at **github.com/remcohaszing/monaco-yaml** (moved from an earlier Microsoft-adjacent location; current maintainer @remcohaszing with @fleon and @yazaabed). This is the canonical upstream for the README claims below.
Source: [remcohaszing/monaco-yaml README](https://github.com/remcohaszing/monaco-yaml/blob/main/README.md)

### Is a bundler mandatory?
**Yes, for monaco-yaml specifically.** The project's own FAQ answers this directly:

> "No. monaco-yaml uses dependencies from node_modules, so they can be deduped and your bundle size is decreased. This comes at the cost of not being able to use it without a bundler."
(Answering "Can monaco-yaml be used without a bundler?")
Source: [remcohaszing/monaco-yaml README](https://github.com/remcohaszing/monaco-yaml/blob/main/README.md)

monaco-yaml is not tied to any UI framework (React/Vue/etc.) — "all that's needed is a DOM node to attach the Monaco Editor to" — so a plain static site (HTML/TS, no framework) is fine, but it still needs an npm-based build step (Vite, webpack, esbuild, etc.) to resolve `node_modules` imports and bundle the web workers monaco-yaml/monaco-editor rely on.

Monaco Editor itself (the base editor, independent of monaco-yaml) is more flexible: its README documents an **ESM build meant for bundlers** as the primary path, and separately notes:

> "The monaco editor also ships an AMD build for backwards-compatibility reasons, but the AMD support is deprecated and will be removed in future versions."
Source: [microsoft/monaco-editor README](https://github.com/microsoft/monaco-editor#readme)

So technically bare Monaco Editor *could* be loaded without a bundler via the deprecated AMD/CDN path, but since monaco-yaml requires a bundler regardless, the practical conclusion for this project is: **treat a bundler (Vite recommended for a "static site, GitHub Pages" target — zero-config static output, first-class support for bundling web workers which Monaco needs) as a hard requirement, not an optional nicety.**

### How monaco-yaml consumes a JSON Schema
Two supported modes, both confirmed in the README's configuration examples:

1. **Bundled/inline at build time** — pass the schema as a plain JS/JSON object in the `schemas` array of `configureMonacoYaml()`:
   ```js
   schemas: [
     {
       fileMatch: ['**/person.yaml'],
       schema: { type: 'object', properties: { name: { type: 'string' }, age: { type: 'integer' } } }
     }
   ]
   ```
   This is what you get if you `import schema from './ewp-schema.json'` at build time — no network request at runtime.

2. **Fetched at runtime from a URL** — set `enableSchemaRequest: true` and give a `uri` instead of an inline `schema`:
   ```js
   configureMonacoYaml(monaco, {
     enableSchemaRequest: true,
     schemas: [{ fileMatch: ['**/.prettierrc.*'], uri: 'https://json.schemastore.org/prettierrc.json' }]
   })
   ```
   This makes the editor issue an HTTP fetch for the schema at load time (and monaco-yaml/yaml-language-server can also auto-fetch schemas referenced by `$schema:` comments in the YAML itself when this flag is on).
Source: [remcohaszing/monaco-yaml README](https://github.com/remcohaszing/monaco-yaml/blob/main/README.md)

**Implication for this project:** either mode works with the "scheduled Action regenerates the schema" design. Bundling the schema at build time (mode 1) is simpler and more robust — it means the generated `schema.json` is just another asset the Vite build reads and inlines/copies, with no runtime dependency on a second fetch succeeding, no CORS considerations, and one fewer network round-trip for users. Runtime fetch (mode 2) only becomes useful if you want the page to pick up a new schema without a full redeploy — not needed here since the plan already redeploys on every schema regen.

---

## 2. GitHub Pages hosting constraints

### Base path handling
Confirmed URL formats, straight from GitHub's docs:

- **User/organization site:** `http(s)://<owner>.github.io`
- **Project site:** `http(s)://<owner>.github.io/<repositoryname>`
Source: [About GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages)

A repo like `ewp-toolkit` deployed as a **project site** (the normal case unless the user owns a dedicated `<username>.github.io` repo) will therefore be served at `https://<username>.github.io/ewp-toolkit/`, not at the domain root. This matters for the build: Vite's default `base: '/'` assumes root-relative asset paths, which will 404 under a subpath. The project needs `base: '/ewp-toolkit/'` (or `base: './'` for relative paths) set in `vite.config.*`, matching the repo name. This is a config detail, not a blocker, but it's the single most common GitHub-Pages-specific bug for Vite/webpack static sites and should be called out explicitly in the plan so it isn't rediscovered the hard way. A custom domain removes the subpath issue entirely (site serves from root) if the user ever wants that, but isn't required.

### Serving static JSON fine
Not separately documented as a special case — GitHub Pages serves any static file in the published output (HTML, JS, CSS, JSON, etc.) identically; nothing in the docs suggests JSON is treated differently from any other static asset. A generated `schema.json` a few hundred KB in size is a total non-issue.

### Free-tier size/bandwidth limits
From GitHub's official Pages limits doc:

- **Source repository:** "recommended limit of 1 GB."
- **Published site:** "may be no larger than 1 GB."
- **Bandwidth:** "soft bandwidth limit of 100 GB per month" (soft = advisory, not a hard cutoff for reasonable use).
- **Build frequency:** "soft limit of 10 builds per hour."
- **Deployment timeout:** deployments "will timeout if they take longer than 10 minutes."
- Also applies: rate limiting may return HTTP 429 under abuse-level traffic, but this isn't meant to restrict legitimate use.
Source: [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

None of these are remotely close to being hit by an EWP schema-validator tool: the whole bundled site (Monaco + monaco-yaml + a small schema) will be low single-digit MB, and even a modestly popular niche modding tool won't approach 100 GB/month.

### Pages deploys go through Actions — and it's free
GitHub's own docs state: "Your GitHub Pages site will always be deployed with a GitHub Actions workflow run, even if you've configured your GitHub Pages site to be built using a different CI tool."
Source: [Configuring a publishing source for your GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

Crucially, GitHub's Actions billing docs list GitHub Pages explicitly as one of the categories where standard-runner usage is free, and separately confirm standard GitHub-hosted runners are unconditionally free for public repositories regardless of category. So Pages' own build/deploy step does not eat into the 2,000 free minutes budget that private repos are capped by — and for a **public** repo, none of this is capped at all (see §3).
Source: [About billing for GitHub Actions](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions)

---

## 3. GitHub Actions free-tier scheduling

### Minutes
- Free plan: **2,000 minutes/month** of standard-runner Actions time for **private** repositories, resetting to zero at the start of each month, plus 500 MB artifact storage and 10 GB cache storage/month.
- **Public repositories: "The use of standard GitHub-hosted runners is free"** — effectively unmetered on standard runners, no monthly minute cap.
Source: [About billing for GitHub Actions](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions)

Since the EWP toolkit is a public repo (GitHub Pages on the free plan only works for repos that are public, or private on paid plans — irrelevant either way since this project is public), the scheduled workflow's Actions minutes are not a real constraint at all.

### Cron syntax and minimum interval
GitHub Actions' `schedule` trigger uses standard 5-field POSIX cron:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of the month (1 - 31)
│ │ │ ┌───────────── month (1 - 12 or JAN-DEC)
│ │ │ │ ┌───────────── day of the week (0 - 6 or SUN-SAT)
│ │ │ │ │
* * * * *
```
with operators `*`, `,`, `-`, `/`.

- **"Once a day"** (e.g. 03:00 UTC): `0 3 * * *`
- **"Every 6 hours":** `0 */6 * * *`

**Minimum interval GitHub actually allows:** "The shortest interval you can run scheduled workflows is once every 5 minutes." A daily or every-6-hours cadence for schema regen is far above this floor, so no issue.

**Delay caveat GitHub explicitly warns about:** "The `schedule` event can be delayed during periods of high loads of GitHub Actions workflow runs. High load times include the start of every hour," and GitHub recommends scheduling at an off-the-hour minute (e.g. `17 3 * * *` rather than `0 3 * * *`) to reduce queuing delay.

**Default-branch restriction:** "Scheduled workflows will only run on the default branch," and the workflow file must exist on that default branch for the schedule to fire at all — worth remembering if the repo ever restructures branches.

Source: [Events that trigger workflows — schedule](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows)

---

## 4. Sanity-check of the full pipeline and gotchas

**Pipeline as planned:** scheduled Action → check Jere's upstream repo → regenerate JSON Schema → commit → build (Vite) → deploy to Pages.

**Cost verdict:** every component is free for a public repo on GitHub's free plan — Pages hosting (well under all size/bandwidth limits), Pages' own Actions-driven build/deploy step (explicitly billed as free), and the scheduled regen workflow (public-repo Actions minutes are unmetered on standard runners). There is no plausible usage level for a niche Valheim-modding QoL tool that approaches GitHub's soft limits (100 GB/month bandwidth, 10 builds/hour, 1 GB site). **This is genuinely $0-forever**, not "cheap."

**Real gotchas to fold into the plan:**

1. **GITHUB_TOKEN can't chain workflows — combine steps into one workflow.** GitHub's docs state plainly: "events triggered by the `GITHUB_TOKEN` will not create a new workflow run" (with narrow exceptions not relevant here), and recommend "a GitHub App installation access token or a personal access token instead of `GITHUB_TOKEN`" if you specifically want one workflow's push to trigger another.
   Source: [Triggering a workflow from a workflow](https://docs.github.com/en/actions/using-workflows/triggering-a-workflow#triggering-a-workflow-from-a-workflow)

   Practically: if the design is "Workflow A (schedule) regenerates schema and `git push`s the commit" + "Workflow B (`on: push`) builds and deploys," **Workflow B will silently never fire**, because the push was made with the default `GITHUB_TOKEN`. Two ways to avoid this:
   - **Recommended:** do it all in a *single* workflow triggered by `schedule` — regenerate schema, build, and deploy to Pages (via `actions/deploy-pages`) all as steps/jobs of the same run. No second push-triggered workflow needed, no PAT needed.
   - **Alternative:** keep two workflows but push the commit using a personal access token (PAT) or GitHub App token stored as a repo secret, so the push event is attributed to a real actor and can trigger the `on: push` workflow. This adds a secret-management burden (PAT rotation/expiry) for no real benefit here — the single-workflow approach is simpler and should be preferred.

2. **Deploying via Actions requires specific permissions and the "GitHub Actions" Pages source.** The Pages custom-workflow docs specify the deploy job needs `pages: write` and `id-token: write` permissions, should depend (`needs:`) on the build job so it doesn't deploy before an artifact exists, and needs the `github-pages` deployment environment — plus the repo's Pages "Build and deployment source" setting must be switched to "GitHub Actions" (rather than "Deploy from a branch") for a custom workflow to be the publishing source at all. This is a one-time repo settings step, not a recurring cost, but needs to be done deliberately when scaffolding the repo.
   Source: [Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

3. **Vite `base` path must match the repo name for a project site.** Since the site will live at `/ewp-toolkit/` rather than `/`, forgetting to set `base` in the Vite config is the single most likely "it works locally, 404s on Pages" bug. Cheap to avoid, worth stating explicitly in the implementation plan.

4. **Schedule timing should avoid the top of the hour** given GitHub's documented delay risk at high-load times — pick a non-zero minute (e.g. `17 3 * * *`) for whatever cadence is chosen.

5. **Prefer build-time-bundled schema over runtime fetch.** Given the regenerate → build → deploy pipeline already produces a fresh bundle on every schema change, there's no benefit to `enableSchemaRequest`-style runtime fetching (mode 2 in §1) and it adds a dependency on a successful cross-origin fetch at every page load plus CORS considerations if the schema were ever hosted elsewhere. Bundle `schema.json` as a build-time import instead.

**Nothing found that would force a change of hosting/CI provider or reintroduce a backend.** The plan's core shape (Monaco + monaco-yaml, static Vite build, GitHub Pages via Actions, scheduled regen) is directly supported by every primary source consulted; the changes above are refinements/fixes, not architecture changes.

---

## Sources consulted (primary only)

- [remcohaszing/monaco-yaml — README.md](https://github.com/remcohaszing/monaco-yaml/blob/main/README.md) (current upstream repo for monaco-yaml, confirmed via GitHub search)
- [microsoft/monaco-editor — README](https://github.com/microsoft/monaco-editor#readme)
- [GitHub Docs — About GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages)
- [GitHub Docs — GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [GitHub Docs — Configuring a publishing source for your GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [GitHub Docs — Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub Docs — Events that trigger workflows (schedule)](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows)
- [GitHub Docs — About billing for GitHub Actions](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions)
- [GitHub Docs — Triggering a workflow from a workflow (GITHUB_TOKEN limitation)](https://docs.github.com/en/actions/using-workflows/triggering-a-workflow#triggering-a-workflow-from-a-workflow)
