# Increase or Change Farming Drops

**Source:** Valheim World Editing Discord — `#config-share` forum
**Author:** Jere (VWE, Original Poster)
**Tags:** Data.yaml, Vanilla, EW Prefabs
**Posted:** October 28, 2023

Three small, standalone examples for tweaking pickable/farming resource yields (carrots, barley, flax, turnips) using Expand World Prefabs.

---

## 1. Increase Carrot Yield on Plains

Doubles the yield of carrots picked specifically in the Plains biome, and renames the item.

```yaml
- prefab: Pickable_Carrot
  data: plains_carrot
  biomes: Plains

- name: plains_carrot
  ints:
  # Double drops
  - Pickable.m_amount, 2
  strings:
  - Pickable.m_overrideName, Big Carrot
```

## 2. Random Chance for a Different Drop

Gives picking a carrot a small (1%) chance to instead yield a re-themed, re-skinned drop — here, a "Rotten Carrot" that actually gives Guck.

*(goes in `expand_prefabs.yaml`)*

```yaml
- prefab: Pickable_Carrot
  data: rotten
  # 1% chance
  weight: 0.01

- name: rotten_carrot
  strings:
  - Pickable.m_overrideName, Rotten Carrot
  - Pickable.m_itemPrefab, Guck
```

## 3. Better Yield Near Windmills

Doubles the pickable amount for Barley, Carrot, Flax, and Turnip, but only when picked within 50 meters of a windmill — with a 50% chance of the bonus applying.

*(goes in `expand_prefabs.yaml`)*

```yaml
- prefab: Pickable_Barley, Pickable_Carrot, Pickable_Flax, Pickable_Turnip
  weight: 0.5
  data: ints, Pickable.m_amount, 2
  # Only applies within 50 meters of a windmill
  objects: windmill
  objectDistance: 50
```
