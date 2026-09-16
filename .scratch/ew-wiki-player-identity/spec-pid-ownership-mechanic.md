# Spec: pid/Ownership Code-Sweep Mechanic

Status: draft, written for review — nothing here has been built yet (no ledger file, no hook, no rule). This file exists so the plan survives between sessions instead of living only in chat, after several rounds of drift/mistakes this session that a saved spec would have prevented.

## 1. Why this exists

Across one long session building `object-ownership.mdx`, the same failure repeated: a claim about game behavior got written down after checking *some* code, then turned out wrong or half-right once checked properly, then got "fixed" with another guess that was *also* wrong. Concretely, in order:

1. A terrain-ownership example was invented outright (fake prefab, fake fields) instead of reading real source.
2. A "verified" table cited raw C# file:line numbers as proof — unreachable by any actual reader of the wiki.
3. Several "try it yourself" scripts were wrong on inspection: a `Fish`/`hooked` trigger that would double-fire, a `type: time, tick 5` example that's actually a chat-spam/crash risk, a `CookingStation` row marked "no field" despite the real fields already having been found earlier in the *same* session.
4. The Tameable/ridden row cited a field (`attachJoint`) that belongs to a completely different object (the battering ram).
5. **The chest-open case** (full case study in §4): the chest's `InUse` field was first used uncritically, then — when corrected — thrown out entirely as "not the real trigger, `items` is," which was **also wrong**. The truth (found only after being pushed a third time) is that `InUse` *is* a proven, gated trigger for the open action, and `items` is a *separate, later* moment. Two real answers were treated as one right/one wrong answer, twice, in opposite directions.

The common cause: judging "is this field the trigger" by whether it *seems* related, not by whether the code *proves* it's related. This spec exists to replace that judgment call with a mechanical test, and to save every finding so it never gets re-derived — or re-guessed — from scratch again.

## 2. Goal

A standing system with three parts:

1. **A ledger file** — one row per real ownership-changing code path found in the game's decompiled source, each classified by the test in §3, never by feel.
2. **A hook** — fires on any edit anywhere in this repo that touches pid/ownership content, forcing a check against the ledger before the edit lands.
3. **A rule** — in `ew_wiki/AGENTS.md`, describing the sweep procedure itself (§3, §5) as the required method for any future ownership investigation, pointing at the ledger as step one.

None of the three exist yet. This spec is the design for all three, for review before any of them are written.

## 3. The core discovery: there is exactly one real mechanism

Checked directly in `ZDO.cs` (the class that owns the concept, not a sampled call site): the `Owner` field backing "who owns this ZDO" is **private**. Only two methods can ever touch it:

```csharp
public void SetOwner(long uid) { ... SetOwnerInternal(uid); IncreaseOwnerRevision(); }
public void SetOwnerInternal(long uid) { ... }
```

`ZNetView.ClaimOwnership()` — used everywhere across the codebase as if it were its own thing — is not a separate mechanism. It is, verbatim:

```csharp
public void ClaimOwnership() {
    if (!IsOwner()) m_zdo.SetOwner(ZDOMan.GetSessionID());
}
```

A named shortcut for "call `SetOwner` with my own id." **Every single ownership change in the entire game, for every component, is a call to `SetOwner`** — self-targeted (via `ClaimOwnership()`), targeted at someone else's id directly, or called from one of two universal, non-per-component places:

- **Creation**: `ZDOMan.CreateNewZDO` — called from `ZNetView.Awake()` for *every* object that ever gets a ZNetView, no exceptions, FX included:
  ```csharp
  private ZDO CreateNewZDO(ZDOID uid, Vector3 position, int prefabHashIn = 0) {
      ZDO zDO = ZDOPool.Create(uid, position);
      zDO.SetOwnerInternal(m_sessionID);   // every object, every time, unconditional
      ...
  }
  ```
  `m_sessionID` means "whichever machine is running this code right now." This is *the* answer to "how can an object end up owned by someone with no visible `SetOwner` call in its own component file" — the call already happened, automatically, at creation, before that component's own code ever runs. Previously referenced in this session as an unproven "Rule 2, creation-owner" claim — this is the actual line that makes it true, not an assumption.
- **Periodic reassignment**: `ZDOMan.ReleaseZDOS`, the passive "whoever's nearest and active" sweep — already fully understood as its own separate universal mechanism, re-running every few seconds for anything nobody's explicitly claimed.

