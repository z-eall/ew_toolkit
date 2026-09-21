# How to prove an object-ownership claim

Use this method before writing any claim about who owns an object (`pid`, `cid`, "claims itself to", "carries the zone host's `<pid>`"). The results go in the ownership ledger, `docs/guide-source/3-advanced-guide/EWP_pid_ownership_code_findings.md`. Check the ledger first; sweep a component fresh only if it is not listed.

## The one mechanism

In Valheim's `ZDO` class, the owner field is private. Only two methods change it: `SetOwner(uid)` and `SetOwnerInternal(uid)`. `ZNetView.ClaimOwnership()` is only a shortcut for "call `SetOwner` with my own session id". So every ownership change is one of three shapes:

1. A call inside one component: a claim on itself, or a call aimed at another id.
2. Creation: `ZDOMan.CreateNewZDO` calls `SetOwnerInternal` with the local session id, for every object that has a `ZNetView`, effects included.
3. The periodic sweep in `ZDOMan.ReleaseZDOS`, which hands unclaimed objects to whoever is nearest.

A component with no `SetOwner` call of its own relies on shapes 2 and 3. That is not a gap.

## Sweep one component

1. **Three separate searches** over the component: `ClaimOwnership`, `SetOwner(` and `SetOwnerInternal(`. Never let one stand in for another: a call aimed at someone else's id never matches `ClaimOwnership`. State which searches ran before you write "no `SetOwner` call".
2. **Grade the trigger** for each call site. Ask: is any field write impossible unless this ownership change already happened?
   - **Tier A, proved:** the write sits behind a check on the same ownership state (`IsOwner()`), or in the same branch as the call. State it flatly.
   - **Tier B, correlated:** a field changes nearby but nothing forces it to line up. Label it unconfirmed.
   - **Tier C, no usable field:** nothing to watch. Use an on-demand check instead of a `type: change` trigger.
3. **Read gates in the right direction.** A gate after a `SetOwner` call proves the change just happened. A gate that only lets the owner run routine work proves nothing.
4. **Trace the effect chain.** If the component spawns an effect, name the method and how the call is sent: owner-gated, targeted, or broadcast. A broadcast makes one independently owned copy per client.
5. **Trace both chains:** the interaction chain (`Interact`, `UseItem`, their RPC handlers) and the periodic chain (`Update`, `FixedUpdate`, `InvokeRepeating` targets).

## Record it

Add rows to the ledger's three tables: call sites, effect spawns, and sweep completeness. A component is "Fully swept" only when every applicable check is Y. Otherwise write "Partial: <what is unchecked>". A first sweep of more than about 12 components should expect two passes and mark rows Partial.
