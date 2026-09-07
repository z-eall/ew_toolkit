# Idea Showcase: Loot Drop Customization for Ragdoll Creatures

**Source:** Valheim World Editing Discord — `#config-share` forum
**Author:** Z e a l l (VWE, Original Poster) — credit to **Jere** for implementing the feature
**Tags:** Vanilla, EW Prefabs
**Difficulty:** EWP Intermediate
**Posted:** June 11, 2025 (with community additions through October 12, 2025)

> Requires **Expand World Prefabs (EWP)** version **post v1.42.2**. If the test release has been removed by the time you read this, use the public release from Thunderstore instead.
>
> This script **only works for creatures that have Ragdolls** (e.g. Deer is used as the example below). If your target creature has **no ragdoll** on death (e.g. Skeleton), refer to Raaka's alternate example ("Simple example for changing Skeleton..." — a separate post in `#config-share`) instead.

---

## Theory / Idea Origin

You can't target `type: destroy` with `drops: false` to suppress loot, because of how the game/code is designed.

After a lot of experimentation, the findings are:

- Ragdolls create their drops only after they "poof," and each ragdoll has its own timer before it poofs.
- So the idea is to **remove the ragdoll before it poofs** — this effectively removes the entire original drop table.
- From there, you need an organized structure to write your own custom drop loot `data`. That structure request is what became this feature, implemented by Jere.

## Let Your Creativity Shine

Although it can be tough to build custom drop tables for every existing creature, don't let that stop you from creating an interesting play-style for you and your friends. As simple as it sounds, adding built armor pieces as low-rate drops gives an extra "hunt and collect" style of adventure — even more fun if paired with a mod that disables crafting those same items.

*(The original post includes a "Table view" screenshot and a video reference demonstrating the effect — see the Discord thread for the image/video attachments.)*

---

## How It Works (Script Breakdown)

**Install order matters:** install `data.yaml` **before** `script.yaml`.

### Section 1 — Passing Star Level Value

`poke` always needs its target object to already exist, and ragdolls aren't necessarily spawned immediately upon creature death — so a "bridge" is needed to pass values (like creature level) from the creature to its ragdoll.

```yaml
#
# +===========================================================+
# |                                                             |
# |          Ragdoll Creature Drop Customization                |
# |                                                             |
# +===========================================================+
# | Allows you to customize Ragdoll creatures' drop           |
# +-------------------------------------------------------------+
#
# ╔═══════════════════════════════════════════════════════════╗
# ║                                                             ║
# ║          Section 1 - Passing Star Level Value              ║
# ║                                                             ║
# ╚═══════════════════════════════════════════════════════════╝
#
# Poke will always need the target object be existed to work
# And ragdolls not necessarily be spawned always upon creature death
# So we need a "bridge" to pass the values
- prefab: MonsterAI,AnimalAI
  type: destroy
  spawn:
  - prefab: sfx_secretfound
    data: float, TimedDestruction.m_timeout, 0.5
    # sfx_secretfound has a ~2 sec "blank" intro before the actual "ding" sound happens
    # So, making it timeout during the blank = an invisible object with auto removal
  poke:
  - prefab: sfx_secretfound
    limit: 1
    maxDistance: 1
    delay: 0.1 # Small delay required
    parameter: monsterDeathBridgePoke <int_level=1>

# This is the bridge from the creature death to the sfx, finally to the ragdoll
- prefab: sfx_secretfound
  type: poke, monsterDeathBridgePoke
  poke:
  - prefab: Ragdoll
    limit: 1
    maxDistance: 0.5
    delay: 0.1
    parameter: findMatchingRagdoll <par_1> # creatureLevel
```

### Section 2 — Mechanics on Ragdoll

```yaml
#
# ╔═══════════════════════════════════════════════════════════╗
# ║                                                             ║
# ║            Section 2 - Mechanics on Ragdoll                 ║
# ║                                                             ║
# ╚═══════════════════════════════════════════════════════════╝
#

# Using Deer's in this example showcase
- prefab: deer_ragdoll
  type: poke, findMatchingRagdoll
  remove: true
  removeDelay: <sub_<float_Ragdoll.m_ttl>_1>
  # Removing the ragdoll before it "poof" to create the original drops
  spawn:
  - prefab: vfx_corpse_destruction_small
    delay: <sub_<float_Ragdoll.m_ttl>_1>
    # Spawning the original vfx for aesthetic visual
  poke:
  - self: true
    delay: <sub_<float_Ragdoll.m_ttl>_1.035>
    # Use delay here to sync the custom drops to appear together with the "fake" vfx
    parameter: syncDropWithFx <par_1> # creatureLevel

# Final result
- prefab: deer_ragdoll
  type: poke, syncDropWithFx
  drops: newDeerDropLevel<par_1>
```

This is the full `script.yaml` (69 lines) — save as e.g. `expand_prefabs_customRagdollCreatureDrop.yaml`.

### Data File — Custom Drop Tables

The `data.yaml` defines the actual loot tables referenced by `drops: newDeerDropLevel<par_1>` above, one per star level.

