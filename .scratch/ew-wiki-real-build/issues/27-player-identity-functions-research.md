# Player-identity functions (`pid`/`cid`, object-ownership angle) — deep source research

Type: research
Status: resolved

## Question

EWP's `pid`/`cid`/`platform`/`pname`/`pchar`/`pvisible` functions ("who is this player," via `PeerManager`) were source-audited for the *validator's* schema (`.scratch/validator-round4/research/05-string-template-function-source-audit.md`) but that research targeted validator-recognition, not teaching. Surfaced as a wiki gap by a `/wayfinder` review, 2026-09-14.

Maintainer's framing (2026-09-14): **focus mainly on `pid` and `cid`** — these are commonly used in advanced scripting for **object-ownership** patterns (e.g. "does this player own this object," multiplayer scripts that need to tell players apart or gate actions to whoever placed/claimed something). This needs deep research against the real game code and how EWP itself reacts, not just the existing validator audit's dispatch-table-level facts.

Research questions to answer, source-verified against the real C# (`PeerManager.cs`, `ObjectFunctions.cs`, and any `ZDOMan`/ownership-related code `pid`/`cid` actually reads from — `PeerManager.cs` itself was flagged as **not fetched** in the existing validator research, so this is new ground, not a re-cite):
1. What exactly do `pid` and `cid` return (player id vs. character id — are these Steam/platform ids, Valheim's own internal peer ids, ZDO owner ids, something else), and how stable are they (same value across sessions? across a dedicated server restart?).
2. How does EWP's own object-ownership model actually work (`owner:` action/field, `ZDOMan` ownership, `connected:`) — and where do `pid`/`cid` actually plug into that model for a real "only the player who placed this can use it" pattern?
3. What's a realistic, correct worked example a beginner-to-intermediate reader could copy — not just "here's what the function returns" but "here's the pattern that solves the ownership problem people actually have."
4. Do `platform`/`pchar`/`pvisible` matter enough to include alongside `pid`/`cid`, or are they genuinely secondary (per the maintainer's "mainly pid/cid" framing) — note but don't necessarily build full teaching content for them if the research doesn't turn up a compelling use case.

## Notes

This blocks [ticket 28](28-player-identity-page-shape.md) (deciding the page's actual shape/content) — don't write reader-facing content in this ticket, just ground the facts. If this research turns up enough real chartable complexity (multiple sub-questions, real design tradeoffs in how ownership patterns should be taught), flag that in the Answer rather than trying to cram it all into ticket 28 — this map follows the project's existing "start compact, split into its own map only once it outgrows itself" pattern (same one used for Core Vocabulary and flagged for WEC).

## Answer

Fetched fresh from `raw.githubusercontent.com`/`api.github.com`, `JereKuusela/valheim-expand_world_prefabs`, branch `main`, 2026-09-14, read in full (not WebFetch-summarized):

- `ExpandWorldPrefabs/PeerManager.cs` (209 lines) — **not previously fetched in this repo's research**, found via the full tree listing (`api.github.com/.../git/trees/main?recursive=1`). This is the actual identity source `pid`/`cid`/`platform`/`pname`/`pchar`/`pvisible` all read from.
- `ExpandWorldPrefabs/service/data/ObjectFunctions.cs` (256 lines — 14 lines longer than the 242-line version cited by `validator-round4/research/05-string-template-function-source-audit.md`'s 2026-08-22 fetch; the diff is an added `altbiome` case, unrelated to this ticket).
- `docs/functions.md` (224 lines) and `docs/scripting.md` (526 lines).

### 1. What `pid`/`cid` actually return, and stability

Both are computed by `ObjectFunctions.GetGeneralParameter` (`ObjectFunctions.cs:44-45`) by first resolving **which peer currently network-owns the ZDO**: `PeerManager.GetPeer(zdo)` → `GetPeer(zdo.GetOwner())` (`PeerManager.cs:49-58`) looks up (and caches) the `ZNetPeer` for `zdo`'s **current** owner id. This is the critical fact: pid/cid are not "who placed/created this object," they are "who is the peer currently simulating it" — a transient, engine-reassignable relationship (see §2).

- **`pid`** (`PeerManager.GetPid`, `PeerManager.cs:105-113`): if a ready peer owns the ZDO, returns `GetPeerPid(peer)` → `PeerIds[peer].m_userID.ToString()` (`PeerManager.cs:182-188`), where `PeerIds[peer]` is built once via `GetUserId` (`PeerManager.cs:196-202`) — Steamworks backend: `new PlatformUserID(m_steamPlatform, peer.m_socket.GetHostName())` (the real SteamID64-derived value); otherwise a hostname-derived id. This is the **platform account id** — stable across sessions, across characters, across a dedicated-server restart, matching `docs/functions.md:41`'s "Steam/Playfab id of the client that controls the object."
  - Fallback when there is **no** owning peer but a local player exists (e.g. singleplayer host context): returns the **literal string `"Server"`**, not a real id (`PeerManager.cs:110-111`). Worth flagging for teaching: a beginner comparing `<pid>` against a saved value can get this literal text unexpectedly, not an id.
  - Fallback when there is neither a peer nor a local player: `""`.
- **`cid`** (`PeerManager.GetCid`, `PeerManager.cs:114-130`): if a peer owns the ZDO, looks up the owning peer's **character's own ZDO** (`ZDOMan.instance.GetZDO(peer.m_characterID)`) and reads `ZDOVars.s_playerID` off it via `ZdoHelper.TryGetLong` — Valheim's own internal per-**character** id, assigned at character creation and stored on that character's ZDO/save. This is **not** the platform account — a different character on the same Steam account gets a different `cid`, while `pid` stays the same.
  - Fallback with no peer but a local player: `Player.m_localPlayer.GetPlayerID()` — a real numeric id here, unlike `pid`'s `"Server"` string fallback. The two functions are asymmetric in their local-player fallback behavior.
  - Fallback otherwise: `null` → formatted as `""` (`ObjectFunctions.cs:45`, the `?? ""`).

**Practical consequence for the ownership angle**: querying `<pid>`/`<cid>` on an object *right now* tells you who currently has network authority over it, which the game reassigns automatically (proximity/load-based ZDO ownership migration is part of Valheim's own `ZDOMan`, not EWP — not present in this repo's source, so its exact reassignment triggers can't be cited further than "not fixed once and forever"). It does **not** tell you who originally placed the object. Confirmed indirectly: `GetPeer(zdo)` always resolves off `zdo.GetOwner()` (the ZDO's *current* owner field), never off any "creator" field — EWP's source has no such field at all (see §2).

### 2. EWP's actual object-ownership model vs. `pid`/`cid`

EWP has exactly one ownership concept in source, and it is a **different thing** than player identity: the ZDO's network-simulation owner (`zdo.GetOwner()`, a `long` peer uid — this accessor itself is a base-game `ZDO` method, not EWP source, so its own internals aren't fetchable from this repo).

- `<owner>` function (`ObjectFunctions.cs:50`) returns `zdo.GetOwner().ToString()` verbatim — the raw peer uid, confirmed by `docs/functions.md:48`, "Id of the owner client (long number)."
- The `owner:` action field (`docs/scripting.md:294-296`) **sets** this same value — "Changes the object owner (number)... Only works when using `injectData: true`... Number 0 removes the owner, but the server will reassign it after a few seconds." — i.e. this is explicitly a transient simulation-authority slot the engine reclaims on its own, not a persistent "belongs to" record.
- The `spawn`/`swap` `owner:` param (`docs/scripting.md:337`) only overrides the *initial* owner assignment at spawn time, same mechanism.
- `admin:` condition (`docs/scripting.md:90-93`) checks whether the *current owner* is a server admin — again riding on the same transient owner, not a stored identity.

**There is no `owner:`-adjacent field or action anywhere in `scripting.md` or the two `.cs` files that stores "which player placed this" persistently.** `owner`/`pid`/`cid` are related only in that `<owner>` is the *key* `PeerManager.GetPeer` looks up by, and `<pid>`/`<cid>` are *derived from* whoever that key currently resolves to — changing `owner:` on an object is exactly equivalent to changing what `<pid>`/`<cid>` will report for it going forward. None of this persists "who placed it" past the next ownership reassignment.

### 3. The actual worked pattern for "only the placing player can use this"

Since there's no built-in placement-identity field, the real pattern is: **write the identity into the object's own persistent custom data at creation time**, then compare against it later. Both pieces are already-documented, generic EWP mechanisms, not anything ownership-specific:

1. On the object's spawn/creation rule, set a custom string field to the placing player's id, using the documented `data:` action shorthand (`type, key, value`, `docs/scripting.md:281`):
   ```yaml
   data: string, placedBy, <pid>
   ```
   (`<cid>` is the better choice if the design intent is "this specific character," not "this Steam account across any of its characters" — see the pid-vs-cid distinction in §1.)
2. On the action that should be gated (an interact/poke rule, etc.), add a condition comparing the stored value against the *current* controller:
   ```yaml
   condition: <string_placedBy> = <pid>
   ```
   using the documented `=`/`!=` condition operators (`docs/scripting.md:84-85`) and the `<string_X>` ZDO-custom-data read function (already covered by the round4 audit, `ObjectFunctions.cs:82`, `GetString`).

This is a correct, minimal, already-fully-sourced pattern — no unverified claims — and it directly contradicts the naive approach of gating on `<owner>` (§2), which is exactly the trap a beginner reaching for "ownership" functions would fall into.

### 4. `platform`/`pchar`/`pvisible` — secondary, confirmed

- **`platform`** (`PeerManager.GetPlatform`, `PeerManager.cs:131-139`, mirrors `pid`'s branches exactly including the `"Server"` fallback quirk): the platform enum backing `pid` (Steamworks vs. others). `docs/functions.md:43-44`: "Can be combined with `<pid>` to get full id" — i.e. its only real use is disambiguating `pid` values across platforms, not a standalone ownership signal. Worth one line, not a worked example.
- **`pchar`** (`PeerManager.GetPChar`, `PeerManager.cs:149-157`): **undocumented** — absent from `docs/functions.md` entirely (grepped the full 224-line doc for `pchar`, zero hits) despite being a real, dispatchable function (`ObjectFunctions.cs:48`). Also internally inconsistent: when a peer owns the ZDO it returns `peer.m_characterID.ToString()` (a `ZDOID`-shaped string), but the local-player fallback returns `Player.m_localPlayer.GetPlayerID().ToString()` (a plain numeric id) — two different value *shapes* under the same function name depending on which branch executes. Not a compelling teaching candidate: undocumented, inconsistent, and not needed for the ownership pattern (§3 uses `pid`/`cid`, not `pchar`).
- **`pvisible`** (`PeerManager.GetPVisible`, `PeerManager.cs:158-166`): whether the player has public map-position visibility enabled (`docs/functions.md:47`) — a privacy/social setting, unrelated to ownership or identity comparisons. No use case found for the ownership angle.

**Verdict on Q4**: confirmed secondary per the maintainer's framing. `platform` earns a one-line mention (paired with `pid`). `pchar` and `pvisible` don't have a compelling use case in this research and shouldn't get forced teaching content — `pchar`'s undocumented/inconsistent nature is worth flagging to the maintainer as a possible upstream doc gap, but that's an aside, not wiki content.

## Reopened — maintainer found a wrong core claim and missed local sources

The Answer's central claim — "There's no field anywhere in EWP that persistently records who placed this" — is **wrong**. This research checked only EWP's own C# (`PeerManager.cs`, `ObjectFunctions.cs`); it never checked the base game's own decompiled source, already available locally at `valheim-modding/decompiled/`, and never consulted the maintainer's own local resources:

- `docs/guide-source/3-advanced-guide/EWP_pid_behavior.md` — a hand-tested, per-component map (Beehive, ItemDrop, FX, Container, Sign, Tameable, Boss Altar, Creature, Smelter, Battering Ram/Catapult, Rock Frac) of when the *transient* network-owner reflected by `<pid>`/`<cid>` actually changes hands, verified by the maintainer in real multiplayer testing.
- `docs/guide-source/4-script-examples/99-bfv-examples/` — ~40 real production scripts, 22 of which use `pid`/`cid`, revealing techniques never covered: `Piece.creator` (a real, persistent, base-game field — `Piece.cs:233/429/440`, `ZDOVars.cs:69`, stored under the raw ZDO key `"creator"`, set once at build and never overwritten by later ownership reassignment — confirmed directly contradicting the original Answer); other components with their own native ownership-like field (e.g. beds: `filter: long, owner, <cid>`); `<pid>`/`<cid>` concatenated directly into an EWP key name (`<save_<pid>/team_1>`, `keys: <pid>/teamlead 1`) to turn one shared global key into an effective per-player variable, used across ~10 real systems; and fully dynamic key names built from raw chat input (`exec: <save_<par_1>_<par_2>>`).

A spot-check on the engine mechanism confirms a real, generalizable method exists: several base-game components (`Container`, `CookingStation`, `Fireplace`, `Fish`, `Gibber`, `Pickable`, `Sign`, `TerrainModifier`, `TimedDestruction`, `Turret`) call `ZNetView.ClaimOwnership()` explicitly at a specific interaction point (grep the decompile for the call, read the enclosing method to learn the trigger); components that never call it just check `IsOwner()` before acting, so their `<pid>` passively follows whichever peer the engine's own zone/proximity authority currently assigns — this matches the maintainer's own empirical "zone host" findings exactly.

**Re-opened rather than superseded by a new ticket**, since the question is the same, just answered wrong. Re-resolution needed:
1. An exhaustive sweep of all 22 `pid`/`cid`-using files in `99-bfv-examples/` (only ~5 read so far).
2. A full decompile check of every component in `EWP_pid_behavior.md`'s table for `ClaimOwnership()`/a native persistent field, not just the ones sampled above (`Piece`, `Container`, `Bed`, `Pickable`).
3. A brief identity-function overview (`pname`, `platform`, etc.) — short, at the top, before the `pid`/`cid` core (per maintainer request).
4. The actual deliverable the maintainer wants: a mechanically-generated, verified reference list of every real ownership change/assignment behavior — not a hand-picked handful of examples.

Delegated to a `/research` subagent per wayfinder's ticket-type design, rather than continued live sampling — the maintainer confirmed this 2026-09-14 after catching two rounds of overclaimed completeness in conversation.

## Re-resolved (2026-09-14) — full exhaustive pass

Full report: [`research_reports/valheim-ewp-player-identity-ownership-2026-09-14.md`](../../../research_reports/valheim-ewp-player-identity-ownership-2026-09-14.md). Read all 22 `pid`/`cid`-using production scripts in full (21 matched under `customEWP/`, 1 under `data/`; one grep hit was a false positive), the maintainer's full `EWP_pid_behavior.md`, and grepped the whole base-game decompile for `ClaimOwnership()` (14 files, not 10) plus persistent-field patterns.

**Corrected finding**: two real, persistent, non-`<pid>` fields exist in the base game — `Piece.m_creator` (already found) **and a second one, `Bed.s_owner`** (`Bed.cs:184-204`, set via `Bed.Interact()` on first claim, ZDOVars key `"owner"` — a completely different slot from the ZDO's own transient network-owner despite sharing the English word "owner"). No other checked component (`Beehive`, `Tameable`, `Smelter`, `Catapult`, `Vagon`, `MineRock5`, `ItemDrop`, `Character`, `BossStone`) has its own persistent field — for those, ownership is either an explicit `ClaimOwnership()` claim on a specific interaction (traced to its enclosing method for all 14 files) or purely the passive zone/proximity mechanism in `ZDOMan.ReleaseZDOS`/`ReleaseNearbyZDOS` (pinned to `ZDOMan.cs:750-758` and `938-993`).

Every row of the maintainer's `EWP_pid_behavior.md` table now has an explanation traced to source, or is explicitly flagged as not independently confirmable beyond the general mechanism (DoT/Feast FX ownership, the exact riding-claim call site, `pchar`'s dead-end status) — no guessing where the decompile didn't make something legible.

Also found, beyond the original brief: the `<pid>`/`<cid>`-as-EWP-key-namespace technique across 10+ files (team membership, leadership flags, per-player cooldowns); a native-field-plus-custom-field persistence pattern (`BaseCampBed.yaml`, since a respawned bed's native field resets to `0`); a `pid ↔ playerID ↔ pname` cross-reference table built at player join; and direct `longs: - creator, <cid>` writes that stamp the vanilla `Piece.creator` field onto programmatically-spawned pieces that never went through the normal build flow.

**Sizing**: this is genuinely 6 substantial, cross-linked sections (identity overview, the engine method, a verified ~15-row behavior table, the two native persistent fields, the key-namespace technique, several other advanced patterns) — confirms the original "fits in one page" verdict doesn't hold. Recommend charting a new map for this topic rather than force-fitting it into ticket 28 as a single page — see the map's Decisions-so-far and Not yet specified for the charting proposal.

### Sizing verdict: fits in one page — does NOT need its own map

This topic is one coherent concept cluster, not a multi-page domain:
- One core mechanism (`PeerManager` resolving identity off the ZDO's current network owner) explains all six functions' behavior, including their quirky fallbacks.
- One real trap to teach (`owner:`/`<owner>` looks like "ownership" but is transient simulation authority, not placement identity) — a single compare-and-contrast, not a tree of tradeoffs.
- One worked pattern (§3's two-step data-then-compare recipe) that fully answers the maintainer's "only the player who placed this can use it" framing, using only already-documented `data:`/`condition:` mechanisms — no new mechanism to design or debate.
- The secondary functions (§4) resolve to one line each, not sub-sections.

This is comparable in scope to the project's existing single-topic pages (e.g. the RNG/lottery or trigger-change pages), not to Core Vocabulary or WEC — those needed splitting because they cover dozens of independently-navigable concepts; this ticket's four sub-questions all collapse into one linear explanation (what pid/cid are → why `owner:` isn't the answer → the actual pattern → secondary functions as a footnote). **Recommend ticket 28 proceed as a single page**, structured in that same order. No new wayfinder map warranted.

**Superseded by the Reopened section above (2026-09-14)** — this verdict was based on the wrong core claim and never consulted the maintainer's own local resources; don't rely on it. Sizing is being re-decided once the reopened research lands.
