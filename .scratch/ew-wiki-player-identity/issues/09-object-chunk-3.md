# Object appendix, chunk 3: Ship / Portal / Turret / CookingStation

Type: prototype
Status: closed
Claimed by: Claude (this session, 2026-09-15)
Blocked by: [Nail down the real creation-time ownership rule](05-creation-time-ownership-rule.md), [Rewrite explanatory sections](06-explanatory-sections-rewrite.md)
Parent: [Player Identity & Object Ownership map](../map.md)

## Question

Review and get signoff on 4 of the 24 object entries in the page's closing appendix: **Ship**, **Portal**, **Turret**, **CookingStation**. Each entry's prose claim and its paste-ready EWP script must be checked against the [code-proof ledger](../../../ew_wiki/docs/guide-source/3-advanced-guide/EWP_pid_ownership_code_findings.md) and re-validated with `ewp_validator`'s CLI before showing the maintainer. Apply whatever reader-friendly tone standard ticket 06 settles — no ledger/research-report vocabulary in these entries either.

Show only these 4 entries rendered in the dev server (not the whole page) for a focused review.

## Answer

**Signed off — 3 of the original 4 objects made it into the page, not 4.** Ship, Turret, and CookingStation all checked against the [code-proof ledger](../../../ew_wiki/docs/guide-source/3-advanced-guide/EWP_pid_ownership_code_findings.md), re-validated (24/24 fences clean), shown live in the dev server across many rounds. **Portal was removed from the appendix entirely** — see Out of scope note below.

**Real findings this ticket, several catching my own wrong drafts before they ever reached the maintainer's final review:**
- **Ship**: my first draft claimed ownership passes to a remaining passenger "when nobody aboard is actively steering" — wrong, checked `Ship.cs:683-692` (`UpdateOwner`) again and it only checks whether the *current owner* is still aboard, never who's steering. The maintainer's own framing — first player aboard becomes owner, keeps it while aboard, hands off to a remaining passenger on leaving — is accurate as observed behavior (the "first aboard" part is really the page's own general Zone Host proximity rule doing the work, not a Ship-specific check; logged in the ledger). Final script uses a `limit: 1` poke plus a `vfx_spawn_small` spawn marker (both confirmed real EWP syntax via `docs/scripting.md`) so the reader can visually confirm which ship answered.
- **Portal**: I proposed `type: change, tag`/`tagauthor` as an ownership-change trigger — wrong, checked `TeleportWorld.cs:191-224` line by line: tagging a portal changes *that* portal's text fields only; any ownership change lands on its *linked partner*, and only if that partner is currently unowned. Two different objects, no reliable field to watch on the one you actually interact with. The maintainer decided this is too indirect for a clean "try it yourself" appendix entry and asked to drop it — see Out of scope.
- **Turret**: my draft said "editing a turret's allowed-ammo/target list" — wrong, there's no editing UI; `Turret.cs:484-524` shows the only trigger is feeding a trophy item into the turret. Fixed the wording to describe the real action, and also cut a stray "even if nobody owned it yet" clause the maintainer flagged as unwanted after the first fix passed review.
- **CookingStation**: the maintainer asked me to verify `slot0/1/2` vs `slotstatus0/1/2` — checked `CookingStation.cs:820-829`: `slot0` is real but reused for two different types (an item-name string and a cook-time float on the same key), while `slotstatus0/1/2` is a clean, unambiguous int — kept the original `slotstatus0/1/2`.
- I also wrongly proposed `type: change, owner` for Ship early in this ticket — checked EWP's own `HandleChanged.cs` (the literal patch code behind `type: change`) and confirmed it never hooks the ownership-setting method at all, only six other typed field-set methods. `owner:` in `docs/scripting.md` is a same-named but unrelated *action* field for setting ownership, not something triggerable. This was caught and corrected before it ever reached the live page.

**New house-style items locked this ticket:**
- **Standardized the report command across the entire page** (not just this ticket's sections) to one exact line: `command: s This <prefab> is currently owned by <pname> (<pid>).` — applied globally, including sections tickets 10-13 haven't reviewed yet. Their prose/field-name review is still pending those tickets; only this one command string was made uniform everywhere.
- When a mechanical claim is genuinely wrong (not just wrongly worded), check EWP's own source/patch code directly — not just its docs' silence, and not just the base game — before either asserting or rejecting it. This ticket had 3 separate cases of exactly that (Ship's `owner`, Ship's `user`, Portal's `tag`/`tagauthor`) resolved by reading EWP's actual `HandleChanged.cs` and the base game decompile side by side.

**Out of scope**: **Portal/TeleportWorld's appendix entry** — closed as out of scope rather than resolved on the route. The real mechanism (naming a portal can hand ownership to its *linked partner*, conditionally) is true and stays logged in the ledger's "Portal/TeleportWorld scoping decision" addendum, but the maintainer judged it too indirect to make a clean, teachable "try it yourself" entry like every other object on this page — kept as an internal fact, not wiki content.
