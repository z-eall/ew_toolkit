# Idea Showcase: Bee Ecosystem Overhaul MK-II

**Source:** Valheim World Editing Discord — `#config-share` forum
**Author:** Z e a l l (VWE, Original Poster)
**Tags:** Vanilla, EW Prefabs
**Difficulty:** EWP Intermediate
**Posted:** November 12, 2025

---

## Idea Origin

Aimed to reduce excessive Honey in Valheim, and create a more interactive dynamic ecosystem among bees, flowers, crops, etc.

> **Admin note:** Although most balancing concerns have been considered, in case you have other preferences — most of the chances/power values are configurable in the data yaml. Look for the **ezConfig™** section.

## Features

- Wild beehives will **not guarantee** a drop of QueenBee.
- Honey extraction can make a Beehive turn **silent**.
- Honey can be used as **fertilizer** on cultivated ground.
- Crops yield better when grown near a Beehive — **Blooming = 2x, Pollinated = 3x**.
- Fresh flowers can **re-activate silent beehives**.
- QueenBee can now drop from flowers, not just beehives.

*(The original post includes a demo video attachment showing these features in action — see the Discord thread.)*

---

## Script (`expand_prefabs_overhaulBeeEco-system_MK-II.yaml`)

Full functional script — 179 lines.

```yaml
#
# +===========================================================+
# |                                                           |
# | Bee Ecosystem Overhaul - MK-II                            |
# |                                                           |
# +===========================================================+
#
# ╔═══════════════════════════════════════════════════════════╗
# ║                                                           ║
# ║ Section 1 - QueenBee Control                              ║
# ║                                                           ║
# ╚═══════════════════════════════════════════════════════════╝
#

- prefab: vfx_beehive_destroyed
  type: create
  poke:
  - self: true
    delay: 0.2
    parameter: bridgeRemoveQueenbee

- prefab: vfx_beehive_destroyed
  type: poke, bridgeRemoveQueenbee
  poke:
  - prefab: QueenBee, Honey
    maxDistance: 5
    parameter: removeBeehiveDrops

- prefab: QueenBee, Honey
  type: poke, removeBeehiveDrops
  weight: <chanceRemoveQueenbee>
  remove: true
  spawn: vfx_spawn_small

# Blooming flowers provide chance to drop QueenBee
- prefab: allGrownFlowers
  type: state, picked
  weight: <chanceSpawnQueenbee>
  objects:
  - prefab: piece_beehive
    bannedFilter: int, isSilentBeehive, 1
    maxDistance: 10
  spawn:
  - prefab: QueenBee
    pos: 0,0,1.5
  - prefab: fx_skeleton_pet

#
# ╔═══════════════════════════════════════════════════════════╗
# ║                                                           ║
# ║ Section 2 - Fertilizing Ground                            ║
# ║                                                           ║
# ╚═══════════════════════════════════════════════════════════╝
#

- prefab: groundFertilizer
  type: create
  filter: int, pickedUp, 1
  poke:
  - self: true
    delay: 3
    parameter: checkFertilizePossible

- prefab: groundFertilizer
  type: poke, checkFertilizePossible
  filter: int, stack, <groundFertilizerStackSize>
  paint: cultivated
  spawn:
  - prefab: fx_jelly_pickup
  remove: true
  poke:
  - prefab: allSaplingCrops, allSaplingTrees
    limit: <groundFertilizerAffectUnit>
    maxDistance: <groundFertilizerAffectRange>
    parameter: findNearbySapling

- prefab: allSaplingCrops, allSaplingTrees
  type: poke, findNearbySapling
  bannedFilter: int, isFertilizedSapling, 1
  poke:
  - self: true
    delay: <randf_0_1.1>
    parameter: reduceGrowTime

- prefab: allSaplingCrops
  type: poke, reduceGrowTime
  data: isFertilizedSaplingCrops
  spawn:
  - prefab: fx_FeastPlainsEat
    pos: 0,0,0.5

- prefab: allSaplingTrees
  type: poke, reduceGrowTime
  data: isFertilizedSaplingTrees
  spawn:
  - prefab: fx_FeastPlainsEat
    pos: 0,0,0.5

#
# ╔═══════════════════════════════════════════════════════════╗
# ║                                                           ║
# ║ Section 3 - Pollinated Crops                              ║
# ║                                                           ║
# ╚═══════════════════════════════════════════════════════════╝
#

- prefab: allGrownCrops
  type: create
  objects:
  - prefab: piece_beehive
    bannedFilter: int, isSilentBeehive, 1
    maxDistance: 10
  poke:
  - self: true
    parameter: turnBetterYield

- prefab: allGrownCrops
  type: poke, turnBetterYield
  weight: <chanceTurnBlooming>
  fallback: true
  data: isBetterCropsBlooming
  spawn:
  - prefab: vfx_creature_soothed
  - prefab: fx_FeastMistlandsEat
    pos: 0,0,1

- prefab: allGrownCrops
  type: poke, turnBetterYield
  weight: <chanceTurnPollinated>
  fallback: true
  data: isBetterCropsPollinated
  spawn:
  - prefab: vfx_creature_soothed
  - prefab: fx_FeastAshlandsEat
    pos: 0,0,1

#
# ╔═══════════════════════════════════════════════════════════╗
# ║                                                           ║
# ║ Section 4 - Beehive Control                               ║
# ║                                                           ║
# ╚═══════════════════════════════════════════════════════════╝
#
# Extraction can turn beehive to silent
- prefab: piece_beehive
  type: change, level 0 3,4
  weight: <mul_<par2>_<chanceTurnSilentFactor>>
  bannedFilter: int, isSilentBeehive, 1
  data: isSilentBeehive
  spawn:
  - prefab: vfx_spawn_small

# Fresh blooming flowers can reactivate silent beehive
- prefab: allGrownFlowers
  type: create
  weight: <chanceResetSilent>
  objects:
  - prefab: piece_beehive
    filter: int, isSilentBeehive, 1
    maxDistance: 10
  poke:
  - prefab: piece_beehive
    filter: int, isSilentBeehive, 1
    parameter: resetSilentBeehive

- prefab: piece_beehive
  type: poke, resetSilentBeehive
  remove: true
  spawn:
  - prefab: <prefab>
    triggerRules: true
  - prefab: fx_skeleton_pet
    pos: 0,0,1

# Disable repair for silent beehive
- prefab: piece_beehive
  type: state, repair
  filter: int, isSilentBeehive, 1
  data: isSilentBeehive
```

