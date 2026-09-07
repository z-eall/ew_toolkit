# Simple Example for Changing Skeleton Loots and Removing the Normal Drops

**Source:** Valheim World Editing Discord — `#config-share` forum
**Author:** Raaka (VWE, Original Poster)
**Tags:** Vanilla, EW Prefabs
**Posted:** September 26, 2024 (with follow-up Q&A through October 1, 2024)

> This is the companion technique referenced from the [Ragdoll Creature Drop Customization guide](#) for creatures that **do not have a ragdoll** on death (e.g. Skeleton) — the ragdoll-removal trick doesn't apply to them, so a different, simpler method is used instead.

---

## The Core Trick

A handy way to remove loot from monsters that **don't have ragdolls**: since they have no ragdoll to intercept, you instead swap their drop to an "empty" one that despawns without dropping anything — by launching the original drop 10,000 meters into the sky and auto-deleting any item drop found that high up.

### data.yaml

```yaml
# Changes the loot to drop at 10000 meters above the normal point.
- name: DropOffset
  vecs:
  - CharacterDrop.m_spawnOffset, 0,0,10000

# Data for 5 item stack.
- name: CoinStack5
  ints:
  - stack, 5
```

### prefab (script) config

```yaml
# Skeleton is created, loads DropOffset data to it.
- prefab: Skeleton
  type: create
  data: DropOffset

# Skeleton is killed, spawns Coins with the 5 item stack data.
- prefab: Skeleton
  type: destroy
  spawn:
  - prefab: Coins
    data: CoinStack5

# Any itemdrop created above 9000y altitude is instantly removed.
- prefab: ItemDrop
  type: create
  minY: 9000
  remove: true
```

**How it works:**
1. When a Skeleton spawns, it's tagged with `DropOffset`, which shifts its normal death-drop spawn point 10,000 meters straight up.
2. When the Skeleton dies, its original loot flies up to that extreme altitude — and separately, a fresh `Coins` drop (using the `CoinStack5` data, a 5-item stack) spawns normally at ground level as the new loot.
3. A catch-all rule watches for any `ItemDrop` created above 9000y and instantly removes it — deleting the original vanilla loot before it can ever be seen or picked up.

As one commenter put it: *"I love that it just yeets the item into the void up high."*

---

## Follow-up: Varying Drops by Creature Star Level

**Q (SaGarren):** "Is there a way to change the drop by level of creature?"

**A (Raaka):** Yes — filter by star level using `data` on the prefab entry:

```yaml
filter: int, level, 3
```

(Note: in-game star level is 0-indexed in the filter — `level, 1` = 0-star, `level, 2` = 1-star/"2 star" as commonly described, etc. See the worked example below for exact behavior.)

### Simple Example (Neck, by level)

```yaml
- prefab: Neck
  type: destroy
  filter: int, level, 1
  spawn:
  - prefab: Coins

- prefab: Neck
  type: destroy
  filter: int, level, 2
  spawn:
  - prefab: Amber

- prefab: Neck
  type: destroy
  filter: int, level, 3
  spawn:
  - prefab: AmberPearl
```

Result: killing a 0-star Neck drops 1 Coin, a 1-star Neck drops Amber, and a 2-star Neck drops an Amber Pearl.

### Adding Stack Amounts

Define reusable stack sizes in `config/data/data.yaml`:

```yaml
- name: Stack3
  ints:
  - stack, 3

- name: Stack5
  ints:
  - stack, 5
```

Then reference them per level:

```yaml
- prefab: Neck
  type: destroy
  filter: int, level, 1
  spawn:
  - prefab: Coins
    data: Stack5

- prefab: Neck
  type: destroy
  filter: int, level, 2
  spawn:
  - prefab: Amber
    data: Stack3

- prefab: Neck
  type: destroy
  filter: int, level, 3
  spawn:
  - prefab: AmberPearl
    data: Stack5
```

---

## Notes

- This method is best suited to creatures **without ragdolls** — for ragdoll-based creatures (Deer, Boar, Wolf, etc.), the more involved ragdoll-interception technique in the companion "Loot Drop Customization for Ragdoll Creatures" guide is the recommended approach instead.
- The "launch it into the void and delete anything above 9000y" trick is a simple, general-purpose way to suppress a vanilla drop without needing `drops: false` (which doesn't work reliably here).
