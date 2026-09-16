# Turn "Effects (FX)" into its own object-rule entry

Type: prototype
Status: closed
Claimed by: Claude (this session, 2026-09-16)
Blocked by: [Rewrite explanatory sections](06-explanatory-sections-rewrite.md)
Parent: [Player Identity & Object Ownership map](../map.md)

## Question

**Scope note (2026-09-16):** this ticket now absorbs the appendix's "Hit FX vs. damage-over-time FX" entry, pulled out of [ticket 11](11-object-chunk-5.md) — this is the single, sole focus of the current work session. Ticket 11's other 3 objects (Tameable, Character/Ragdoll, OfferingBowl) and the separate known-wrong OfferingBowl prefab are explicitly untouched/deferred until this closes.

Known findings so far, not yet written into the page (see the session's own record for full detail, don't re-derive):
- No single Component exists in the decompiled game code for `vfx_`/`sfx_`/`fx_` prefabs — confirmed via a whole-tree grep for those literal strings (zero hits). This is a naming category, not a Component; the page should say so plainly.
- The live page's Fireplace section has already been corrected this session to only claim ownership transfer via lighting fireworks (`vfx_Firework_*`/`vfx_FireWork_*`), since ordinary interaction never transfers ownership away from the Zone Host in real play.
- A verified "whoever personally does it, owns the effect" family exists beyond Hit FX/fireworks: weapon hit spark (`vfx_player_hit`, via `Attack.cs`'s own `m_hitEffect` — not `Character.cs`'s `m_hitEffects`, an earlier wrong citation this session), perfect block (`vfx_blocked`), and piece placement (`vfx_Place_*` family) — all confirmed client-local in code, no RPC.
- Getting the FULL prefab-to-effect assignment list (which exact `vfx_` prefab every weapon/creature uses) is not feasible from decompiled code or from `valheimtools.stream` (checked live — its scraper does not expose `EffectList`-typed fields). Doing this for real needs either Unity asset-ripping tooling or a runtime-dump BepInEx mod — out of scope for this ticket; the entry should teach from verified representative examples instead of an exhaustive catalog.

## Original question

The page used to carry a prose section, "Effects (FX): still just the same two rules," explaining VFX/SFX ownership as general commentary on the two rules rather than as a concrete, paste-ready entry like the appendix's other objects. The maintainer wants this turned into an actual **object rule** — the same shape as a `### Container` or `### Trap` appendix entry, with real paste-ready scripts — rather than an explanatory paragraph living up in the rules section.

Removed from the live page this session (2026-09-15) so the explanatory section stays lean; the prose below is the last-known-good draft, saved here as a starting point, not a locked answer:

> VFX and SFX don't need a third rule — they follow the same two rules above, just in a less obvious way, because it depends on how the game triggers that particular effect:
>
> - **Most effects** — a trap's spark, a turret's muzzle flash, a chest's open effect — are spawned locally by whoever's game is currently running that piece of code, the same as the Claiming Player rule.
> - **Some effects broadcast to everyone nearby.** Every connected player's own game spawns its own copy independently — so if three players are standing nearby when it fires, that's three separate copies of the same effect, each owned by the player whose game spawned it.
> - **A damage-over-time effect** (being on fire, poisoned) is different — it's tied to the **victim's** own ownership, not the attacker's. So it's the Zone Host rule seen from the victim's side, no matter who caused the damage.

Note: the appendix already has a "Hit FX vs. damage-over-time FX" entry (`### Hit FX vs. damage-over-time FX`) with two real scripts (`vfx_player_hit`, `vfx_Burning`) that were originally described as "repeated here so the appendix stays complete on its own" — now that the prose version is gone, that entry is no longer a repeat, it's the *only* copy. Check whether it needs expanding to also demonstrate the "broadcast = one copy per nearby client" case (the middle bullet above), since the current appendix entry only shows the single-spawn and DoT cases, not a broadcast example.

Resolve like the other object-appendix chunks: build as `draft: true` (already is), validate any script against `ewp_validator`, show the maintainer the rendered entry, get signoff.

## Answer

Signed off 2026-09-16. Replaced the old "Effects" prose/entry with two real object-appendix entries, same shape as every other `### <Component>` chunk on the page:

- **`### Personal FX`** (renamed from "Effects" — not a component, a `vfx_`/`sfx_`/`fx_` naming category, said plainly with a link to the Prefabs list). Two rules: a weapon's own hit spark belongs to whoever swung and connected (`sfx_axe_hit`, `fx_jotunbane_hit` — confirmed via `Attack.cs`, no RPC, called on the attacker); everything else on your own body belongs to you, whether you caused it (jumping `sfx_jump`, eating `fx_Eat`) or it happened to you (`vfx_player_hit`, `vfx_perfectblock`, `fx_crit`). A `<Aside type="caution">` sits right after the hit-spark example flagging repeating effects (DoT FX, e.g. `vfx_Burning`) as the one exception — they don't stay fixed to one owner, gated by `SEMan.IsOwner()` on the affected character, re-decided on each restart.
- **`### Projectile`** (new appendix entry, absorbing the old broadcast-effect case into Feast instead — see below). Player-fired projectiles (`- prefab: Projectile`) are created directly by the shooter, same mechanism as the weapon hit spark (`Attack.cs`, no RPC). A Tip notes anything the projectile spawns along the way — its FX (`vfx_arrowhit`) or an extra spawn (`Blob`) — belongs to that same player. A Caution notes a monster's own projectile (e.g. `Greydwarf_throw_projectile`) instead follows the ordinary Zone Host rule.
- **Feast** section now carries the "broadcast effect" explanation on its own (every connected player's game independently spawns its own copy, each owned by whoever's game made it) — no longer a pointer back to the FX section.

All 28 script boxes on the page validated clean (`yaml-fences.cjs` + `yaml.parse`, 0 bad). Verified live on the restarted WSL dev server via `get_page_text`, matching the authored content exactly. Maintainer reviewed the rendered page across several rounds of feedback and gave final signoff.

Chunk 5's other 3 objects (Tameable, Character/Ragdoll, OfferingBowl) and the known-wrong `OfferingBowl` prefab are now unblocked to resume on [chunk 5](11-object-chunk-5.md).
