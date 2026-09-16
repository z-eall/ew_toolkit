# Build pid/ownership verification hook

Type: task
Status: closed
Claimed by: Claude (this session, 2026-09-15)

## Question

Build the standing-verification hook designed in `spec-pid-ownership-mechanic.md` §7: a `PreToolUse` guard that fires on any `Edit`/`Write` to a `.md`/`.mdx` file anywhere in the repo (both `ew_toolkit` and `ew_toolkit-cursor` worktrees) whose newly-added text mentions pid/ownership vocabulary, and asks for confirmation the claim was checked against `EWP_pid_ownership_code_findings.md` before the edit lands.

Keyword list locked this session (see spec.md §7, updated 2026-09-15): `<pid>`, `<cid>`, `ClaimOwnership`, `SetOwner`, `SetOwnerInternal`, `owner`, `creator`, `ZDOVars.s_owner`, `ZDOVars.s_creator`, `long_creator`, `long_owner`, `ReleaseZDOS`, "zone host" (case-insensitive substring match).

This is execution work (a Task-type ticket, agent-driven/AFK), not a decision — it exists to close the loop the ledger and spec already opened, per the maintainer's explicit instruction to build it now.

## Answer

Built `guard-pid-ownership-ledger.cjs` in `C:\Users\Ultimate\Claude\.agents\hooks\ew_toolkit\` (shared hook location, same as every other `ew_toolkit` guard hook — one copy serves both worktrees), wired into `.claude/settings.json`'s `PreToolUse` `Edit|Write` list, dual-harness (`lib/cursor-adapter.cjs`) like its siblings.

**Design decisions made while building, verified against `spec-pid-ownership-mechanic.md` and `EWP_pid_ownership_code_findings.md`:**

1. **Scans only the newly-added text, not the full reconstructed file** (`adapter.getNewlyAddedText`, not `getReconstructedContent`) — matches the adapter lib's own stated purpose ("banned-phrase scans must only see what's being added... scanning the reconstructed full file would false-flag an edit that's fixing a violation elsewhere in the same file"). Without this, editing any *other* part of a page that already discusses ownership would re-trigger the ask every time, which the spec's "blocks and asks" design never intended as a per-page nag.
2. **Excludes the ledger and spec files from checking themselves** — `EWP_pid_ownership_code_findings.md` and `spec-pid-ownership-mechanic.md` are the source of truth the hook points *at*; without an exclusion, every edit to the ledger (which is made of nothing but ownership vocabulary) would trigger a hook telling the editor to go check the ledger against itself. Not addressed explicitly in spec §7 — added as an obvious necessary carve-out, flagged here for the maintainer to confirm rather than assumed silently.
3. **Left everything else in scope exactly as spec §7 states** — including other `.scratch/` planning docs (tickets, maps) that may casually mention "owner"/"creator" in a different context. Spec says "any `.md`/`.mdx` file anywhere in this repo" with no other carve-out, so this hook doesn't add one. **Flagged as a real risk**: if this turns out noisy on planning docs, the fix is narrowing the file-path scope (e.g. `ew_wiki/**` only), not the keyword list — worth watching in practice before deciding.
4. Message points at the ledger's actual repo-relative path (derived from whichever worktree root the edited file sits under, same `HUB_ROOT_PATTERN` trick as `guard-doc-example-schema.cjs`) and asks the same question spec §7 specifies: was this claim checked against the ledger, or does it need a fresh sweep per the Tier test (spec §3) first.

Not yet done: the `AGENTS.md` rule (spec §8) — still needs a `/writing-for-agents` pass before landing, per wayfinder's own reach-check step. Separate follow-up, not blocking this ticket's close.
