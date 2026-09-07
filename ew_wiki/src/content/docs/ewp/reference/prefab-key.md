---
title: "Reference: prefab key"
description: Exhaustive reference entry for the top-level prefab key, generated-from-schema style.
---

One representative entry from the Reference section, in the "every key, every type, every constraint" style the full section would use — generated from the same schema the validator enforces, so wiki and validator can never drift apart.

## `prefab`

| | |
|---|---|
| **Applies to** | EWP rule entry |
| **Type** | `string` |
| **Required** | Yes |
| **Constraint** | Must name a prefab EWP/WEC/vanilla Valheim recognizes |

The prefab this rule entry spawns, replaces, or otherwise targets.

```yaml
- prefab: Boar
  type: spawn
```

An unrecognized `prefab` value isn't structurally invalid on its own — the schema can't check it against real game data (see [Concepts → Schema](/concepts/schema/), "structural validation" vs. "data-aware autocomplete"). The validator flags it only if a later, data-aware check is available.

A full Reference section would carry one entry like this per key, cross-linked by which entry shape (EWP rule entry / WEC data entry / value entry / value group) uses it.
