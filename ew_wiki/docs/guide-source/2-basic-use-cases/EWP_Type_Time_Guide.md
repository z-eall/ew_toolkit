# EWP Guide Series: How to Use `type: time`

*Source: Zeall's guide (Valheim World Editing Discord, #guides).*

## Syntax

```yaml
- type: time, tick TICKS
- type: time, minute MINUTES HOURS DAYS
- type: time, hour HOURS DAYS
- type: time, day DAYS
```

There's no "seconds" unit because Valheim itself has no seconds in-game — everything references **in-game time units**:

| In-game Time | Real-Time Equivalent |
|---|---|
| 1 tick | 0.0000001 second |
| 1 minute | 1.25 seconds |
| 1 hour | 1 minute 15 seconds |
| 1 day | 30 minutes |

## Fundamental

`type: time` works like the familiar `type: change` — e.g. `type: change, health 25` reads as "when a Player's health changes to 25, spawn vfx_spawn." Applying that same logic to time:

**`type: time, tick`** — with no parameter specified, it triggers on every single tick:
```yaml
- type: time, tick
  command: s Hello
```

**`type: time, minute`** — a comma checks multiple values:
```yaml
# Fires when "minute" changes to 0 or 30 (~every 30s realtime)
- type: time, minute 0,30
  command: s Hello
```

**`type: time, hour`** — syntax is `type: time, hour HOURS DAYS`, so `<par_1>` = hour, `<par_2>` = day. A semicolon `;` specifies a range:
```yaml
# ONLY on day 800, fires when "hour" is in range 0–23 (~every 1 min realtime, "ON DAY 800")
- type: time, hour 0;23 800
  command: s Hello
```

**`type: time, day`** — supports the `*` wildcard, and you can reference the triggering value via parameter:
```yaml
# Fires when the day number ends in 5 (5,15,25,35...9995...)
- type: time, day *5
  command: s Hello, today is day <par_1>
```

## Usage Example: Double Loot on Every 10th Day

```yaml
# Set the world modifier keys every 10th day
- type: time, day *0   # 10,20,30,...1000...
  commands:
    - s Today is the double day!
    - setkey ResourceRate 200

# Reset the keys on the other days
- type: time, day
  fallback: true   # Fallback skips this entry on all 10th days
  commands:
    - removekey ResourceRate
```

## Usage Example: Rewarding Online Time

Giving out a maximum of 10 coins to a Player who stayed online for 1 in-game day.

```yaml
# Section 1 — every in-game hour a player stays online, they get 1 point in data
- type: time, hour
  poke:
    - prefab: Player
      maxDistance: 20000
      parameter: gainOnlinePoint

- prefab: Player
  type: poke, gainOnlinePoint
  exec: <save++_<long_playerID>onlinePoint>

# Section 2 — detect and act on every new in-game day
- type: time, day
  poke:
    - prefab: Player
      maxDistance: 20000
      parameter: checkPortal

# Portal check avoids the script firing mid-teleport
- prefab: Player
  type: poke, checkPortal
  objects: [TeleportWorld, 5]
  poke:
    - self: true
      delay: 3   # retry after 3 sec if a portal is detected
      parameter: checkPortal

# Directly spawning coins risks them not being picked up if the player is moving,
# so instead spawn a hidden chest and RPC the coins straight into the player's inventory
- prefab: Player
  type: poke, checkPortal
  fallback: true
  keys: <long_playerID>onlinePoint
  bannedObjects: [TeleportWorld, 5]
  spawn:
    - prefab: piece_chest_wood
      data: giftChest   # chest data carrying coins (see data file below)
      pos: 0,0,-100
      triggerRules: true
    - prefab: fx_BonusYield
      pos: 0,0,2
  poke:
    - prefab: piece_chest_wood
      data: long, giftChestMatchID, <long_playerID>
      limit: 1
      maxDistance: 20000
      delay: 0.1
      parameter: retrieveCoins <long_playerID> <zdo>

# Poke the chest and RPC the player to "take" the coins
- prefab: piece_chest_wood
  type: poke, retrieveCoins
  filter: long, giftChestMatchID, <par_1>   # ensures poking the right chest
  remove: true
  removeDelay: 1
  objectRpc:
    - name: RequestTakeAll
      source: <zdo>
      1: long, <par_1>
  poke:
    - target: <par_2>
      delay: 1
      parameter: resetOnlinePoint

# Ending poke — resets the online point counter
- prefab: Player
  type: poke, resetOnlinePoint
  exec: <clear_<long_playerID>onlinePoint>
```

**Data file** (referenced as `data: giftChest` above):
```yaml
- name: giftChest
  ints:
    - isGiftChest, 1
  longs:
    - giftChestMatchID, <long_playerID>
  items:
    - prefab: Coins
      # Load the online point value, capped at 10
      stack: <min_10_<load_<long_playerID>onlinePoint=0>>
```

## Community Addenda

**Tracking total play time** (posted by DhakhaR as a follow-up, "updated to modern formatting"):
```yaml
- prefab: Player
  type: say, startplaying
  exec: <save_startedplaying<long_playerID>_<time>>
  bannedKeys: startedplaying<long_playerID>

- prefab: Player
  types: [say, played?]
  cancel: true
  objectRpc:
    - name: Message
      target: <zdo>
      1: enum_message, 1
      2: string, "You have played for <floor_<div_<round_<sub_<time>_<load_startedplaying<long_playerID>=<time>>>>_86400>> days, <sub_<floor_<div_<round_<sub_<time>_<load_startedplaying<long_playerID>=<time>>>>_3600>>_<mul_<floor_<div_<round_<sub_<time>_<load_startedplaying<long_playerID>=<time>>>>_86400>>_24>> hours, <sub_<floor_<div_<round_<sub_<time>_<load_startedplaying<long_playerID>=<time>>>>_60>>_<mul_<floor_<div_<round_<sub_<time>_<load_startedplaying<long_playerID>=<time>>>>_3600>>_60>> minutes and <mod_<round_<sub_<time>_<load_startedplaying<long_playerID>=<time>>>>_60> seconds"
      3: int, 0
```
A simplified variant just for converting a raw `<time>` value (untested by the author):
```
You have played for <floor_<div_<round_<time>>_86400>> days, <sub_<floor_<div_<round_<time>>_3600>>_<mul_<floor_<div_<round_<time>>_86400>>_24>> hours, <sub_<floor_<div_<round_<time>>_60>>_<mul_<floor_<div_<round_<time>>_3600>>_60>> minutes and <mod_<round_<time>>_60> seconds
```
Per Zeall: this can be made automatic by using `type: time` to poke the player directly — since the poke only fires while a player is online, the counter naturally only increases during actual online time (with an adjusted formula).

**Setting a custom day/night globalkey** (posted by Raaka, in response to a question about environment triggers — `type: time` and `environment:` don't interact directly, but a script can set globalkeys that an `expand_environments.yaml` entry then reads):
```yaml
- type: time, minute 24 20
  commands:
    - setkey isnight
    - removekey isday

- type: time, minute 36 3
  commands:
    - setkey isday
    - removekey isnight
```
This sets `isnight` at in-game 20:24 and `isday` at 3:36 — the vanilla day/night transition times (day is ~21 minutes real-time, night ~9 minutes). Note from the thread: as of Feb 2026, one user reported their environment wasn't respecting these globalkeys in practice — this pattern is unconfirmed/unresolved as a full night-environment trigger.
