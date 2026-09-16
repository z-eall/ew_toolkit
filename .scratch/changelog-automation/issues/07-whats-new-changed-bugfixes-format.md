Type: grilling
Status: closed
Claimed by: Claude (this session, 2026-09-16)

## Question

Ticket 03/05's format (per-diagnosis-category headers — Site, Structure problem, Value problem, Reference problem, YAML problem, Invalid file, Legacy but working) was built for a single-Tool, validator-only release. [Ticket 06](06-tool-2-attribution-in-releases.md) then decided per-Tool sections once `ew_wiki` shipped, keeping the diagnosis-category headers inside the Validator's own section.

While drafting a real release covering both Tools, the maintainer redirected live: reader-facing notes shouldn't name a file (`basic-filter.mdx`) the reader has never seen, the brand is "EW Wiki" (not "Ew Wiki"), and — overriding ticket 06's split — both Tools should use the **same** three-bucket structure instead of the Validator keeping its own diagnosis-category headers.

## Answer

**Decided live with the maintainer (2026-09-16): a single going-forward format for every Tool.** Supersedes ticket 03/05's diagnosis-category headers and the part of [ticket 06](06-tool-2-attribution-in-releases.md) that kept them for the Validator.

```markdown
## <Tool name, or "Site" for cross-cutting hub/nav changes — first if present>

**What's New:**
- <bullet, or **Page/Feature display name**: description if short>

**What's Changed:**
- <bullet — nest sub-bullets under a name if the update is long, see example below>

**Bug Fixes:**
- <bullet>
```

Rules:
- Only the buckets that have real content appear — never force an empty "Bug Fixes:" with nothing under it.
- One heading per Tool that has changes in this release; a single-Tool release just gets that Tool's heading (Site's own cross-cutting items, when any, lead).
- Reference a page or feature by its real **display title** (`Understanding Filter`, not `basic-filter.mdx`) — the reader has never seen the file name.
- Nest a page/feature name as its own bullet with sub-bullets when its update needs more than one line; otherwise keep it a single `**Name**: description` line.
- Brand name is **EW Wiki** (both letters capitalized) in release notes, regardless of the site's own longer internal title ("Expand World Wiki").

Reference example drafted and approved this session: `C:\Users\Ultimate\AppData\Local\Temp\claude\C--Users-Ultimate-Claude-ew-toolkit-ew-wiki\00a7d395-d8f5-4097-bbc5-3d450081e26c\scratchpad\release-notes-draft-v2026-09-16.md` (a scratch file, not part of this repo).

**Check reach: standing rule, hookable.** This governs every future release, not just this map's own tickets, and the trigger is mechanical (the notes file handed to `scripts/cut-release.mjs`) — so per the "Hooks vs. rules" habit it got a real hook, not just a written rule: `guard-changelog-release-format.cjs`, wired into `PreToolUse`/`Bash` (and Cursor's `Shell` equivalent) in both worktrees' configs (`ew_toolkit/.claude/settings.json`, `ew_toolkit-cursor/.claude/settings.json`, `ew_toolkit-cursor/.cursor/hooks.json`). It fires when a Bash/Shell command matches `cut-release`, reads the notes file the command names, and asks (advisory, not blocking) if: none of the three headings are present, a superseded diagnosis-category heading is still used, a raw `*.mdx` file name appears in the text, or the brand is written "Ew Wiki". Functionally tested against a deliberately-bad notes file (flagged all four) and a compliant one (silent allow) before wiring it in.

No `AGENTS.md`/`CLAUDE.md` rule needed beyond this ticket and the hook itself — the hook *is* the standing rule's enforcement; the map's Notes gets the one-line pointer for anyone who wants the human-readable version without opening the hook source.
