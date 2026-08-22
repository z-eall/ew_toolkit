# EW Toolkit — Agent Notes

Shared standing rules for any agent working in this repo — Claude Code or Cursor. `ewp_validator`-specific rules live one level down: [ewp_validator/AGENTS.md](ewp_validator/AGENTS.md). Domain vocabulary is split the same way, in `CONTEXT.md`.

## Agent skills

### Issue tracker

Issues live as markdown files under `.scratch/<feature>/`. See [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md).

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See [docs/agents/triage-labels.md](docs/agents/triage-labels.md).

### Domain docs

Single-context — `CONTEXT.md` + `docs/adr/` at the repo root; wayfinder maps under `.scratch/`. See [docs/agents/domain.md](docs/agents/domain.md).

## Dual-agent workflow (Cursor ↔ Claude Code)

- **One agent at a time** per project folder — never run Cursor and Claude Code on the same folder simultaneously.
- **Commit + push before switching** agents; **pull when opening** the other agent.
- Update `HANDOFF.md` at the end of every session so the next agent can continue.
- This repo runs as two worktrees: `main` (Claude Code, `ew_toolkit/`) and `cursor/work` (Cursor, `ew_toolkit-cursor/`).

## Cost & tooling

- **$0 forever.** GitHub free tier only (Pages + Actions) — no paid hosting or services, ever, without explicit sign-off.
- **Reuse before building.** Prefer existing free/open tooling (e.g. Monaco + monaco-yaml) over a custom build.
- **Minimal tooling.** No workspace/monorepo tooling (npm workspaces, Turborepo, Nx) unless plain per-Tool `package.json` + build scripts prove genuinely painful.
- **`valheimtools.stream` is a cross-check reference only** — never a dependency, never coordinate with its owner.
- **Tool registration is a hardcoded list** in the landing page source — no auto-discovery/manifest scanning until managing the list by hand becomes painful.

## UI/UX consistency

Any change that touches design — a new feature or a change to an existing one — gets the same treatment: think through the best UX approach before building, and if a different approach would serve the user better than the one requested, say so and explain the recommendation before writing code. Silently building the literal request when a better approach is visible is the failure mode this guards against.

Three mechanisms keep that principle enforced in practice:

1. **Message-quality checklist** — every user-facing diagnosis/error/warning message must: name the offending value/key, not just its location; say what to do next; carry no raw schema/regex/parser jargon (translate generated errors before they reach the user); represent one diagnosis per root cause (check for an existing check on the same root cause before adding a new one); give a closed, enumerable upstream error set a complete translation table, never a partial one; name an existing UI control that directly fixes the problem, in plain words only — never an emoji or icon glyph, since diagnosis text is escaped and can never carry a symbol that actually matches the real button; get a regression test on every wording fix.
2. **Shared visual identity, imported not copied.** Icon paths and the identity color palette (background/panel/border/text/muted/hover) live in the `shared/` module, imported by every Tool and the landing page. A hand-copied icon or color drifts the moment one side changes and the other doesn't — this has already happened twice (a copy-pasted icon set, a diverged `--info` variable across two `style.css` files). Severity colors (error/warning/info) are the one exception — validator-only semantics, stay local to whichever Tool defines them.
3. **Confirm-modal defaults are chosen, never assumed.** State which button is primary and why, per use case — don't default to a generic OK/Cancel convention. Default lean: the safe/non-destructive choice is primary (Cancel on a delete/overwrite confirm); a task-completion action only earns primary when it's itself the safe choice (e.g. "Skip these files" avoids adding invalid data by default). A destructive confirm never binds Enter to any button — only Escape → cancel — so a stray keypress can never cause data loss.
