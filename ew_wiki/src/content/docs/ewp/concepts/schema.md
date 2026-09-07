---
title: Schema
description: What "schema" means in EW Toolkit terms.
---

import { Tabs, TabItem } from '@astrojs/starlight/components';

A **schema** is a machine-readable definition of EWP's valid YAML keys, value types, and constraints, derived from Jere's source/docs, used to drive validation and autocomplete.

We avoid calling it a "spec" — that word is reserved for the toolkit's own planning specs, not EWP's structure.

<Tabs>
<TabItem label="Minimal example">

```yaml
- prefab: Boar
  type: spawn
  data: starter_boar
```

Every key here (`prefab`, `type`, `data`) and its expected value type is defined in the schema, so the validator can check this shape automatically.

</TabItem>
<TabItem label="Common mistake">

```yaml
- prefab: Boar
  type: spawn
  amount: "3"
```

`amount` expects a number, not a quoted string. The schema flags the type mismatch — this is structural validation, not a check against real game data.

</TabItem>
</Tabs>