---

## Data (`data_overhaulBeeEco-system_MK-II.yaml`)

Full data file — 166 lines. **Install this before the script above.**

```yaml
#
# +===========================================================+
# |                                                           |
# | Bee Ecosystem Overhaul - MK-II - Data                     |
# |                                                           |
# +===========================================================+
#
# ╔═══════════════════════════════════════════════════════════╗
# ║                                                           ║
# ║ Configurable data                                         ║
# ║                                                           ║
# ╚═══════════════════════════════════════════════════════════╝
# ezConfig™ Section
#
# Change value here to modify QueenBee drop rates
- value: chanceRemoveQueenbee, 0.7
- value: chanceSpawnQueenbee, 0.07

# Change value here to modify fertilizer item
- valueGroup: groundFertilizer
  values:
  - Honey

# Change value here to modify fertilizer power
- value: groundFertilizerStackSize, 10
- value: groundFertilizerAffectUnit, 5
- value: groundFertilizerAffectRange, 5

# Change value here to modify reducing % for grow time
- value: reduceGrowTimeCrops, 0.5
- value: reduceGrowTimeTrees, 0.35

# Change value here to modify chance to turn pollinated
- value: chanceTurnBlooming, 0.3
- value: chanceTurnPollinated, 0.1

# Change value here to modify better yield power
# Multiplier of 2x or 3x to original yield
- value: betterYieldBlooming, 2
- value: betterYieldPollinated, 3

# Change value here to modify beehive control power
- value: chanceTurnSilentFactor, 0.1
- value: chanceResetSilent, 0.2

# Change value here to modify list of valid crops
- valueGroup: allSaplingCrops
  values:
  - sapling_carrot
  - sapling_turnip
  - sapling_onion
  - sapling_barley
  - sapling_flax
  - sapling_jotunpuffs
  - sapling_magecap
  - sapling_seedcarrot
  - sapling_seedonion
  - sapling_seedturnip

# Change value here to modify list of valid grown crops
- valueGroup: allGrownCrops
  values:
  - Pickable_Carrot
  - Pickable_Turnip
  - Pickable_Onion
  - Pickable_Barley
  - Pickable_Flax
  - Pickable_Mushroom_JotunPuffs
  - Pickable_Mushroom_Magecap

# Change value here to modify list of valid grown flowers
- valueGroup: allGrownFlowers
  values:
  - Pickable_SeedCarrot
  - Pickable_SeedTurnip
  - Pickable_SeedOnion

# Change value here to modify list of valid trees
- valueGroup: allSaplingTrees
  values:
  - Beech_Sapling
  - FirTree_Sapling
  - PineTree_Sapling
  - Birch_Sapling
  - Oak_Sapling

#
# ╔═══════════════════════════════════════════════════════════╗
# ║                                                           ║
# ║ Static common used data                                   ║
# ║                                                           ║
# ╚═══════════════════════════════════════════════════════════╝
# Most of scenario does not require configuration
#

- name: isFertilizedSaplingCrops
  ints:
  - isFertilizedSapling, 1
  strings:
  - Plant.m_name, <#00ff00>Fertilized</color> $piece_<prefab>
  floats:
  - Plant.m_growTime, <mul_<float_Plant.m_growTime>_<sub_1_<reduceGrowTimeCrops>>>
  - Plant.m_growTimeMax, <mul_<float_Plant.m_growTimeMax>_<sub_1_<reduceGrowTimeCrops>>>

- name: isFertilizedSaplingTrees
  ints:
  - isFertilizedSapling, 1
  strings:
  - Plant.m_name, <#00ff00>Fertilized</color> <grown<prefab>> Sapling
  floats:
  - Plant.m_growTime, <mul_<float_Plant.m_growTime>_<sub_1_<reduceGrowTimeTrees>>>
  - Plant.m_growTimeMax, <mul_<float_Plant.m_growTimeMax>_<sub_1_<reduceGrowTimeTrees>>>

# Display names for trees
- value: grownBeech_Sapling, Beech
- value: grownFirTree_Sapling, Fir
- value: grownPineTree_Sapling, Pine
- value: grownBirch_Sapling, Birch
- value: grownOak_Sapling, Oak

# Display names for crops
- value: grownPickable_Carrot, Carrot
- value: grownPickable_Turnip, Turnip
- value: grownPickable_Onion, Onion
- value: grownPickable_Barley, Barley
- value: grownPickable_Flax, Flax
- value: grownPickable_Mushroom_JotunPuffs, Jotun Puffs
- value: grownPickable_Mushroom_Magecap, Magecap

- name: isBetterCropsBlooming
  ints:
  - isBetterCrops, 1
  - Pickable.m_amount, <mul_<pickAmount<prefab>>_<betterYieldBlooming>>
  strings:
  - Pickable.m_overrideName, <#ff9933>Blooming</color> <grown<prefab>>

- name: isBetterCropsPollinated
  ints:
  - isBetterCrops, 1
  - Pickable.m_amount, <mul_<pickAmount<prefab>>_<betterYieldPollinated>>
  strings:
  - Pickable.m_overrideName, <#ff00ff>Pollinated</color> <grown<prefab>>

# Vanilla yield for crops
- value: pickAmountPickable_Carrot, 1
- value: pickAmountPickable_Turnip, 1
- value: pickAmountPickable_Onion, 1
- value: pickAmountPickable_Barley, 2
- value: pickAmountPickable_Flax, 2
- value: pickAmountPickable_Mushroom_JotunPuffs, 2 # Balanced to 2 (Vanilla 3)
- value: pickAmountPickable_Mushroom_Magecap, 2 # Balanced to 2 (Vanilla 3)

- name: isSilentBeehive
  ints:
  - isSilentBeehive, 1
  - Beehive.m_maxHoney, 0
  - Piece.m_canBeRemoved, 0
  floats:
  - Beehive.m_secPerUnit, 0
  - Beehive.m_maxCover, 1E-23
  - health, 50
  - WearNTear.m_health, 100
  strings:
  - Beehive.m_name, Silent Beehive<br><size=12><#00ff00>Fresh</color> blooming flowers shall <#fff000>re-activate</color> the beehive.<size=0>
  - Beehive.m_happyText, The nearby flowers are lacking sweetness for the bees.
  - Beehive.m_freespaceText, The nearby flowers are lacking sweetness for the bees.
```

