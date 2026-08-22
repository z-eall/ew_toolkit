# Retroactive reformat and release 3

Type: grilling
Status: resolved
Blocked by: (none)
Parent: [Changelog Automation map](../map.md)

## Question

Ticket [03 — release-notes format](03-release-notes-format.md) settled on the
5-category vocabulary (Structure problem, Value problem, Reference problem,
Invalid file, Legacy but working) as of 2026-08-19, and explicitly declined to
retroactively edit the two already-published releases (`v2026-08-18`,
`v2026-08-18-2`), which still use the stale 10-category headers — on the
grounds that editing a published GitHub Release is a public-content change
outside that ticket's local-docs scope.

The user is now reopening that call, with today's huge multi-map patch
(commit `5a25bfc`, 79 files) as the immediate trigger: should the two
published releases be taken down and reuploaded in the current format, with
this patch shipping as release #3 in the same pass? Or does release #3 just
go out in the current format going forward, leaving the first two as a
known-stale historical record?

## Resolution

**Leave `v2026-08-18` and `v2026-08-18-2` unchanged.** Old 10-name headers stay as a dated snapshot. Do not edit in place or delete/recreate.

**Going-forward heading list** (supersedes ticket 03’s five diagnosis names and implicit “Site last” order):

1. **Site** — Hub/Tool UX that is not a diagnosis (nav, theme, leave-site warning, Changelog link, layout). Always first so scripters see UX before validation changes.
2. **Structure problem**
3. **Value problem**
4. **Reference problem**
5. **YAML problem** — sixth FILTER name from Validator Round 3; include when the batch has YAML-parse/empty-file/list-root changes.
6. **Invalid file**
7. **Legacy but working**

Omit a heading when the batch has no bullets for it. This ticket does **not** cut release 3 or push `main`.