```yaml
#
# +===========================================================+
# |                                                             |
# |     Ragdoll Creature Drop Customization - Data              |
# |                                                             |
# +===========================================================+
#

- name: newDeerDropLevel1
  itemAmount: 1
  items:
  - prefab: DeerHide
    chance: 0.5
    stack: 1
  - prefab: DeerMeat
    chance: 0.5
    stack: 1;2
  - prefab: TrophyDeer
    chance: 0.05
    stack: 1
  - prefab: ArmorLeatherLegs
    chance: 0.01
    stack: 1

- name: newDeerDropLevel2
  itemAmount: 1;2
  items:
  - prefab: DeerHide
    chance: 0.5
    stack: 1;2
  - prefab: DeerMeat
    chance: 0.5
    stack: 1;2
  - prefab: TrophyDeer
    chance: 0.15
    stack: 1
  - prefab: ArmorLeatherChest
    chance: 0.01
    stack: 1

- name: newDeerDropLevel3
  itemAmount: 1;3
  items:
  - prefab: DeerHide
    chance: 0.5
    stack: 2;3
  - prefab: DeerMeat
    chance: 0.5
    stack: 2;4
  - prefab: TrophyDeer
    chance: 0.3
    stack: 1
  - prefab: HelmetLeather
    chance: 0.01
    stack: 1
```

This is the full `data.yaml` (55 lines) — save as e.g. `data_customRagdollCreatureDrop.yaml`, and install it **before** the script file above.

---

## Extended Reading: Possible Variations

*(You don't need this section if you just want basic customization.)*

The example above targets `deer_ragdoll` directly. With a good understanding of EWP structure, you can generalize it further:

### Dynamic Ragdolls

Compile a list of `valueGroup` entries mapping each creature to its ragdoll prefab, then reference it dynamically:

```yaml
# Assumed <par_2> is passed <prefab>
- prefab: <ragdoll<par_2>>
  drops: newDrop<par_2>

# data
- value: ragdollDeer, deer_ragdoll
```

### Dynamic Drops

Instead of writing three separate drop-table entries (one per star level), "centralize" the drop definition by level using EWP's math/parameter expressions:

```yaml
# Assumed <par_1> is passed <int_level=1>
- name: newDropDeer
  itemAmount: <sub_<par_1>_1>;<par_1>
  items:
  - prefab: DeerHide
    chance: 0.5
    stack: <sub_<par_1>_1>;<par_1> # 0;1 for level1, 1;2 for level2, 2;3 for level3
  - prefab: DeerMeat
    chance: 0.5
    stack: <par_1>;<add_<par_1>_1>
  - prefab: TrophyDeer
    chance: <add_0.05_<mul_0.01_<sub_<par_1>_1>>> # 5% for level 1, 6% for level 2, 7% for level 3
    stack: 1
  - prefab: ArmorLeatherLegs
    chance: <add_0.01_<mul_0.01_<sub_<par_1>_1>>>
    stack: 1
```

---

## Community Addition: Full Ragdoll Prefab List

Posted by **Leftaf (UTC+13)**, October 12, 2025 — "here is my best list of all ragdoll combinations," for use with the Dynamic Ragdolls `valueGroup` pattern above:

```yaml
- value: ragdollAbomination, Abomination_ragdoll
- value: ragdollBjorn, Bjorn_ragdoll
- value: ragdollBoar, boar_ragdoll
- value: ragdollCharredMelee, Charred_Melee_Ragdoll
- value: ragdollDeer, deer_ragdoll
- value: ragdollDraugrElite, Draugr_elite_ragdoll
- value: ragdollDraugr, Draugr_ragdoll
- value: ragdollDraugrRanged, Draugr_ranged_ragdoll
- value: ragdollDverger, Dverger_ragdoll
- value: ragdollEikthyr, eikthyr_ragdoll
- value: ragdollFenringCultist, Fenring_cultist_ragdoll
- value: ragdollFenringCultistHildir, Fenring_cultist_ragdoll_hildir
- value: ragdollFenring, Fenring_ragdoll
- value: ragdollFxFader, fx_Fader_Ragdoll
- value: ragdollGdking, gdking_Ragdoll
- value: ragdollGoblinDragdoll, Goblin_Dragdoll
- value: ragdollGoblinBruteHildir, GoblinBrute_Hildir_ragdoll
- value: ragdollGoblinBrute, GoblinBrute_ragdoll
- value: ragdollGoblinKing, GoblinKing_ragdoll
- value: ragdollGoblinShamanHildir, GoblinShaman_Hildir_ragdoll
- value: ragdollGoblinShaman, GoblinShaman_ragdoll
- value: ragdollGreydwarfElite, Greydwarf_elite_ragdoll
- value: ragdollGreydwarf, Greydwarf_ragdoll
- value: ragdollGreydwarfShaman, Greydwarf_Shaman_ragdoll
- value: ragdollGreyling, Greyling_ragdoll
- value: ragdollHare, Hare_ragdoll
- value: ragdollHatchling, Hatchling_ragdoll
- value: ragdollLox, lox_ragdoll
- value: ragdollLoxcalf, loxcalf_ragdoll
- value: ragdollNeck, Neck_Ragdoll
- value: ragdollPlayer, Player_ragdoll
- value: ragdollPlayerOld, Player_ragdoll_old
- value: ragdollAsksvin, Ragdoll_Asksvin
- value: ragdollAsksvinHatchling, Ragdoll_Asksvin_Hatchling
- value: ragdollStonegolem, Stonegolem_ragdoll
- value: ragdollTroll, Troll_ragdoll
- value: ragdollTrollSummoned, Troll_summoned_ragdoll
- value: ragdollUlv, Ulv_Ragdoll
- value: ragdollUnbjorn, Unbjorn_ragdoll
- value: ragdollVolture, Volture_ragdoll
- value: ragdollWolf, Wolf_Ragdoll
```

---

## Credits

> It means so much to be supported — and Jere has always been there, quietly working behind the scenes, answering our questions and fulfilling every request without ever seeking the spotlight. We truly appreciate everything you do. Big thanks and all the credit to you, @Jere!

— Z e a l l