---

## How It Works (Summary)

**Section 1 — QueenBee Control:** When a beehive is destroyed, a short poke chain finds any nearby `QueenBee`/`Honey` drops and — based on `chanceRemoveQueenbee` (default 70%) — removes them, so QueenBee is no longer a guaranteed beehive drop. Separately, picking a grown flower near an active (non-silent) beehive has a `chanceSpawnQueenbee` (default 7%) chance to spawn a QueenBee at that flower instead.

**Section 2 — Fertilizing Ground:** Dropping a stack of Honey (the configured `groundFertilizer` item) of at least `groundFertilizerStackSize` (default 10) onto cultivated ground paints the ground and consumes the stack, then reduces the grow time of nearby saplings/trees (within `groundFertilizerAffectRange`, up to `groundFertilizerAffectUnit` targets) by `reduceGrowTimeCrops`/`reduceGrowTimeTrees` (50%/35% by default) and renames them "Fertilized."

**Section 3 — Pollinated Crops:** Any grown crop within 10m of an active beehive rolls a chance to become "Blooming" (`chanceTurnBlooming`, 2x yield) or "Pollinated" (`chanceTurnPollinated`, 3x yield), each with its own visual effect.

**Section 4 — Beehive Control:** Extracting honey from a beehive (`level 0 3,4`) has a chance — scaled by `chanceTurnSilentFactor` and the extraction amount (`par2`) — of turning the hive "silent" (no more honey production, can't be repaired). A silent beehive can be reactivated by a chance roll (`chanceResetSilent`) whenever a flower blooms nearby, which respawns a fresh beehive on the spot.

All of the key rates, ranges, and multipliers live in the **ezConfig™** section at the top of the data file for easy tuning.

---

## Community Notes

- Nov 13, 2025 — Z e a l l, to a player who'd made a similar (pollination-focused) system: *"lighter and smarter script with latest EWP technology, in case you still fancy pollination"*
- Nov 14, 2025 — grisi: *"I'll try this weekend"* (feedback requested by the OP from a player's point of view).
