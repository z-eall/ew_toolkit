# EWP Poke — Advanced Guide (Maze Walkthrough)

*Source: Zeall's "EWP Guide Series: Advanced poke guide" (Valheim World Editing Discord, #guides). Credits to @DhakhaR for proof-reading/inputs. Companion to the [Basic poke guide](./EWP_Basic_Poke_Guide.md).*

> **Disclaimer:** Most of the actual scripts here were stripped down to focus on the main points — copying them exactly won't reproduce what's shown in the videos.

Hands-on examples walk through a maze built to demonstrate poke in real scenarios, introducing several reusable "custom button / trigger" patterns along the way.

## Maze Entrance — `self: true` + emote trigger

Poking `self: true` tells an object to poke itself. Kneeling near the gate warns the player, then the kneel emote pokes the gate doors open (left/right tracked separately via `isGateRight`/`isGateLeft` filters), each with a delayed self-poke back to `closeDoor` as a reset.

```yaml
- prefab: Player
  type: state, interact
  objects: [blackmarble_floor, 1]
  poke:
    - self: true
      parameter: askPlayerToKneel

- prefab: Player
  type: poke, askPlayerToKneel
  objectRpc:
    - name: Message
      2: string, <#FF0000>KNEEL!</color> <pname>!

- prefab: Player
  type: change, emoteID
  filter: string, emote, kneel
  poke:
    - prefab: flametal_gate
      data: int, isGateRight, 1   # data: under poke = filter, not applied data
      delay: 1
      parameter: openGateRight
    - prefab: flametal_gate
      data: int, isGateLeft, 1
      delay: 1
      parameter: openGateLeft

- prefab: flametal_gate
  type: poke, openGateRight
  filter: int, isGateRight, 1
  data: int, state, -1
  poke:
    - self: true
      delay: 5
      parameter: closeDoor   # shared reset poke, reused across the whole maze
```
*Video: https://cdn.discordapp.com/attachments/1366022688275173550/1366023112260321341/mazeEntrance.mp4*

## Maze Room 1 — parameter value + chest trigger

A value passed after the parameter name rides along like an SMS. Here the chest sends its coin count; only the poke matching `checkCoin 2` fires the "Correct" response, any other count falls through to the generic `checkCoin` "Wrong" handler.

```yaml
- prefab: piece_chest_blackmetal
  type: change, InUse 0
  poke:
    - self: true
      parameter: checkCoin <item_Coins>   # sends the coin count as the poke's payload

- prefab: piece_chest_blackmetal
  type: poke, checkCoin       # catches everything except "checkCoin 2"
  clientRpc: [{name: RPC_DamageText, 3: string, Wrong!}]

- prefab: piece_chest_blackmetal
  type: poke, checkCoin 2     # only fires when the value is exactly 2
  weight: 1e30
  removeItems: Coins, 2
  clientRpc: [{name: RPC_DamageText, 3: string, Correct!}]
```
*Video: https://cdn.discordapp.com/attachments/1366022688275173550/1366023503396212906/mazeRoom1.mp4*

## Maze Room 2a — poke chain + object creation trigger

Destroying the crystal wall drops a Crystal → resets the itemstand's bow → opens the iron gate → delayed self-poke closes it again. If any link in the chain doesn't fire (e.g. no crystal drops), the chain breaks and the gate never opens.

```yaml
- prefab: Crystal
  type: create
  filter: int, stack, 1
  poke: [{prefab: itemstand, maxDistance: 10, parameter: resetBow}]

- prefab: itemstand
  type: poke, resetBow
  data: string, item, BowDraugrFang
  poke: [{prefab: iron_grate, limit: 1, maxDistance: 5, delay: 1, parameter: openIronGate}]

- prefab: iron_grate
  type: poke, openIronGate
  data: int, state, -1
  poke: [{self: true, delay: 5, parameter: closeDoor}]
```
*Video: https://cdn.discordapp.com/attachments/1366022688275173550/1366023623416217630/mazeRoom2.mp4*

## Maze Room 2b — shared poke + Component usage

The `closeDoor` poke targets the **Door component**, not a specific prefab — so both `flametal_gate` and `iron_grate` answer the same call, same as a phone number any contact can share:

```yaml
- prefab: Door
  type: poke, closeDoor
  data: int, state, 0
```

## Maze Room 3a — poke loop + object state trigger

