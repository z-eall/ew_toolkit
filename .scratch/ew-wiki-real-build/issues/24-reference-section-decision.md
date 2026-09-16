# Reference section: build a schema-generated one, or link to Jere's own docs?

Type: grilling
Status: resolved

## Question

The map's fog had "an exhaustive, schema-generated 'every key' Reference section" parked pending tooling that doesn't exist. Given Jere's own `docs/functions.md`/`docs/scripting.md` are already a complete, free, always-in-sync function/field list — does the wiki gain enough by building its own generated version to justify the tooling investment, or should it just link out?

## Answer

**Skip building it. Link to Jere's own `docs/functions.md`/`docs/scripting.md` directly** (maintainer, 2026-09-14). Reasoning: Jere's docs are already complete and free; a schema-generated version would mainly add wiki cross-links and EWP-specific gotcha notes, which is real value but polish on something that already exists — and a generated copy would need its own sync mechanism to avoid drifting from EWP's real docs, which is exactly the tooling cost this fog item was waiting on. Cheaper to just point at the source.

**Action for future content tickets**: wherever a page currently teaches a function family without an exhaustive list (e.g. Advanced Functions), make sure it links out to `docs/functions.md`/`docs/scripting.md` for "see every function," rather than trying to be that list itself. Not itself a ticket — fold into whichever content ticket next touches that page.
