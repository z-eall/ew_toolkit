---
title: Scripter
description: Who a scripter is, in EW Toolkit terms.
---

import { Tabs, TabItem } from '@astrojs/starlight/components';

A **scripter** is a Valheim player/modder who writes EWP YAML to build custom in-game systems or content, without necessarily writing C# mod code.

We avoid calling a scripter a "user" (ambiguous with tool end-users generally) or a "modder" (implies C# code authorship) — a scripter's whole toolkit is YAML.

<Tabs>
<TabItem label="Minimal example">

```yaml
- prefab: Boar
  type: spawn
  data: starter_boar
```

A single rule entry: no C# involved, just YAML a scripter wrote directly.

</TabItem>
<TabItem label="Common mistake">

```yaml
- prefab: Boar
  Type: spawn
  data: starter_boar
```

`Type` is capitalized — EWP keys are case-sensitive, so this silently fails to match the expected `type` key. A schema-aware validator catches this before it reaches the game.

</TabItem>
</Tabs>
