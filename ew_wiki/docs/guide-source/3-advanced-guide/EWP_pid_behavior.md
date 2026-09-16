# `<pid>` Behavior Reference (Expand World / Valheim)

## Beehive
- Beehive carries creator `<pid>` if built
- Beehive carries spawning user `<pid>` if spawned
- HoneyItem remains same owner regardless of who extracted honey
- Beehive remains same owner regardless of who interacted

## ItemDrop
- `pickedUp: true` — ItemDrop carries the "thrower" `<pid>`; carries the new "thrower" `<pid>` if picked up
- `pickedUp: false` (inclusive of picking plants, etc.) — ItemDrop carries zone host `<pid>`

## Effects (FX)
- FX from character (e.g. `vfx_player_hit`, `vfx_perfectblock`; includes weapon hits, shield block, projectiles, building, planting) — carries the "creator" `<pid>` instead of zone host
- FX from character but DoT (e.g. `vfx_Burning`, `vfx_Poison`, `vfx_UndeadBurn`) — belongs to zone host
- FX from build pieces (tested: Ward, ItemStand, Fireplace; e.g. `fx_guardstone_activation`, `vfx_addfuel`) — if freshly built, belongs to the creator; otherwise always zone host. Excludes Container/MapTable.
- FX from Container, Tameable Petting, MapTable Recording, Crafting Station (e.g. `sfx_chest_close`, `fx_wolf_pet`, `sfx_gui_*`) — belongs to the user `<pid>`
- FX from Eating — Consumables/Meads (`sfx_eat`): belongs to the eater. Feast: generates 2 identical FX, one belongs to the build piece (zone host), one to the eater.
- FX from Pickables — belongs to zone host

## Container
- Fresh built belongs to "creator"
- Ownership changes on use (open/close transfers to "user")
- Stays with that user until they leave the zone, then transfers to zone host (if applicable)

## Sign
- Sign carries the "user" `<pid>` — whoever changed the text owns the sign

## Tameable
- Riding: overrides ownership; change-name interaction ownership belongs to the rider after riding
- Commanding/Follows: does not override ownership; change-name interaction ownership belongs to zone host

## Boss Altar
- Altar Summon: boss always carries zone host `<pid>`; VFX/SFX spawning carries altar user `<pid>`
- Offering Summon: boss always carries zone host `<pid>`; VFX/SFX "inserting" carries itemstand user `<pid>`

## Creature
- `type: destroy` — dead creature carries zone host `<pid>`
- Ragdoll — creature ragdoll carries zone host `<pid>`

## Smelter
- Smelter production ingots all belong to zone host

## Battering Ram / Catapult
- Object owned by driver `<pid>`
- FX owned by user (`fx_batteringram_fire`, `sfx_battering_ram_anticipation`, `fx_siegebomb_explosion`, `vfx_catapult_load`, `sfx_catapult_ammo_load`)

## Rock Frac
- Object owned by zone host
- Fresh frac created owned by zone host
- Frac destroyal owned by zone host
- Rock hit FX owned by zone host
- Stone drop owned by zone host
