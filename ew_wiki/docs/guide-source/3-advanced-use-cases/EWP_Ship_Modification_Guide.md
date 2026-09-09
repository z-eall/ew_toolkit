# Taming the Waves: A Guide to Valheim Ship Modification

*Source: Leftaf (UTC+13)'s guide (Valheim World Editing Discord, #guides).*

Covers all the field definitions for customizing a ship, and how to tune them to your liking.

## Pre-setup (required)

Copy this script + data into your EWP folder first — you'll need it throughout, to flip a stuck ship back upright:

```yaml
# Original script from Raaka
- prefab: Player
  type: say, flip
  poke:
    - prefab: Ship
      limit: 1
      maxDistance: 10
      parameter: flipit

- prefab: Ship
  type: poke, flipit
  data: flipper

# Data
- name: flipper
  rotation: <a>,0,0
```

## Fields Definition

Using a Karve as the example — extracted from its data dump (all values below are the **defaults**):

```yaml
- name: karveDataDump
  ints:
    - Container.m_width, 2      # storage size on ship
    - Container.m_height, 2
  floats:
    - Ship.m_sailForceFactor, 0.03      # sailing speed with sail on
    - Ship.m_backwardForce, 0.2         # rudder-driven speed (steering)
    - Ship.m_stearForce, 0.2            # how quickly ship reacts to speed/steering changes
    - Ship.m_sailForceOffset, 1
    - Ship.m_stearForceOffset, -3.5
    - Ship.m_stearVelForceFactor, 0.18
    - Ship.m_rudderSpeed, 1             # how quickly rudder reaches max angle
    - Ship.m_rudderRotationMax, 45      # max rotation angle of rudder
    - GlobalWind.m_multiplier, 100      # how much wind boosts sailing speed
    - health, 500                       # current health
    - WearNTear.m_health, 500           # max health
    - Ship.m_waterLevelOffset, 1.2      # resting position on water surface
    - Ship.m_force, 1                   # force applied to the ship
    - Ship.m_forceDistance, 2           # multiplier for force application
    - Ship.m_damping, 0.05              # damping = movement/external-force response
    - Ship.m_dampingSideway, 0.15
    - Ship.m_dampingForward, 0.001
    - Ship.m_angularDamping, 0.05
  strings:
    - Container.m_name, Storage
    - Ladder.m_name, $piece_ship_ladder
    - Chair.m_name, $piece_stool
    - ShipControlls.m_hoverText, $piece_ship_rudder
```

Notes on the key fields:

- **`Container.m_width`/`m_height`** — same as any chest build piece; changes the size of the ship's storage.
- **`Ship.m_sailForceFactor`** — makes the Karve faster. ~0.225 is already the max value for a Karve at full sail. Higher = harder to control, and you'll need to flip it more often.
- **`Ship.m_backwardForce`** — makes the boat faster via the rudder alone, even without the sail. Setting it to 1 makes a big difference — also applies to forward movement.
- **`GlobalWind.m_multiplier`** — a percentage; try 150 or 200 to speed the ship up with wind. As admin, `env wind` (0 = no wind, 1 = storm) lets you watch the waves and ship react.
- **`Ship.m_damping` / `m_dampingSideway` / `m_dampingForward` / `m_angularDamping`** — control agility and stability. Lower = less damping. Smaller, agile ships want smaller values; larger, heavier vessels want values closer to 1 so they don't feel like they're "self-driving." Recommended: keep `Ship.m_dampingForward` low (~0.001) for most ships, and avoid setting any damping value to exactly 0.

## Usage Examples

**Fast Agile Karve**
```yaml
- name: fasterKarve
  floats:
    - Ship.m_force, 1
    - Ship.m_forceDistance, 2
    - Ship.m_damping, 0.05
    - Ship.m_dampingSideway, 0.15
    - Ship.m_dampingForward, 0.001
    - Ship.m_angularDamping, 0.05
```

**Tanker Hauling Karve**
```yaml
- name: tankerKarve
  ints:
    - Container.m_height, 4
    - Container.m_width, 8
  floats:
    - health, 5000
    - WearNTear.m_health, 5000
    - Ship.m_forceDistance, 3
    - Ship.m_force, 1
    - Ship.m_damping, 0.1
    - Ship.m_dampingSideway, 0.5
    - Ship.m_dampingForward, 0.002
    - Ship.m_angularDamping, 0.95
```

**Bouncy "Catamaran" Speedy Karve** *(requires good sailing skill!)*
```yaml
- name: bouncyKarve
  floats:
    - Ship.m_force, 2
    - Ship.m_forceDistance, 1
    - Ship.m_damping, 0.1
    - Ship.m_dampingSideway, 0.6
    - Ship.m_dampingForward, 0.005
    - Ship.m_angularDamping, 0.1
  strings:
    - Container.m_name, "<br><pname>s empowered Karve<br><br><size=17>Unmatched Speed"
    - ShipControlls.m_hoverText, "<pname>s Ships wheel"
    - Chair.m_name, Thrill and splash guaranteed!
    - Ladder.m_name, "Climb on <pname>s Karve"
```