So there are really three *shapes* of `SetOwner` call, not a fixed number of exceptions to hunt for: explicit self/targeted claims inside a specific component (Tier A candidates, checked per-component), the one universal creation-time call (explains *any* object's very first owner, before anything else happens), and the one universal periodic sweep (explains drift afterward for anything unclaimed). A component with no `SetOwner` call of its own isn't missing anything — it's relying on one or both of the universal ones, which should be assumed present, not treated as "no ownership assignment happens."

This means the sweep is genuinely exhaustive and checkable: grep the *entire* decompiled tree for every call to `SetOwner(` and `ClaimOwnership()`. Nothing else can change ownership by any other route — the compiler enforces this, not a sampling assumption.

## 4. Trigger Confidence Classification — the test, precisely

**Mandatory pre-check, before any tier is assigned**: search the component's file for `ClaimOwnership()`, `SetOwner(`, **and, separately, `SetOwnerInternal(`** — as three distinct greps, never one substituting for another. `ClaimOwnership()` only ever means "claim to myself"; a targeted claim to someone else's id is always written as a direct `SetOwner(specificUid)` call and will never show up in a `ClaimOwnership` search. This exact miss happened three times in this spec before being caught (ItemStand's `RPC_RequestOwn`, ItemDrop's `RPC_RequestOwn`, and the risk that any earlier "confirmed no claim" entry not re-checked this way may be wrong) — stating "no `SetOwner`-family call" is only true once all three searches have actually been run, not after checking one or two and assuming they cover the rest. (Added after a harsh-critic pass on the first real ledger: §6's own "mechanical baseline" already named `SetOwnerInternal(` as a third way a component could change ownership, but this pre-check only ever required the first two greps — a real gap in the instructions, even though a repo-wide check found zero component-level `SetOwnerInternal(` calls outside `ZDO.cs`/`ZDOMan.cs` as of the `1.0.12_2026-09-11` decompile, so no existing ledger row needed correcting because of it.)

For every `SetOwner`/`ClaimOwnership()` call site found, the question is never "does some field change nearby" — it's:

> **Is there a field write that is structurally impossible without this exact ownership change having already happened?**

Three tiers, and every ledger row must state which one and why:

### Tier A — Proved trigger
The candidate field write is provably tied to the ownership change, one of two ways:

- **Gated**: the write sits behind a check on the same ownership state (`IsOwner()`, `GetOwner() == x`) — code-level impossible for the field to flip without the ownership change already being true.
- **Same-branch**: the field write sits in the same conditional branch as the `SetOwner` call itself, no branch between them — nothing can run one without the other.

Only Tier A gets written into the ledger as *"the trigger is `<field>`"* — stated flatly, no hedge word, because it's proven.

### Tier B — Correlated, not proved
A field changes in the vicinity — same function, same general action — but nothing in the code forces it to align with the ownership change specifically. Recorded, but labeled explicitly unconfirmed, never phrased as "the trigger."

### Tier C — No usable field
No named field write exists anywhere in the causal chain from the `SetOwner` call. Falls back to an on-demand check script (chat command → poke → report current owner), not a `type: change` trigger — there's nothing to catch mid-flight.

### Required step 4 — Effect-chain tracing (added after the Feast case, §5)

The Feast case study (§5) exposed a fourth thing every sweep entry must check, not just the three tiers above: **does this component's interaction chain spawn any Effect (`EffectList.Create`, or a direct `Instantiate` of an FX/SFX prefab), and if so, through what kind of RPC dispatch?**

This matters because an Effect spawn is never itself a `SetOwner` call — it always resolves through the one universal creation-time rule (§3, `SetOwnerInternal(m_sessionID)` inside `ZNetView.Awake → ZDOMan.CreateNewZDO`). Whether that produces **one** owner or **several independently-owned copies of the identical effect** depends entirely on how the spawning RPC was dispatched:

- **Owner-gated, single dispatch** (`if (m_nview.IsOwner()) { ...Create(...); }`, or a plain local call with no RPC at all): one spawn, one owner — the current owner of whatever object is running the code. This is the common case (Trap's `fx_trap_arm`, terrain's tagged FX, etc.) and needs no special handling beyond the existing three tiers.
- **Targeted RPC** (`InvokeRPC(specificUid, ...)` or the no-target overload that routes to `m_zdo.GetOwner()`): still one spawn, one owner — only one client ever runs the spawning code.
- **Broadcast RPC** (`InvokeRPC(ZNetView.Everybody, ...)`): **every connected client runs the spawning method independently**, so the *same* Effect prefab is instantiated once per client, each getting its own owner via the universal rule. This is not "the trigger is ambiguous" (which would be Tier B) — it's proven, deterministic multiplication: N clients in range → N independently-owned copies of one effect, all traceable to the exact same broadcast call.

**What the ledger must record for any component whose chain spawns an Effect** (extends the schema in §6):
- The exact method that calls `.Create(...)`/`Instantiate(...)`.
- The dispatch type of the RPC that reaches that method: owner-gated / targeted / broadcast (`ZNetView.Everybody`) — named explicitly, not summarized as "spawns an effect."
- If broadcast: state plainly that this produces one independently-owned copy per receiving client, and name which participants are structurally guaranteed to be among them (e.g., Feast: the piece's own current owner, because `RPC_TryEat` is owner-gated before the broadcast even fires, and the interacting player, because `RPC_EatConfirmation` — sent alongside the same broadcast — is targeted specifically at them). Do not describe a broadcast-produced multiplicity as if it were two separate ownership *rules* — it's one rule, applied once per recipient.

### Required step 5 — ZDO data-write chain tracing (added after the Beehive case, §5)

**A real process gap, not a one-off**: the Beehive check (§5) only covered the *interaction* chain (`Interact` → RPC handlers) on its first pass. The maintainer had to separately ask about the *periodic* chain (`Update`/`FixedUpdate`/`InvokeRepeating`-driven ZDO writes) before it got checked — and it turned out to matter, since that's where `level`/`product`/`lastTime` live. A sweep that only follows the interaction chain and stops is incomplete by default, not just occasionally; this must run every time, not only when asked a second time.

**Every sweep entry must trace both chains, not one**:
1. **Interaction chain**: `Interact()`/`UseItem()` and everything reachable from them (RPC handlers, their own follow-on calls) — what steps 1-3 of this section already cover.
2. **Periodic chain**: every method the component schedules on itself — `Update()`, `FixedUpdate()`, `CustomFixedUpdate()`, any `InvokeRepeating(...)` target set up in `Awake()`/`Start()` — checked for every ZDO field it writes, and each one classified against the "two directions of a gate" distinction below (§ the general rule added after this) before being dismissed as irrelevant.

A component isn't fully swept, and can't get a ledger row marked complete, until both chains have been traced — "checked the interaction chain, found nothing" is a partial result, not a finished one, unless the periodic chain was also checked and stated as such.

### Case study: the chest-open failure, worked through the test properly

- `Container.cs`, `RPC_RequestOpen` (runs the instant a player tries to open the chest): if granted, calls `m_nview.GetZDO().SetOwner(uid)` directly — an immediate, unconditional hand-off to whoever's opening it.
- The response reaches the requester's own client, which shows the loot UI. `InventoryGui.cs`, `UpdateContainer`:
  ```csharp
  if ((bool)m_currentContainer && m_currentContainer.IsOwner()) {
      m_currentContainer.SetInUse(inUse: true);
      ...
  }
  ```
  `SetInUse(true)` — which the container's own `Update()` writes to the ZDO field `InUse` — is **gated behind `IsOwner()`**. It is code-level impossible for `InUse` to become `true` unless the ownership hand-off already happened.
- **Verdict: Tier A, gated.** `InUse` turning true *is* the open/claim moment, not a proxy for it, not a coincidence, not a "reliable way to see it" (a hedge — also wrong, because it undersells a proven fact as an observation).
- Separately, `Container.cs` also writes `items` (`ZDOVars.s_items`) whenever contents change (`Save()`), but **no code anywhere ties an `items` write to a `SetOwner` call in the same branch or behind the same gate** — contents changing and ownership changing are two different real events that happen to often follow each other, not one event. `items` is real and useful, but it answers "did contents change," not "did ownership just transfer." Recording it as Tier C-adjacent (a separate, valid signal for a *different* question) rather than conflating it with the open-trigger question is what prevents the back-and-forth that happened this session.

**This is the reference example new sweep entries get checked against** — both directions of the original mistake are visible in it: asserting a field is the trigger without checking for a gate, and rejecting a field as "just a proxy" without checking for a gate either.

## 5. Worked examples from this session's follow-up checks

Three more components checked against the same test, per the maintainer's specific request, to test the mechanic against cases beyond the chest.

### Trap → `fx_trap_arm` (maintainer's own test: this FX *does* show `SetOwner()`)

`Trap.cs`, `RPC_RequestStateChange`:
```csharp
if (m_nview.GetZDO().GetInt(ZDOVars.s_state) != value) {
    if (value != 2) {
        m_nview.GetZDO().Set(ZDOVars.s_state, value);
    } else if (senderID != ZNet.GetUID()) {
        m_nview.GetZDO().SetOwner(senderID);   // value == 2 is "Triggered"
    }
    m_nview.InvokeRPC(ZNetView.Everybody, "RPC_OnStateChanged", value, senderID);
}
```
— **Tier A, same-branch**: when the trap's state changes to `Triggered` (2), the trap's ownership transfers to whoever triggered it, in the same `else` branch, no gate needed since it's unconditional within that branch.

Then, in `RPC_OnStateChanged` (case 2): `if (m_nview.IsOwner()) { TriggerTrap(); }` — gated behind `IsOwner()`, matching the Container pattern exactly. `TriggerTrap()` is what actually spawns `fx_trap_arm` (via `m_triggerEffects.Create(...)`), so it only ever runs on whoever the trap was *just* handed to.

**Plain English**: the trap doesn't explicitly claim the FX itself — it claims *itself* (the trap object) to whoever's client sent `senderID` (whatever triggered it — not necessarily a player; not checked here whether a creature can trigger a trap the same way), and because only the new owner's client is allowed to run `TriggerTrap()`, that same client is the one whose `Instantiate` call creates `fx_trap_arm`, which then goes through the same universal creation-time call from §3 and defaults to that same client as owner. One real claim (`SetOwner(senderID)` on the trap), one downstream consequence (the FX's default owner), not two separate claims.

### Pickable_Mushroom (maintainer's own test: no ownership claim to the picking player found)

**Correction to an earlier version of this row**: it previously said "no `SetOwner`/`ClaimOwnership` call anywhere in the file" — checked only by grepping the literal text `SetOwner`, which does not match a call to `ClaimOwnership()` (the call site doesn't contain that substring). A separate check for `ClaimOwnership` specifically found one real hit, `Pickable.cs:107` — see below. The claim "no call anywhere in the file" was false; the corrected, narrower claim — "no call anywhere in the live interact→pick→drop→spawn chain, and no call anywhere that targets the interacting player" — is the one actually proven, method by method:

1. `Pickable.cs`, method `Interact(Humanoid character, bool repeat, bool alt)` — ends with `m_nview.InvokeRPC("RPC_Pick", num)`. Zero `SetOwner`/`SetOwnerInternal`/`ClaimOwnership` calls in this method.
2. `ZNetView.cs`, method `InvokeRPC(string method, params object[] parameters)` (the no-target-id overload, since step 1 passes none) — full body: `ZRoutedRpc.instance.InvokeRoutedRPC(m_zdo.GetOwner(), m_zdo.m_uid, method, parameters)`. Routes to `m_zdo.GetOwner()` — reads the Pickable's current owner, writes nothing.
3. `Pickable.cs`, method `RPC_Pick(long sender, int bonus)` — runs only on whichever client step 2 routed to. First line: `if (!m_nview.IsOwner() || m_picked) return;`. Zero `SetOwner`/`ClaimOwnership` calls in this method's body.
4. `Pickable.cs`, method `Drop(GameObject prefab, int offset, int stack)` — called from inside `RPC_Pick`. Body: `UnityEngine.Object.Instantiate(prefab, position, rotation)` plus stack/velocity setup. Zero ownership-assignment calls.
5. Unity's `Instantiate` fires the new item's own `ZNetView.Awake()` — confirmed `ItemDrop.cs:1285` fetches its own `m_nview = GetComponent<ZNetView>()`, so the dropped item goes through the same lifecycle as any other networked object. Fresh object (`m_initZDO == null`) → `m_zdo = ZDOMan.instance.CreateNewZDO(...)`.
6. `ZDOMan.cs`, private method `CreateNewZDO(ZDOID uid, Vector3 position, int prefabHashIn)` — `zDO.SetOwnerInternal(m_sessionID)`. **The only ownership-assignment call in the whole chain** — universal, unconditional, the same one every object gets (§3). `m_sessionID` here is the client already confirmed in step 3 as the *Pickable's* current owner — never a reference to the interacting player.

**Where `Pickable.cs:107`'s `ClaimOwnership()` actually is — a different chain, never reached during a live pick**:
```csharp
if (m_respawnTimeMinutes <= 0f && m_hideWhenPicked == null && m_nview.GetZDO().GetBool(ZDOVars.s_picked)) {
    m_nview.ClaimOwnership();
    m_nview.Destroy();
}
```
Runs at component load, not pick time — a non-respawning Pickable that's already marked picked-empty claims itself so its own client can safely destroy the stale object. Confirmed to sit outside `Interact`/`RPC_Pick`/`Drop` entirely.

**Precise, corrected verdict**: a `SetOwner`-family call always happens (step 6, universal and unconditional) — it is not "impossible for SetOwner to run." What's proven impossible, across every one of the six steps, is for **any of them to assign ownership by reference to the interacting player's identity**. The dropped item's owner is decided solely by who already owned the Pickable beforehand, never by who picked it. Who that beforehand-owner usually is: not independently re-verified here for `Pickable` specifically — inferred from §3's periodic-reassignment mechanism (`ZDOMan.ReleaseZDOS`), since confirmed above that nothing in `Pickable.cs` ever calls `SetOwner`/`ClaimOwnership` to claim the Pickable itself to a player, meaning it has no explicit-claim path and is left entirely to that universal sweep — which would make it the Zone Host whenever nobody's actively standing on it. Stated as an inference from a separately-proven mechanism, not as its own checked fact.

### Why player-caused FX and creature-caused FX differ (no separate FX rule exists)

Checked: `EffectList.cs` (what `.Create(...)` actually does for every FX spawn in the game, including `vfx_player_hit`/`vfx_Burning`-style effects) has **no `SetOwner`/`ClaimOwnership` call anywhere in it.** That doesn't mean no ownership assignment happens — see §3's creation-time universal call: every FX still gets a ZNetView, so it still goes through `ZNetView.Awake()` → `ZDOMan.CreateNewZDO` → `SetOwnerInternal(m_sessionID)` automatically, the same as everything else. FX spawning isn't special-cased at all — it just relies on the one universal call instead of a component-specific one.

The real difference is upstream, in *who owns the thing doing the spawning*, not in the FX itself. Checked: neither `Player.cs`/`Character.cs`/`Humanoid.cs` contains any `SetOwner`/`SetOwnerInternal`/`ClaimOwnership` call — meaning a player's own character ZDO, like a Pickable, has no explicit-claim path and relies entirely on the same two universal mechanisms as everything else (§3): the creation-time call (owns it the instant it spawns) and the periodic `ReleaseZDOS` sweep (re-checks it every few seconds after).

**What that means, stated precisely rather than assumed**: a player's own character keeps being owned by that player's own client for the same reason any object keeps its owner under `ReleaseZDOS` — the current owner is still active and nearby. A player is, definitionally, always at distance zero from their own character, so under that same proximity rule they should never lose it to another peer. This is **an inference from the periodic-sweep mechanism already proven in §3, not a separately-checked special case** — no code path was found that pins a player's avatar to their own client by name; it falls out of the general rule applying to a case (self, zero distance) where the outcome is never in doubt. Flagged this way rather than asserted as "by construction, always," since no dedicated player-ownership code was actually found.

- A player's own character, under that inference, is who's running the code when their own action spawns a hit FX — so the FX defaults to them via the universal creation call (§3).
- A creature has no such fixed relationship to any one client — nothing claims it to a specific player, so it's governed purely by `ReleaseZDOS` proximity like any other unclaimed object, and whichever peer is currently its Zone Host is who's running the code when its attack spawns FX.

**Verdict: not a separate rule for FX.** "Player-caused FX is claimed, creature-caused FX isn't" is the visible symptom of one mechanism (the universal creation-time call, §3) applied to two different upstream situations — not two different FX-specific rules.

### Why DoT FX (`vfx_Burning`, `vfx_Poison`) belongs to the Zone Host even when a player caused it

This is not the same case as the player-vs-creature split above, and needed its own trace — a one-time hit FX and a recurring DoT tick FX are spawned by two completely different loops.

`SE_Burning.cs`, `UpdateStatusEffect(float dt)` — the method that spawns the recurring tick FX:
```csharp
public override void UpdateStatusEffect(float dt) {
    ...
    m_character.ApplyDamage(hitData, showDamageText: true, triggerEffects: false);
    GameObject[] array = m_tickEffect.Create(m_character.transform.position, m_character.transform.rotation);
    ...
}
```
`m_character` here is the character **carrying** the status effect — the burning victim, never the attacker who applied it.

`SEMan.cs`, `Update(ZDO zdo, float dt)` — calls `statusEffect.UpdateStatusEffect(dt)` for every active status effect on that character, once per tick.

`Character.cs`, `CustomFixedUpdate(float dt)` — where `SEMan.Update` is actually invoked from:
```csharp
bool num = zDO.IsOwner();
...
if (num) {
    ...
    m_seman.Update(zDO, dt);
}
```
Gated behind `IsOwner()` — Tier A. `m_seman.Update`, and therefore every `SE_Burning` tick, only ever runs on whichever client currently owns the **victim's** own ZDO.

**Verdict: the attacker's involvement is a one-shot event, not an ongoing one.** Hitting a target with fire calls `SE_Burning.AddFireDamage(...)` exactly once — that method only stores damage numbers, it never spawns anything. Every subsequent `vfx_Burning` tick comes from the **victim's own `CustomFixedUpdate` loop**, gated by the victim's own ownership, with no reference to who caused the burn anywhere in that path. For a creature victim, nothing claims it to a specific player (already confirmed above), so it defaults to the Zone Host — meaning the tick FX reports the Zone Host on every single tick, for as long as the burn lasts, regardless of whether the attacker is still nearby or even still connected. Contrast with `vfx_player_hit`: fired inline, once, inside the *attacker's* own action code — same universal creation rule (§3), applied to the opposite loop. Same rule, two different loops; not a special case for damage-over-time.

### Piece / WearNTear (maintainer's own claim: live interaction never changes a piece's owner)

Checked both files that would have to contain any such path:
- `Piece.cs`: zero `SetOwner`/`SetOwnerInternal`/`ClaimOwnership` calls anywhere.
- `WearNTear.cs` (handles damage and repair): zero `SetOwner`/`SetOwnerInternal`/`ClaimOwnership` calls anywhere.

**Verdict: proven, not just observed.** Since §3 already established that ownership can only ever change through one of those exact calls, and neither file contains one, it is code-level impossible for repairing, damaging, or any other WearNTear-driven interaction to reassign a piece's owner. The only path that can ever move a piece's ownership after the initial build (§3's creation-time call) is the periodic `ReleaseZDOS` sweep, once the builder is no longer nearby.

### Sign — precisely where "pressing OK" lives

`TextInput.cs`:
```csharp
public void OnInput()  { setText(...); m_bShouldHideNextFrame = true; }   // the UI's confirm/OK button
public void OnEnter()  { setText(...); Hide(); }                          // Enter key
public void OnCancel() { Hide(); }                                        // never calls setText
```
`setText(string text)` → `m_queuedSign.SetText(text)` → `Sign.cs:179`'s `ClaimOwnership()` (gated by `PrivateArea.CheckAccess`, §"Tier A — gated"). **Confirmed exactly**: `OnInput`/`OnEnter` both reach `SetText` and therefore claim; `OnCancel` never calls `setText` at all, so canceling never claims anything.

### ItemStand (maintainer's claim: no `SetOwner()` on mount or on take-down — checked, and it's only half true)

`ItemStand.cs` has a real, named method `RPC_RequestOwn(long sender)`:
```csharp
private void RPC_RequestOwn(long sender) {
    if (m_nview.IsOwner()) { m_nview.GetZDO().SetOwner(sender); }
}
```
Called from exactly two places:
- `UseItem(Humanoid user, ItemDrop.ItemData item)` — **this is the mount-an-item action**: `if (!m_nview.IsOwner()) { m_nview.InvokeRPC("RPC_RequestOwn"); }`. Claims ownership, but only when the interacting player isn't already the owner.
- `Interact(...)`'s alt-click path, when cycling an already-mounted item's display orientation — same `if (!m_nview.IsOwner())` guard, same claim.

Contrast with `RPC_DropItem(long sender)` (this **is** the take-item-down action): `if (m_nview.IsOwner() && m_canBeRemoved) { DropItem(); }` — no call to `RPC_RequestOwn`, no `SetOwner` anywhere in it. It only proceeds if the caller is *already* the owner; the RPC is routed there via the proven no-target `InvokeRPC` semantics (§ Pickable_Mushroom, step 2) and silently no-ops otherwise.

**Verdict: partially confirmed, partially contradicted.** Taking an item off an ItemStand never claims ownership — matches the maintainer's claim exactly. Mounting an item onto one *can* claim ownership, conditionally (only if not already owned) — contradicts the maintainer's claim that neither direction ever does. Both halves are now precisely proven rather than asserted either way.

### Feast — the "2 identical FX, 2 different owners" case, and whether any interaction touches the piece's own ownership

`Feast.cs` — read in full (183 lines), zero `SetOwner`/`SetOwnerInternal`/`ClaimOwnership` calls anywhere in the file. The eat chain:

1. `Interact(Humanoid human, bool hold, bool alt)` → `m_nview.InvokeRPC("RPC_TryEat")` — routed via the proven no-target `InvokeRPC` semantics (§ Pickable_Mushroom, step 2) to whoever currently owns the Feast piece.
2. `RPC_TryEat(long sender)` — gated `if (!m_nview.IsOwner()) return;`, runs only on that current owner. Decrements the stack, then:
   ```csharp
   m_nview.InvokeRPC(ZNetView.Everybody, "RPC_OnEat");   // broadcast — every connected client runs this independently
   m_nview.InvokeRPC(sender, "RPC_EatConfirmation");      // targeted — only the eating player's client runs this
   ```
3. `RPC_OnEat(long sender)` — body is just `m_eatEffect.Create(base.transform.position, base.transform.rotation)`. `EffectList.Create` has no ownership call (confirmed earlier in this spec), so each FX instance gets its owner from the universal creation-time rule (§3) applied to *whichever client is currently running this particular invocation*. Because the RPC target is `ZNetView.Everybody`, this method body executes **separately, once per connected client** — not once total.
4. `RPC_EatConfirmation(long sender)` — targeted only at the eater, applies the food buff to `Player.m_localPlayer` locally. No ZDO/ownership involvement.

**Verdict: not two ownership rules — one broadcast RPC hitting the same universal per-client rule twice.** With the Feast piece's current owner (typically the Zone Host, since nothing here ever claims the piece itself) and the eating player both receiving the `Everybody` broadcast, each independently spawns its own local copy of `m_eatEffect`, each owned by whoever spawned it. Two participants, two independently-owned FX instances of the same effect — not two different assignment mechanisms. **Not tested here**: whether a 3rd nearby player would produce a 3rd independently-owned copy — the mechanism (broadcast → per-client independent spawn) implies yes, but this is an inference from the traced code, not a separately confirmed N-player case.

**On the second half of the question** — no other interaction path exists. The file contains exactly four callable methods touching this flow (`Interact`, `RPC_TryEat`, `RPC_OnEat`, `RPC_EatConfirmation`) plus `UseItem` (hardcoded `return false` — a Feast can never be mounted with an item, so that path is dead code for this purpose). None contain a `SetOwner`-family call. **Eating a Feast never reassigns the Feast piece's own ownership, under any path** — confirmed exhaustively, not sampled, since the whole file was read.

### ItemDrop — correcting an earlier claim ("never claims itself, always Zone Host") and checking for a hit-FX path

**No hit-FX path exists in this file to check.** `ItemDrop.cs` declares an `m_hitEffect` field (part of `ItemData.SharedData`, the weapon-stat block used when this item is *wielded* and hits something), but never calls `.Create()` on it anywhere in the file — that spawn logic lives in whatever attack/weapon code actually consumes the field, not traced here. That specific question doesn't apply to this component.

**What is real, and missed in an earlier pass of this spec**: the wiki page (`object-ownership.mdx`, pre-rebuild) states "a dropped/thrown item, never picked up up — Zone Host only, confirmed by checking `ItemDrop.cs` ... none of them call `ClaimOwnership()` anywhere" — checked only for `ClaimOwnership()`, the same narrower mistake as the Pickable_Mushroom and ItemStand corrections above. `ItemDrop.cs` has a real, targeted `SetOwner` chain, triggered by picking the item up:

```csharp
// Interact → Pickup(character):
if (CanPickup()) {        // CanPickup() == m_nview.IsOwner()
    // already the owner — picks up directly, no RPC needed
} else {
    m_pickupRequester = character;
    InvokeRepeating("PickupUpdate", 0.05f, 0.05f);
    RequestOwn();
}

// RequestOwn():
// rate-limited: exponential backoff via m_ownerRetryCounter / m_ownerRetryTimeout
m_nview.InvokeRPC("RPC_RequestOwn");   // routed to current owner

// RPC_RequestOwn(long uid):            uid = requester, auto-injected as RPC sender
if (m_nview.IsOwner()) {
    m_nview.GetZDO().SetOwner(uid);    // explicit, targeted claim to the requesting player
}
```
**Tier A, same-branch**: `SetOwner(uid)` sits unconditionally inside the single `if (m_nview.IsOwner())` gate in `RPC_RequestOwn` — nothing else needs checking.

**Corrected verdict**: "never claims itself" was too strong. The accurate claim is two-part — a dropped item nobody has interacted with is genuinely Zone-Host-owned (still true, nothing passively claims it), but the moment a player interacts with it, `RequestOwn()` fires a real, gated, rate-limited claim, and ownership transfers to that specific player. **This same class of error (checking only for `ClaimOwnership()`, missing a targeted `SetOwner(specificUid)` call) has now recurred three times** (ItemStand, this entry, and implicitly risked in every entry not yet re-checked for both forms) — any future sweep entry must explicitly search for *both* `ClaimOwnership()` and `SetOwner(` as two separate greps, never one substituting for the other, and this spec's own earlier passes should be treated as needing the same re-check before being trusted as final.

### Beehive vs. Trap — why one claims to the interacting entity and the other never does

`Beehive.cs` — read in full (233 lines), both required greps run separately (`ClaimOwnership`, `SetOwner(`), zero hits either way.

The harvest chain: `Interact(...)` → `Extract()` → `m_nview.InvokeRPC("RPC_Extract")` (no target, routes via the proven `m_zdo.GetOwner()` semantics to whoever currently owns the Beehive) → `RPC_Extract(long caller)`:
```csharp
private void RPC_Extract(long caller) {
    if (GetHoneyLevel() > 0) {
        m_spawnEffect.Create(...);
        for (...) { UnityEngine.Object.Instantiate(m_honeyItem, ...); }
        ResetLevel();
    }
}
```
No `IsOwner()` check inside the handler at all — the routing itself is the only gate, since the RPC is never delivered to anyone but the current owner in the first place. No ownership call anywhere in the whole interaction.

**Contrast with Trap's `RPC_RequestStateChange`** (§4): claims ownership to `senderID` specifically in the same branch that records the trigger state (`value == 2`, "Triggered").

**Proven difference**: Trap explicitly transfers ownership on trigger; Beehive never does, under any interaction, anywhere in the file. **Why** (reasoned from what each does next, not from a cited design comment — flagged as inference, not documented intent): a triggered trap has ongoing work after the trigger — AoE damage, physics, staggering the target — that benefits from running on whichever client is actually standing there. Harvesting a Beehive is one instant, deterministic state change (spawn N items, zero a counter) with nothing ongoing afterward, so there's nothing to hand off ownership *for*.

**"Is it 100% impossible to assign a Beehive's ownership other than by building it fresh?" — yes, provably, not just observed.** Per §3, only three things can ever change any object's ownership: the universal creation-time call, the universal periodic `ReleaseZDOS` sweep, or an explicit component call. The first two apply to a Beehive same as anything else — building it is the creation call, leaving it lets the passive sweep drift it to the Zone Host over time. The third is now confirmed absent, on a full-file read with both required grep forms run. No interaction with a Beehive, harvesting included, can ever explicitly reassign it to a specific player.

**Its own periodic ZDO fields (`level`, `product`, `lastTime`) prove the same conclusion from the other direction.** `UpdateBees()` (scheduled unconditionally on every nearby client, every 10 seconds, in `Awake()`):
```csharp
private void UpdateBees() {
    bool flag = CheckBiome() && HaveFreeSpace();
    m_beeEffect.SetActive(flag && ...);          // every client — pure visual, no ZDO write
    if (m_nview.IsOwner() && flag) {              // everything below: current owner only
        float timeSinceLastUpdate = GetTimeSinceLastUpdate();   // writes s_lastTime
        float num = m_nview.GetZDO().GetFloat(ZDOVars.s_product) + timeSinceLastUpdate;
        if (num > m_secPerUnit) { IncreseLevel(...); num = 0f; }  // writes s_level
        m_nview.GetZDO().Set(ZDOVars.s_product, num);
    }
}
```
None of `level`/`product`/`lastTime` can ever trigger a `SetOwner()` — they're gated *behind* already being the owner, a precondition for the write, never a cause of a claim. See §3's new "two directions of a gate" distinction below, generalized from this exact case.

### A required distinction added to §3: gates run in two opposite directions

Discovered while checking Beehive's own periodic fields — worth stating as a general rule for every future sweep entry, not just this one case:

- **Gate as proof of a claim** (Container's `InUse`, Sadle's `user`): the gate check runs *after* a `SetOwner` call already fired, so observing the gated field proves ownership *just changed*. This is what Tier A ("gated") means throughout §3.
- **Gate as a precondition for routine work** (Beehive's `level`/`product`/`lastTime`; the identical shape in `Character.CustomFixedUpdate`'s `SEMan.Update` gate from the DoT-FX case, §5): the gate requires *already having* ownership before anything runs. It never causes a change — it just refuses to do the work for anyone who isn't already the owner.

**Any `IsOwner()`/`GetOwner() == x` gate found during a sweep must be classified as one or the other before it's used as evidence for anything.** A field sitting behind a gate is not automatically Tier A proof of a trigger — check whether a `SetOwner` call happens *before* the gate (proof direction) or whether the gate merely *permits* an unrelated periodic write (precondition direction, not evidence of any trigger at all).

## 6. Ledger file — spec

- **Location**: `ew_wiki/docs/guide-source/3-advanced-guide/EWP_pid_ownership_code_findings.md`, sibling to the maintainer's own hand-tested `EWP_pid_behavior.md`. That file is the empirical/observed-in-game side; this new file is the code-proof side — cross-referenced, not merged, so each keeps its own kind of authority (hand-tested vs. source-proven).
- **Schema, one row per `SetOwner`/`ClaimOwnership()` call site**:

  | Column | Content |
  |---|---|
  | Component | Real class name (`Container`, `Trap`, `Sadle`, ...) |
  | Call site | File:function (not raw line numbers as reader-facing proof — see §7; line numbers are fine *inside this internal file*, since it's a code-findings ledger, not reader-facing wiki content) |
  | Plain-English moment | What real player/game action causes this function to run |
  | Tier | A (gated / same-branch), B (correlated only), or C (no field found) |
  | Evidence | For Tier A: which gate or which same-branch co-location, quoted. For Tier B: what was checked and why it didn't qualify for A. For Tier C: confirmation the whole causal chain was checked with nothing found. |
  | EWP-visible field (if any) | The literal ZDO field name a `type: change` trigger could watch |
  | Confirmed prefab example (if any) | Only prefab IDs seen in this repo's own real scripts — never invented |

- **A second, required table for any component whose chain spawns an Effect** (per the Effect-chain tracing step, §3) — one row per Effect-spawning method reached from that component's interaction chain, even when the spawn itself calls no `SetOwner`:

  | Column | Content |
  |---|---|
  | Component | Real class name |
  | Spawning method | The exact method containing `.Create(...)`/`Instantiate(...)` |
  | Effect prefab | Real prefab name if known from this repo's own scripts, otherwise stated as unconfirmed |
  | Dispatch type | Owner-gated / targeted RPC / broadcast (`ZNetView.Everybody`) — named explicitly |
  | Resulting owner(s) | One owner (owner-gated or targeted) or "N independently-owned copies, one per receiving client" (broadcast) — never described as ambiguous when the dispatch type is known |
  | Structurally guaranteed participants (broadcast only) | Named explicitly where provable — e.g. Feast: the piece's current owner (via the owner-gate before the broadcast) and the interacting player (via the parallel targeted RPC) |

- **A third, required table: one row per component, tracking sweep completeness itself** — this is what makes "I checked it" a checkable claim rather than a description. A component's row in this table is the only place that can say a component is *fully* swept:

  | Column | Content |
  |---|---|
  | Component | Real class name |
  | Interaction chain checked? | Y/N — `Interact()`/`UseItem()` and everything reachable from them |
  | Periodic chain checked? | Y/N — every `Update`/`FixedUpdate`/`CustomFixedUpdate`/`InvokeRepeating` target, per Required step 5 |
  | Effect-spawn chain checked? | Y/N — per Required step 4, only applicable if the component spawns any Effect |
  | Both `ClaimOwnership` and `SetOwner(` greps run separately? | Y/N — the mandatory pre-check at the top of §3 |
  | Status | "Fully swept" only when every applicable row above is Y — otherwise "Partial: <what's still unchecked>," never silently omitted |

  A component with any row still N is **not done**, and must say so plainly rather than reading as finished. This table exists specifically because the Beehive check needed to be asked for twice — its purpose is to make that gap visible on the page itself, not something only caught by asking again.

- **Backfill**: none from this session's own ad-hoc findings — maintainer explicitly rejected backfilling "loophole-ridden" work. The ledger starts from a fresh, exhaustive sweep (§8), though the worked examples in §4/§5 above may be reused *if* they're re-verified against the same Tier test during that sweep, not copied in wholesale.

- **Execution at scale (added after the first real sweep, ~33 components)**: a single sweep session naturally runs breadth-first — both greps, the interaction chain, and the Effect-spawn chain get done for *every* component first, so nothing is silently skipped entirely — before there's room left to also do the periodic-chain pass (Required step 5) on all of them. A first pass that finishes with several rows honestly marked "Partial: periodic chain unchecked" in Table 3 is the **expected shape of a large sweep, not a failure of the process** — Table 3 exists precisely so this is visible instead of hidden. The correct response is a **second, narrower follow-up sweep** scoped only to the rows still marked Partial, completing just the missing chain(s) and flipping their Table 3 status — not re-running the whole sweep, and not treating the first pass's honest "Partial" labels as something to apologize for or backfill quickly. Any sweep dispatch (this spec's own or a future one) covering more than roughly a dozen components should assume it will take at least two passes and say so up front, rather than being surprised when Table 3 comes back with Partial rows.

## 7. Hook — spec

- **Trigger** (broadened per maintainer's explicit "cover every possible situation"; keyword list locked 2026-09-15 after comparing against every term actually used in `EWP_pid_ownership_code_findings.md` and this spec — `ownership` was replaced with bare `owner` since the ledger's own vocabulary (`IsOwner()`, `GetOwner()`, `HasOwner()`, "current owner," "owner-gated") is built on that shorter word, not the longer one, and bare `creator` was added to match `GetCreator`/`SetCreator`/`m_creator` the same way): any `Edit`/`Write` to a `.md`/`.mdx` file anywhere in this repo (both `ew_toolkit` and `ew_toolkit-cursor` worktrees) whose new content contains any of: `<pid>`, `<cid>`, `ClaimOwnership`, `SetOwner`, `SetOwnerInternal`, `owner`, `creator`, `ZDOVars.s_owner`, `ZDOVars.s_creator`, `long_creator`, `long_owner`, `ReleaseZDOS`, or the phrase "zone host" (case-insensitive substring match on each).
- **Behavior**: blocks and asks (not a silent reminder) — same shape as `guard-doc-example-schema.cjs`. Message: point at the ledger file, require confirmation that any new ownership claim in the edit was checked against it or added to it via the Tier test, before the edit is allowed to land.
- **Not yet built.**

## 8. Rule — spec (for `ew_wiki/AGENTS.md`)

Draft addition to the existing "Never guess — real source first" section (to be run through `/writing-for-agents` before actually landing, per wayfinder's own reach-check step — not written into `AGENTS.md` yet):

> For any object-ownership/`pid`/`cid` claim: check `EWP_pid_ownership_code_findings.md` first. If the component isn't listed, sweep it using the full test (§3 of `spec-pid-ownership-mechanic.md`) — `ClaimOwnership`, `SetOwner(`, and `SetOwnerInternal(` greps all run separately, both the interaction chain and the periodic (`Update`/`InvokeRepeating`) chain traced, and the Effect-spawn chain checked if applicable — never just the file or the chain that seems relevant, and never call a component done with only one chain checked. Add the row, including the sweep-completeness table entry, before writing any wiki claim about it.

## 9. Open, not yet answered

- ~~Whether to dispatch the full ledger-building sweep as a background `/research` subagent now, or continue it live.~~ Resolved: dispatched as background agents (two passes); the ledger is built and cross-verified.
- ~~Whether the hook keyword list above is complete, or the maintainer has more terms in mind.~~ Resolved 2026-09-15 — locked list is in §7 above.
- The ledger's backfill stays empty until the fresh sweep runs (§6) — ~~`object-ownership.mdx` itself still needs rebuilding into the maintainer's chosen Prototype 4 shape, blocked on the ledger existing first.~~ The ledger now exists and is cross-verified (prefab-example citation pass, two rounds). The `object-ownership.mdx` rebuild is unblocked but not yet started.
- Hook (§7) and rule (§8) are locked in spec but not yet built/landed — tracked as their own ticket on the Player Identity & Object Ownership map.
