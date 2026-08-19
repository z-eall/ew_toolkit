# Changelog Automation — Map

Labels: wayfinder:map

## Destination

Every time a curated batch of fixes/changes reaches the live EW Toolkit site, a changelog entry is generated automatically — summarized by AI from the commits/diff since the last entry — and published as a GitHub Release, without the user hand-writing release notes each time. The mechanism is toolkit-wide (any Tool's changes can feed it), not hardcoded to the validator, even though the validator is the only Tool today.

Reaching the destination means: the user marks a batch of pushed changes as release-worthy, a pipeline (automated as far as feasible at $0 cost) produces a well-formatted summary of what changed, and that summary is live as a GitHub Release with no further manual writing.

## Notes

- Domain: same repo as [ew_toolkit's map](../ew_toolkit/map.md) and [EW Toolkit Hub's map](../ew_toolkit/hub-map.md) — see [CONTEXT.md](../../CONTEXT.md). This effort introduces its own vocabulary (release-worthy push, changelog entry) — no dedicated glossary section yet; fold in during a `/domain-modeling` pass if terms multiply.
- Standing preference carried over from the sibling maps: cost stays at $0 — GitHub free tier only (Pages + Actions), no paid hosting/services. Any AI-summarization approach must respect this or get explicit sign-off to break it.
- Skills every session should consult: `/grilling` and `/domain-modeling` for decision tickets; `/research` for the AFK research ticket; `/prototype` for the release-notes-format ticket.
- Deploy pipeline this plugs into: [build-deploy.yml](../../.github/workflows/build-deploy.yml) — pushes to `main` build+deploy on every push and nightly on schedule. This map does NOT change that trigger; the changelog trigger is a separate, curated signal (see ticket 01/02) layered on top, not "every deploy."
- Origin: user asked (2026-08-18) for a workflow to auto-generate a summarized changelog whenever validator fixes ship, wanting the design decisions peeled one layer at a time for review.
- Locked during destination-naming (2026-08-18): scope = toolkit-wide; trigger = curated release points (not every push, not fully manual); content = AI-summarized from commits/diff; surface = GitHub Releases only (not an in-site page or in-app panel).

## Decisions so far

- [Research: feasible AI-summarization mechanisms for changelog automation](issues/01-summarization-mechanism-research.md) — the $0 GitHub-native options (`--generate-notes`, release-drafter) only produce categorized PR-title lists, not true prose summaries; genuine summarization requires either a manual local Claude Code step ($0) or a paid Anthropic API call in CI (~$0.005–$0.03/release, breaks the $0 preference without sign-off).
- [Should the hub link to the changelog, and where?](issues/04-site-side-link.md) — Yes, as a plain "Changelog" link (no symbol) beside the theme toggle in the sticky top nav's right slot — visible on every page without scrolling, but kept secondary to the Home/Tools/Support nav items.
- [Decide the release trigger + automation mechanism](issues/02-trigger-and-mechanism.md) — Fully local, $0: a human decides to cut a release and runs a local script; Claude Code drafts notes from `git log`/diff since the last tag; tags are the cutter's **local** calendar date (`vYYYY-MM-DD`, `-2`/`-3` suffix on same-day collisions); the script pushes the tag and runs `gh release create --notes-file`. No CI involvement, `build-deploy.yml` untouched.
- [What should a generated release-notes entry look like?](issues/03-release-notes-format.md) — Sections grouped by the validator's own diagnostic-category vocabulary, not a generic Fixed/Added/Changed split or flat list — reads instantly to users of the Problems-panel filters. Five-name list and “do not rewrite published notes” later revised in ticket 05.
- [Retroactive reformat and release 3](issues/05-retroactive-reformat-and-release-3.md) — leave `v2026-08-18` / `v2026-08-18-2` as-is; next notes use **Site first**, then the six live FILTER names (including **YAML problem**).

## Implementation (2026-08-18)

All four tickets' decisions are implemented, not just recorded: the "Changelog" nav link (ticket 04) landed in both `src/nav.ts`/`src/style.css` (hub) and `ewp_validator/src/main.ts`/`ewp_validator/src/style.css` (validator's own copy — separate npm project, not shared via `nav.ts`); the release script (ticket 02) landed at `scripts/cut-release.mjs` (`npm run cut-release -- <notes-file>`). Ticket 03's format (grouped by validator diagnostic category) is documented as the convention for whoever drafts notes locally, not itself codified in a template file. Verified: hub typechecks clean (`npx tsc --noEmit`), validator typechecks clean and its 135 tests pass, both dev servers render the new nav link and the shortened/hover-tooltip schema timestamp correctly.

## Not yet specified

- **How a future Tool #2's changes get attributed within a toolkit-wide release** — single combined stream vs. per-Tool sections. Genuinely needs a second Tool to exist before this is answerable concretely; revisit when Tool #2 is chosen (see Hub map's own "out of scope").
- **Whether GitHub Releases turns out to be sufficient discoverability** — the user explicitly chose GitHub Releases over an in-site page this round; if that proves too buried for end users later, resurfacing a site-side page/link is a candidate revision, not pre-built now.

## Out of scope

- **In-site changelog page or in-app "what's new" panel** — explicitly declined in favor of GitHub Releases during destination-naming (2026-08-18). Would return only if the destination is redrawn.
- **Automating the underlying deploy trigger itself** (`build-deploy.yml`'s push/schedule triggers) — untouched; this map only adds a changelog layer on top of the existing pipeline.
- **Semantic versioning / version numbers for the toolkit** — not raised by the user; the toolkit is continuously deployed, not versioned releases in the semver sense. Revisit only if GitHub Releases' tag-based model forces a version scheme decision.
