# EW Toolkit — Agent Notes

Shared standing rules for any agent working in this repo — Claude Code or Cursor. `ewp_validator`-specific rules live one level down: [ewp_validator/AGENTS.md](ewp_validator/AGENTS.md); `ew_wiki`-specific rules the same way, in [ew_wiki/AGENTS.md](ew_wiki/AGENTS.md). Domain vocabulary is split the same way, in `CONTEXT.md`.

## Domain docs

Single-context — `CONTEXT.md` + `docs/adr/` at the repo root; wayfinder maps under `.scratch/`. See [../docs/agents/domain.md](../docs/agents/domain.md). (Issue tracker and triage labels: same generic convention as the root project — see the root `CLAUDE.md`, not duplicated here.)

## Dual-agent workflow (Cursor ↔ Claude Code)

- **One agent at a time** per project folder — never run Cursor and Claude Code on the same folder simultaneously.
- **Commit + push before switching** agents; **pull when opening** the other agent.
- Update `HANDOFF.md` at the end of every session so the next agent can continue.
- This repo runs as two worktrees: `main` (Claude Code, `ew_toolkit/`) and `cursor/work` (Cursor, `ew_toolkit-cursor/`).
- **Standing-rule files (`AGENTS.md`, `CLAUDE.md`, `CONTEXT.md`, `docs/agents/`) must match byte-for-byte between the two worktrees** — enforced by a Stop hook, not memory; see `docs/agents/hooks-vs-rules.md`.

## Cost & tooling

- **$0 forever.** GitHub free tier only (Pages + Actions) — no paid hosting or services, ever, without explicit sign-off.
- **Reuse before building.** Prefer existing free/open tooling (e.g. Monaco + monaco-yaml) over a custom build.
- **Minimal tooling.** No workspace/monorepo tooling (npm workspaces, Turborepo, Nx) unless plain per-Tool `package.json` + build scripts prove genuinely painful.
- **`valheimtools.stream` is a cross-check reference only** — never a dependency, never coordinate with its owner.
- **Tool registration is a hardcoded list** in the landing page source — no auto-discovery/manifest scanning until managing the list by hand becomes painful.
- **A new Tool making claims about a mod/game's real behavior** gets its own `docs/sources.md` (format: `ew_wiki/docs/sources.md`) and one line in the source-verify hook's config table — see `docs/agents/hooks-vs-rules.md`.

## Confirm, don't guess

State an external or domain fact — a file path, how a tool behaves, install steps — only when it's already confirmed in the repo, cited from a source, or confirmed by the maintainer this session. When a needed fact isn't established yet, ask or get permission to check a source first — never assert it and move on.

## Script field order

When we write an EWP script together, fields go in this order (skip any that don't apply — don't pad):

Top level: `prefab` > `type` > `weight` > `exec` > `filter` (and its variants `filters`/`bannedFilter`/`bannedFilters`) > `objects`/`bannedObjects` > the rule's action (`data`, `spawn`, `remove`, ...) > `injectData` (only with `data`, goes directly after it) > `command`/`commands` > `poke`

Inside a `poke:`/`objects:`/`bannedObjects:`/`spawn:` list item: `prefab` > `filter` (poke/objects/bannedObjects) or `data` (spawn) > `position`/`offset` > `rot`/`rotation` > `delay` > `parameter`

This is a personal authoring convention, not an EWP requirement — YAML key order is cosmetic and never changes how a script runs. A field not named here (a new one, or one we're unsure of) doesn't get silently placed — ask before slotting it in, then add the agreed placement into this rule so the next script doesn't need to ask again.

## UI/UX consistency

Any change that touches design — a new feature or a change to an existing one — gets the same treatment: think through the best UX approach before building, and if a different approach would serve the user better than the one requested, say so and explain the recommendation before writing code. Silently building the literal request when a better approach is visible is the failure mode this guards against.

Four mechanisms keep that principle enforced in practice:

1. **Message-quality checklist** — every user-facing diagnosis/error/warning message must: name the offending value/key, not just its location; say what to do next; carry no raw schema/regex/parser jargon (translate generated errors before they reach the user); represent one diagnosis per root cause (check for an existing check on the same root cause before adding a new one); give a closed, enumerable upstream error set a complete translation table, never a partial one; name an existing UI control that directly fixes the problem, in plain words only — never an emoji or icon glyph, since diagnosis text is escaped and can never carry a symbol that actually matches the real button; get a regression test on every wording fix.
2. **Shared visual identity, imported not copied.** Icon paths and the identity color palette (background/panel/border/text/muted/hover) live in the `shared/` module, imported by every Tool and the landing page. A hand-copied icon or color drifts the moment one side changes and the other doesn't — this has already happened twice (a copy-pasted icon set, a diverged `--info` variable across two `style.css` files). A `shared/` change that looks right on one Tool but not another is the same drift risk one layer down — enforced by a PostToolUse hook, not memory, that reminds to verify computed styles live across all 3 Tools before calling such a change done; see `docs/agents/hooks-vs-rules.md`. Severity colors (error/warning/info) are the one exception — validator-only semantics, stay local to whichever Tool defines them. The favicon is the same identity, but a static binary asset rather than importable code: `shared/favicon.png` is the one master, copied into each Tool's own `public/` by `scripts/sync-favicon.mjs`, wired as every Tool's own `predev`/`prebuild` script — a new Tool adds itself to that script's `targets` list rather than dropping in its own icon file. A framework that doesn't auto-pick-up `public/favicon.*` (Starlight silently defaults to its own bundled icon otherwise) needs its `favicon:`-equivalent config option set explicitly too.
3. **Confirm-modal defaults are chosen, never assumed.** State which button is primary and why, per use case — don't default to a generic OK/Cancel convention. Default lean: the safe/non-destructive choice is primary (Cancel on a delete/overwrite confirm); a task-completion action only earns primary when it's itself the safe choice (e.g. "Skip these files" avoids adding invalid data by default). A destructive confirm never binds Enter to any button — only Escape → cancel — so a stray keypress can never cause data loss.
4. **Every Tool renders the hub's own site-nav bar — one shared implementation, not a hand-copy.** Arriving at any Tool from the hub should feel like switching tabs, not leaving the site. The bar's registry, markup, CSS, and theme-toggle logic each live in exactly one place — `shared/navBar.ts`'s `NAV_TOOLS`/`renderNavBar`/`buildNavItems`, `shared/theme.css`, `shared/theme.ts`'s `mountThemeToggle` — never reimplemented per Tool; see `docs/agents/hub-tool-nav.md` for the walkthrough. Its own build config's `base` must be the full nested path it's actually served at (`/ew_toolkit/<tool>/`), not just the Tool's bare name — a bare-name base breaks every asset and internal link once nested under the hub.
