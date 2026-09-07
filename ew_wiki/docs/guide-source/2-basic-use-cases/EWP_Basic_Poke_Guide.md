# EWP Poke — Basic Guide

*Source: Zeall's "EWP Guide Series: Basic poke guide" (Valheim World Editing Discord, #guides). Credits to @DhakhaR for proof-reading/inputs.*

**Poke** connects one object to another — it's how information/instructions get sent from one prefab to another. It's one of the most powerful and essential actions in EWP (Expand World Prefabs).

## Fundamental

Minimal working example:

```yaml
- prefab: Player
  type: say, open
  poke:
    - prefab: wood_door
      parameter: openDoor

- prefab: wood_door
  type: poke, openDoor
  data: int, state, 1
```

Think of it like a phone call:

```yaml
# Part 1 — making the call
- prefab: Player
  type: say, open
  poke:                      # "making a call"
    - prefab: wood_door      # the contact you're calling
      parameter: openDoor    # the number you're dialing

# Part 2 — receiving the call
- prefab: wood_door
  type: poke, openDoor       # "wood_door" receives the call
  data: int, state, 1        # performs this action when it picks up
```

In plain English: when **Player** says "open" in chat, it pokes/calls **wood_door**. When **wood_door** receives that poke, it injects `int, state, 1` into itself.

*Demo video (in-game footage of this example): https://cdn.discordapp.com/attachments/1366020389905629264/1366021108788232255/Valheim_2025-04-27_18-49-59.mp4*

## Best Practices

### Properties
Full property list/definitions: see Jere's GitHub documentation.

`data:` under `poke:` acts as a **filter**, not as data being applied:

```yaml
poke:
  - prefab: wood_door
    data: int, isWoodDoor, 1   # pokes doors WHERE isWoodDoor == 1
    parameter: openDoor         # (does NOT set isWoodDoor on the door)
```

Since EWP v1.41.0, `filter:` can be used instead of `data:` under `poke:` (old syntax still works):

```yaml
poke:
  - prefab: wood_door
    filter: int, isWoodDoor, 1
    parameter: openDoor
```

### Format
Indentation and hyphens matter — check them carefully:

```yaml
# WRONG — bad indent
poke:
- prefab: wood_door
    parameter: openDoor

# WRONG — missing hyphen
poke:
  prefab: wood_door
  parameter: openDoor

# WRONG — bad indent on delay
poke:
  - prefab: wood_door
  delay: 1
    parameter: openDoor

# CORRECT
poke:
  - prefab: wood_door
    delay: 1
    parameter: openDoor
```

### Parameter
A parameter is just a name/word — the "phone number" linking a calling poke to its receiving poke. Name it after the poke's function for clarity (works with any string or number, but be descriptive):

```yaml
- prefab: Player
  type: say, open
  poke:
    - prefab: wood_door
      parameter: openDoor   # clear, descriptive name (preferred over "hello" or "123")

- prefab: wood_door
  type: poke, openDoor
  data: int, state, 1
```

### Wrong / Missing Poke
Common mistakes where the poke connection breaks:

```yaml
# Scenario 1 — mismatched parameter ("wrong number")
- prefab: Player
  type: say, open
  poke:
    - prefab: wood_door
      parameter: changeDoorState   # changed the number...

- prefab: wood_door
  type: poke, openDoor             # ...but receiver still listens on the old one
  data: int, state, 1              # → nothing happens

# Scenario 2 — missing receiver for a poke
- prefab: Player
  type: say, open
  poke:
    - prefab: wood_door
      parameter: openDoor

- prefab: wood_door
  type: poke, openDoor
  data: int, state, 1

- prefab: wood_door
  type: poke, closeDoor            # different parameter, no matching poke sends it
  data: int, state, 0              # → this entry never triggers
```

## Next Step
For deeper poke mechanics, see Zeall's "EWP Guide Series: Advanced poke guide" (same #guides channel).