`delay:` is **compulsory** in a looped poke — without it the loop can crash the game. The torch counts down from 30 to 0 via a self-poke each cycle, using `<sub_<par_1>_1>` to decrement the passed value.

```yaml
- prefab: incinerator
  type: state, end
  poke: [{prefab: piece_groundtorch_blue, limit: 2, parameter: loopPokeTorchCharge 30}]

- prefab: piece_groundtorch_blue
  type: poke, loopPokeTorchCharge     # receives 30, 29, 28...
  spawn: [{prefab: fx_chainlightning_spread}]
  poke:
    - self: true
      delay: 1   # compulsory — smaller values risk breaking the game
      parameter: loopPokeTorchCharge <sub_<par_1>_1>

- prefab: piece_groundtorch_blue
  type: poke, loopPokeTorchCharge 0   # loop end condition
  weight: 1e30
  data: float, fuel, 0
```
*Video: https://cdn.discordapp.com/attachments/1366022688275173550/1366023767964254248/mazeRoom3.mp4*

## Maze Room 3b — `<parameter>` text value + itemstand button trigger

Text (not just numbers) can ride a parameter too — here the extracted item's prefab name itself is passed along to differentiate which poke fires:

```yaml
- prefab: MeadPoisonResist, SurtlingCore, MushroomBlue
  type: create
  objects: [{prefab: itemstandh, data: int, isCustomStand, 1, maxDistance: 2}]
  remove: true
  poke:
    - prefab: Placeable_HardRock
      parameter: changeRockyFace <prefab>   # passes the prefab name as text

- prefab: Placeable_HardRock
  type: poke, changeRockyFace
  fallback: true
  data: int, -1695026483, <randi_1_8>   # random face expression

- prefab: Placeable_HardRock
  type: poke, changeRockyFace MushroomBlue   # only when MushroomBlue was extracted
  weight: 1e30
  data: int, -1695026483, 0   # Rocky's big smiley face
```

## Maze Room 4 — invisible beehive as a "button"

A beehive tuned to be invisible/silent (near-zero cover/volume, no bee effect, broken visual) makes an excellent invisible interactable — swapping the "honey" item lets one beehive design serve as different triggers.

```yaml
- prefab: draugr_bow      # non-pickable object used as a fail-safe trigger
  type: create
  remove: true
  poke: [{prefab: piece_dvergr_metal_wall_2x2, limit: 2, maxDistance: 10, delay: 1, parameter: removeMetalWall}]

- prefab: piece_dvergr_metal_wall_2x2
  type: poke, removeMetalWall
  remove: true
```

```yaml
# data block making the beehive invisible/silent
- name: inviBeehive
  ints: [isInviBeehive 1, level 1, Beehive.m_maxHoney 0]
  floats:
    - WearNTear.m_health, -4
    - Beehive.m_maxCover, 1e-30   # compulsory to hide bee effect
    - Beehive.m_secPerUnit, 1e30
    - ZSFX.m_maxVol, 0            # silences the beehive
  strings:
    - Beehive.m_honeyItem, draugr_bow   # swap "honey" to any object as an identifier
    - Beehive.m_name, "<#FF0000>RUN FOR YOUR LIFE!</color><br>[E] Exit<size=0>"
```
*Video: https://cdn.discordapp.com/attachments/1366022688275173550/1366023954862444655/mazeRoom4.mp4*

## Extended Reading

**Poke with `target`** — like `self`, but refers to "someone else." Only works with `<zdo>`. Useful for streamlining poke chains without missing a call:

```yaml
- prefab: piece_beehive
  type: change, level 0 1
  filter: int, isInviBeehive, 1
  poke: [{prefab: piece_dvergr_metal_wall_2x2, delay: 1, parameter: removeMetalWall <zdo>}]

- prefab: piece_dvergr_metal_wall_2x2
  type: poke, removeMetalWall
  remove: true
  poke: [{target: <par_1>, parameter: replenishHoney}]   # <par_1> is the stored <zdo>

- prefab: piece_beehive
  type: poke, replenishHoney
  data: int, level, 1
```

**In-depth PARS guide** — Zeall links out to DhakhaR's separate guide covering `<par_1>`/`<par_2>` parameters in depth; it's a Discord thread link inside the original post rather than an external URL, so find "Guide to PARS" via the Extended Reading section of the original thread.
