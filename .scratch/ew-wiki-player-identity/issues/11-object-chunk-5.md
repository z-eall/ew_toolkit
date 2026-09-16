# Object appendix, chunk 5: Tameable / Character-Ragdoll / OfferingBowl

Type: prototype
Status: closed
Claimed by: Claude (this session, 2026-09-16)
Blocked by: [Nail down the real creation-time ownership rule](05-creation-time-ownership-rule.md), [Rewrite explanatory sections](06-explanatory-sections-rewrite.md)
Parent: [Player Identity & Object Ownership map](../map.md)

## Question

Review and get signoff on 3 of this chunk's original 4 object entries in the page's closing appendix: **Tameable, commanded/following (not ridden)**, **Character (creatures) and their death Ragdoll**, **OfferingBowl (boss spawn)**. Each entry's prose claim and its paste-ready EWP script must be checked against the [code-proof ledger](../../../ew_wiki/docs/guide-source/3-advanced-guide/EWP_pid_ownership_code_findings.md) and re-validated with `ewp_validator`'s CLI before showing the maintainer.

**Scope note (2026-09-16):** the 4th entry, "Hit FX vs. damage-over-time FX," has been pulled out of this ticket and merged into [ticket 13](13-fx-object-rule.md), which already owned the general "Effects" rewrite. Don't re-add it here — see ticket 13 for that work. This ticket is also currently on hold: the OfferingBowl entry has a known-wrong prefab (`BossStone_Fader`, should be `Eikthyrnir`) not yet fixed, deliberately deferred while ticket 13 is worked first.

Show only these 3 entries rendered in the dev server (not the whole page) for a focused review.

## Answer

Signed off 2026-09-16. The maintainer redirected this chunk's scope mid-review, away from its original 3 separate entries:

- **Tameable, commanded/following** — dropped as its own entry. Folded into the existing **Sadle** entry instead, as a one-line Tip: calling `Tameable` instead of `Sadle` works the same way (riding claims ownership; commanding/following never does — confirmed via `Sadle.cs:348-351`, `Tameable.cs`'s `TamingUpdate`/`Tame()`).
- **Character (creatures) and their death Ragdoll** — removed from the page entirely, maintainer's own call.
- **OfferingBowl (boss spawn)** — removed as its own entry (its known-wrong `BossStone_Fader` prefab is moot now), but its real mechanism survived as a new scenario folded into **Personal FX**: "Sacrificing at a boss altar," splitting all 6 altar-using bosses by their real summon mechanic — **One-Step Sacrifice** (`Eikthyr`, `The Elder`, `Bonemass` — hotbar-use, effect belongs to whoever did it) vs. **Two-Step Offering** (`Moder`, `Yagluth`, `Fader` — item-stand then confirm, effect belongs to the Zone Host). Confirmed via `OfferingBowl.cs`'s two branches (`UseItem` targets the interactor's own RPC; `Interact` stays owner-gated) plus the maintainer's own real-game testing, since the CSV-based prefab sweep couldn't see `OfferingBowl` when it's nested as a child component (which is how the 6 real bosses use it — only one side-boss, Frozen King, showed up as its own top-level prefab). Seeker Queen excluded — no altar/offering at all.

All 25 YAML script boxes on the page validated clean. Verified live on the restarted WSL dev server, matching the authored content. This chunk's real object count dropped from 3 planned entries to 0 standalone ones — 1 merged into Sadle, 1 removed outright, 1 absorbed into Personal FX — but every piece was a maintainer-directed call, not something ruled beyond the page's own destination, so it's recorded here rather than under Out of scope.
