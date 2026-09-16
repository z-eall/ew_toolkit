# How should a future Tool's changes be attributed within a toolkit-wide release, now that Tool #2 exists?

Type: grilling
Status: closed
Claimed by: Claude (this session, 2026-09-16)

## Question

This map's own fog note said: "How a future Tool #2's changes get attributed within a toolkit-wide release — single combined stream vs. per-Tool sections. Genuinely needs a second Tool to exist before this is answerable concretely; revisit when Tool #2 is chosen." Tool #2 (`ew_wiki`) is now chosen, built, and shipped.

Decide the attribution shape for the next real release that includes `ew_wiki` changes alongside `ewp_validator` changes: one combined chronological stream (current de facto behavior — [ticket 03](issues/03-release-notes-format.md) grouped only by the validator's own diagnostic-category vocabulary, which doesn't naturally extend to non-validator Tools), or per-Tool sections within one release entry, or something else. Consider: does grouping by validator diagnostic category still make sense for a release that's mostly `ew_wiki` content changes (which have no diagnostic category at all)?

## Answer

**Decided live with the maintainer (2026-09-16): per-Tool sections.** A release entry that touches more than one Tool gets a top-level heading per Tool (e.g. `## EWP Validator`, `## Ew Wiki`). Inside each section, use whatever grouping actually fits that Tool's own changes — Validator keeps [ticket 03](03-release-notes-format.md)'s diagnostic-category grouping (Site first, then the six FILTER names); Wiki uses its own natural grouping (e.g. New pages / Content fixes / Structure) since it has no diagnostic category at all. This scales cleanly to a future Tool #3 without forcing its changes into a scheme built for the Validator.

A release that only touches one Tool doesn't need the extra heading — this only kicks in once a release spans more than one Tool.

**Check reach**: map-scoped, not standing-rule-worthy. Like ticket 03's format, this is guidance for whoever drafts notes locally (today: Claude Code, run via `npm run cut-release`) — not codified in a template file, since the script doesn't generate the prose itself. Nothing to write in `AGENTS.md`/`CLAUDE.md`; this convention lives in this ticket and the map's own Notes/Decisions.

**Superseded in part (2026-09-16) by [The going-forward release-notes format](07-whats-new-changed-bugfixes-format.md):** the per-Tool split above still stands (each Tool that changed gets its own heading), but "Validator keeps ticket 03's diagnosis-category grouping inside its section" does not — every Tool, Validator included, now uses the same What's New/What's Changed/Bug Fixes structure. See ticket 07 for the real going-forward format.
