# Editable Message & Category Catalog — Map

## Destination

A single YAML catalog (`ewp_validator/src/messages.yaml` or similar) is the
sole source of truth for every diagnosis message's **wording** and every
diagnosis **category label** — editable directly by the scripter (edit the
file, `git push`, the existing scheduled GitHub Action redeploys — no need to
prompt an agent for a minor wording tweak). The file carries a **generated
inline legend** (YAML comments) documenting each entry's placeholders so it
can't drift out of sync with what the code actually provides. A bad edit
(broken YAML, a placeholder the code doesn't supply) **fails the deploy
loudly** via a build-time validator, never ships silently broken text. The
diagnosis **category grouping itself** has been redesigned (not just
reworded) per the scripter's judgment — today's grouping is confirmed "off,"
not just inconsistently worded. A follow-on pass has removed message-
generation code that's redundant/overlapping or confirmed to rarely/never
fire, now that everything funnels through one catalog.

Reaching the destination means: the scripter can open one file, reword any
diagnosis message or rename/regroup any category, push, and see it live
within a few minutes — no code review, no prompting an agent — and the
codebase's message/category-generation logic is no larger than it needs to be.

## Notes

- Domain: `ewp_validator`'s diagnosis-message UX. Sub-effort of the
  [EW Toolkit map](../ew_toolkit/map.md), sibling to the
  [Schema Source Audit map](../schema-source-audit/map.md) and this session's
  Round 10 message-quality work ([ticket 13](../ew_toolkit/issues/13-v1-user-testing-feedback.md)).
- **Standing preference inherited from the parent map:** $0 cost, no backend
  — the site is static (GitHub Pages, built by a scheduled GitHub Action).
  "Editable and goes live" means *edit a file in the repo and push*, not a
  live in-app editor with its own write path. A GitHub-API-backed in-app
  editor was explicitly considered and ruled out this session (see Out of
  scope) for exactly this reason.
- This map's tickets **carry execution**, not just decisions — matching how
  the Schema Source Audit map and ticket 13's rounds already work in this
  repo. A ticket here resolves *and implements*.
- Applies the hub-wide **message-quality checklist** and the **two-step
  source-verify-then-duplication-check standing rule**, both in the
  [EW Toolkit map](../ew_toolkit/map.md)'s Notes — any message reworded here
  still has to pass that bar, and the category redesign should be checked for
  new duplication/clash the same way a new validation rule would be.
- Skills: `/grilling` + `/domain-modeling` for the category-redesign ticket
  (the scripter has flagged the grouping as "off" but hasn't yet said what a
  *right* grouping looks like — that's a real decision, not a fact to look
  up); `/prototype` if useful for reacting to the legend format.
- Survey of the current message surface (~40 templates across 7 files, which
  ones are pure text vs. involve branch-selection logic) was done as
  background research for charting this map — cited inline in the relevant
  tickets rather than re-run.

## Decisions so far

- **Scope: wording only, code keeps branch-selection logic.** The catalog
  holds each message's final text with named placeholders
  (`'{{name}}' needs a 'prefab'.`); code still decides *which* catalog key
  applies and *what* values fill the placeholders. Editing can reword
  anything but can't accidentally change validator behavior. (Rejected:
  making the branching/conditions themselves editable — judged too large a
  scope, and risks edits silently changing what the validator actually
  flags.)
- **Bad-edit handling: fail the deploy loudly.** A build-time validator
  parses the catalog and confirms every placeholder the code expects is
  present before the site builds; a broken entry fails the GitHub Action
  instead of shipping a silently-wrong or raw fallback message live.
- **Editing mechanism: edit the file directly and push.** No custom in-app
  editor — open the YAML file (locally or via GitHub.com's built-in file
  editor), edit, commit. The existing scheduled Action rebuilds and
  redeploys automatically, same pipeline as every other change.
- **File format: YAML with an inline, generated legend.** Chosen over plain
  JSON specifically because YAML supports comments — the legend (what
  placeholders each key expects, a short description) can sit directly above
  each entry in the same file the scripter edits, instead of a second
  companion doc that can silently go stale. The project already depends on
  the `yaml` package, so no new dependency.
- **Cleanup pass scope: both redundant/overlapping code *and*
  rarely/never-firing rules.** Once wording funnels through one catalog,
  look for (a) message-generation helpers/branches that produce near-
  duplicate output or logic more complex than the case needs, and (b)
  validation rules that don't actually trigger against real EWP/WEC YAML —
  both are fair game to simplify or remove, not just flag for review.
- [Redesign the diagnosis category grouping](issues/01-category-grouping-redesign.md) — 10 categories → 5, grouped by kind of mistake: Structure problem, Value problem, Reference problem, Invalid file, Legacy but working. Naming principle: "___ problem" for mixed-severity buckets, "Invalid ___" only for pure-hard-error buckets. Two-line tag (kind + schema-shape subtitle). Implemented directly in code this session (not deferred) — 177/177 tests passing, live-verified.

## Not yet specified

- The exact mechanism for regenerating the legend comments without
  clobbering the scripter's hand-edited wording on a re-run (a naive
  overwrite-the-file regeneration would destroy live edits) — needs its own
  ticket once the catalog's key/value shape is prototyped.
- Whether the build-time validator lives as a vitest test, a standalone
  Node script wired into the existing GitHub Action, or both — depends on
  how the extraction ticket shapes the catalog-loading code.
- What the redesigned category list should actually contain — deliberately
  left to the grilling ticket below rather than guessed at while charting.

## Out of scope

- **A live in-app editor / GitHub-API-backed write path.** Considered this
  session and ruled out: it would need real write credentials and a request
  path beyond a static site, breaking the $0/no-backend standing preference
  the whole toolkit is built on. "Edit a file and push" was chosen instead.
- **Making the branching/selection logic itself editable** (which message
  fires, under what condition). Out of scope for this map — see "Scope:
  wording only" above. Revisit only if a future need for behavior-level
  customization is explicitly raised as its own destination.
