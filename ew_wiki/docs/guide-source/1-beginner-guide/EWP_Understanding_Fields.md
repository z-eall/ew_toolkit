# START HERE: How to Understand FIELDS (f=)

*Source: DhakhaR's guide (DhakhaR's Forge World Discord, #valheim-how-to-and-help).*

Every object in the game has fields that make it do whatever it's meant to do — doors/gates have Door fields, fireplaces/torches have Fireplace fields, portals have TeleportWorld fields, and so on. Some of these values can be manipulated to create new functions/mechanics or change existing behavior.

Most objects have more than one group of fields — these groups are called **Components**. A portal, for example, has: the **Piece** component (fields relating to buildable pieces), the **WearNTear** component (fields relating to objects that degrade/take damage), and the **TeleportWorld** component (fields relating to teleporting).

## Discovering Components & Fields (step-by-step)

Using a portal as the example object:

1. Start typing `spawn_object portal_wood f=` — after `f=`, autocomplete shows all available Component options (press **Tab** to cycle through them).
2. Pick the Component that interests you, followed by a comma. For portals, that's `TeleportWorld` (it's what makes portals do portal things):
   ```
   spawn_object portal_wood f=TeleportWorld,
   ```
3. Autocomplete now shows all fields within `TeleportWorld` (Tab to cycle). Some are self-explanatory — e.g. `allowAllItems` controls whether the portal allows all items. Many field names aren't obvious, so trial and error is part of the process. Example: `activationDistance`:
   ```
   spawn_object portal_wood f=TeleportWorld,activationDistance,
   ```
4. Autocomplete suggests the expected value type (e.g. `Number` for a distance field). Completed entry:
   ```
   spawn_object portal_wood f=TeleportWorld,activationDistance,10
   ```
   This creates a portal that turns on its activation animation when players are within 10m.

You can chain multiple field entries on one object:
```
spawn_object portal_wood f=TeleportWorld,activationDistance,10 f=TeleportWorld,allowAllItems,true f=WearNTear,health,300
```

**Editing an existing object** (already placed in the world): hover over it and use `object f=...` in the same format. It's more user-friendly to first work out the field/value you want via the `spawn_object` autocomplete, then apply it to the existing object with `object f=`.

## Finding which objects have a given Component

Once you've found an interesting Component, you might ask "which other objects have this?"

```
search_component object Door
```
Lists all objects containing the Door component. Example result:
`ashwood_door, darkwood_gate, dungeon_forestcrypt_door, dungeon_queen_door, dungeon_sunkencrypt_irongate, dvergrtown_secretdoor, dvergrtown_slidingdoor, flametal_gate, iron_grate, MountainKit_wood_gate, piece_dvergr_wood_door, piece_hexagonal_door, sunken_crypt_gate, wood_door, wood_gate, wood_window`

```
search_component location Door
```
Same idea, but searches **locations** instead of objects. Example result:
`Ruin2, WoodHouse1, WoodHouse2, WoodHouse11, WoodHouse12, WoodHouse13, SunkenCrypt4, SwampHut1, SwampHut2, SwampHut3, SwampHut4, SwampHut5, AbandonedLogCabin02, AbandonedLogCabin03, AbandonedLogCabin04, DevHouse2, DevHouse3, DevHouse4, Mistlands_GuardTower1_new, Mistlands_GuardTower1_ruined_new2, Mistlands_GuardTower2_new, Mistlands_GuardTower3_new, Mistlands_GuardTower3_ruined_new, Mistlands_Lighthouse1_new, Mistlands_Harbour1, Mistlands_DvergrBossEntrance1`

## Getting Help

Valheim World Editing Discord — friendly hideout for world-edit wizards: https://discord.gg/2FYtfrgWXK
