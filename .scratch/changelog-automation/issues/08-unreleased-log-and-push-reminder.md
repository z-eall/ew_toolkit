Type: grilling
Status: closed
Claimed by: Claude (this session, 2026-09-16)

## Question

Two related gaps the maintainer raised live: (1) work done between release cuts has no running record — if several commits land and nobody remembers to cut a release, that history is only recoverable by re-reading `git log`, not an actual list; (2) a release can be silently skipped, since cutting one is a separate manual step nobody is ever prompted to consider.

Decide and build the mechanism for both, without breaking this map's standing $0/local-only preference (no CI involvement — see [ticket 02](02-trigger-and-mechanism.md)).

## Answer

**Decided live with the maintainer (2026-09-16), two mechanisms, both hooks (mechanical trigger — a git subcommand), not just written rules:**

**1. Running unreleased log — `guard-changelog-unreleased-log.cjs`.** Fires on `PostToolUse`/`Bash` (Cursor: `postToolUse`/`Shell`) whenever a `git commit` runs. Reads the just-made commit (`git log -1 --format=%h %s`) and appends it as a bullet under `## Unreleased` in a new tracked file, `CHANGELOG-unreleased.md`, at the repo root — creating the heading if it's the first entry. Deduped by short hash, so a failed/no-op commit (HEAD unchanged) doesn't re-log the same line twice. Deliberately dumb: it logs the raw commit line, not reader-facing prose — a human/Claude still curates the real release notes into the What's New/Changed/Bug Fixes format ([ticket 07](07-whats-new-changed-bugfixes-format.md)) at actual cut time, same as today. This is the answer to "no history loss": even if ten sessions pass without a release being cut, every commit's one-line summary is sitting in a tracked file, not lost to memory.

**2. Ask-before-push reminder — `guard-changelog-cut-release-reminder.cjs`.** Fires on `PreToolUse`/`Bash` (Cursor: `preToolUse`/`Shell`) when a `git push` targets `main`. Counts commits since the last release tag (`git rev-list <last-tag>..HEAD --count`); if that count is 0, stays silent. If it's more than 0, it asks (advisory, not blocking): "`N` commits since `<tag>` haven't shipped in a release yet — want to cut one now, alongside `CHANGELOG-unreleased.md`, before/after this push?" Deliberately scoped to pushes made through an interactive session only — GitHub Actions' own nightly scheduled deploy stays untouched, so this doesn't need a CI change and doesn't break ticket 02's "no CI involvement" preference. A scheduled deploy running with nobody watching can't meaningfully be "asked" anything; the next interactive push after it still gets the reminder.

**`CHANGELOG-unreleased.md` seeded on creation** with every commit since the last real tag (`v2026-08-19`), so it starts accurate rather than empty.

**Check reach: standing rule, both mechanically hookable.** Same treatment as ticket 07 — the hooks are the enforcement, wired into `PreToolUse`/`PostToolUse` on `Bash` (and Cursor's `Shell` equivalents) in both worktrees' configs. No separate `AGENTS.md`/`CLAUDE.md` rule needed; this ticket plus the map's Notes is the human-readable record, the hooks are the real mechanism.
