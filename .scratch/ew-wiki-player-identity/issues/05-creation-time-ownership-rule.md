# Nail down the real creation-time ownership rule

Type: grilling
Status: closed
Claimed by: Claude (this session, 2026-09-15)
Blocked by: (none)
Parent: [Player Identity & Object Ownership map](../map.md)

## Question

The rebuilt page claimed: "When the object is first created ... whichever client's action actually created it becomes the owner immediately." The maintainer gave a concrete counter-scenario: the maintainer is the Zone Host, another player builds a woodpole next to them — that other player owns the woodpole until *they* leave, even though the maintainer (the Zone Host) never stops being the Zone Host.

This ticket exists because that gap is exactly the kind of thing code-reading alone keeps getting wrong (see [ticket 3](03-build-object-ownership-page.md)'s Answer) — it needs a real conversation with the maintainer's own play experience as ground truth, cross-checked against `ZDOMan.CreateNewZDO`/`SetOwnerInternal` in the decompile and the [code-proof ledger](../../../ew_wiki/docs/guide-source/3-advanced-guide/EWP_pid_ownership_code_findings.md), not another solo pass.

Resolve, precisely enough to write one short, correct paragraph from:
- Is "whoever's client action created it" actually correct, and the page's *wording* was just unclear/misleading — or is the actual rule something else (e.g. "the creator always owns it first, regardless of who's Zone Host, until the creator leaves the area")?
- How does this interact with the Zone Host re-check (`ReleaseZDOS`) — does the creator's ownership behave any differently from a later Claiming-Player claim once assigned, or is it exactly the same "owns it until they leave" rule either way?
- Does EWP's own `spawn:` action (not a player building something) follow the same rule, or does a spawned-by-script object get a different starting owner (e.g. the Zone Host, since no player "acted")?

## Answer

**There is no separate "creation" rule — it's a carve-out inside the Zone Host rule.** The original page's mistake was treating "whoever's client created it becomes the owner" as its own first-class step under "The Zone Host." The maintainer's woodpole example, plus a closer read of `ZDOMan.CreateNewZDO`/`ReleaseNearbyZDOS`, showed the real shape is two rules, not three:

1. **The Zone Host** (the ongoing fallback, universal): the game constantly checks whether an object has an owner; if not, the current Zone Host gets it. Re-checked every couple of seconds, for every object.
2. **The Claiming Player** (a bonus rule some objects have): interacting a certain way hands ownership straight to whoever just did it — repeatably, any number of times (Container, Sign, etc.).

Building a piece is **the one exception folded into rule 1**: the builder gets immediate ownership (really rule 2, triggered by building instead of an interaction) even if someone else is already Zone Host — and that ownership holds until the builder leaves, at which point rule 1 takes back over. This is why "I build beside you, you stay Zone Host, I keep ownership until I leave" isn't an exception to the mechanism — it *is* the mechanism.

**Rejected during grilling, and why:**
- An earlier three-rule draft ("The Creator" as its own named rule) was scrapped — it made a one-off carve-out look like a whole third category, when it's really one sentence inside the Zone Host explanation.
- A claim that EWP's `spawn:` action follows "whichever client ran the trigger" was dropped — the research report only proved the *universal* engine rule (whoever's machine calls `CreateNewZDO` owns it), never which specific machine actually runs an EWP script's `spawn:` trigger. That's unverified and out of scope for this ticket; don't restate it as settled.
- A closing section pairing this rule with the permanent `<long_creator>`/`<long_owner>` fields was drafted, then explicitly cut from this ticket's locked answer — that pairing is a real idea but a separate decision, left for [ticket 06](06-explanatory-sections-rewrite.md) or a later ticket to place, not decided here.

**Locked reader-facing text** (for [ticket 06](06-explanatory-sections-rewrite.md) to place and integrate, tone/wording final, not to be reworded further without a new round):

> ## The Zone Host — the ongoing fallback
>
> The game constantly checks: does this object have an owner? If not, it finds the current Zone Host and makes them the owner. This keeps happening for as long as the object exists, for every object in the active zones.
>
> There's one exception: player-built pieces. If you build a piece, the game gives you — the builder — immediate ownership (this is really the Claiming Player rule below, just triggered by building instead of an interaction), even if someone else is already the Zone Host. That ownership stays yours until you leave the zone — only then does it fall back to the rule above.
>
> ## The Claiming Player — a bonus rule some objects have
>
> Some objects go further and can "intercept" the Zone Host rule: interacting with them a certain way forces the game to hand ownership straight to whoever just did it — and this can happen over and over, every time someone does it. Opening a chest, writing on a sign — each one claims the object for the player doing it, right then.

**Check reach**: this is a page-content decision (how to explain a mechanism to readers), not a process/terminology decision another map or future session would need — stays on this map, no `CONTEXT.md`/`AGENTS.md` update warranted.
