# EWP — Guide to PARS (`<par_1>`, `<par_2>`, `<rest_1>`, etc.)

*Source: DhakhaR's "Guide to PARS" (Valheim World Editing Discord, #guides). Part 2 (poke pars) is reserved/not yet written by the author as of this writing — this covers **Part 1: non-poke pars** only. Assumes familiarity with poke — see the companion [Basic poke guide](./EWP_Basic_Poke_Guide.md).*

## What is a par?

A **par** can be any piece of information — that's what makes it powerful but tricky. Pars let you reference or send information from one place to another. When you see a par in a script, you're looking at the **receiving end** — you have to trace it backwards to find where it came from.

- `<par_1>` = the first piece of information received
- `<par_5>` = the fifth piece of information received

Pars fall into two groups: **poke** and **non-poke** (poke pars are more confusing — covered in the not-yet-written Part 2). Non-poke pars apply to types: `change`, `state`, `say`, `globalKey`, `key`, `event`, `time` — here the par relates to whatever triggered that type.

## Non-Poke Examples

Shout the first thing said after "test1":

```yaml
- prefab: Player
  type: say, test1
  command: s <par_0>
```

Shout only the very first word of *anything* said:

```yaml
- prefab: Player
  type: say, *
  command: s <par_0>
```

Shout the first four words said:

```yaml
- prefab: Player
  type: say, *
  command: s <par_0> <par_1> <par_2> <par_3>
```

But what if more than four things are said? Use `<rest_0>` to grab the first word **and everything after it** — ideal when you can't be sure how much information there will be. `rest` and `par` otherwise work the same way, so `<rest_3>` = the fourth piece of information and everything afterward:

```yaml
- prefab: Player
  type: say, *
  command: s <rest_0>
```

### Non-`say` example: health change

For `type: change, health` — the first par is health *after* the change, the second par is health *before* the change:

```yaml
- prefab: woodwall
  type: change, health
  command: s <par_1> <par_2>
```
Hitting a fresh wall (400 hp) for 80 damage shouts `"320 400"`.

Use pars in a math function to calculate the actual damage done:

```yaml
- prefab: woodwall
  type: change, health
  command: s <sub_<par_2>_<par_1>>
```
Same hit shouts `"80"`. Or, formatted nicer:

```yaml
- prefab: woodwall
  type: change, health
  command: s The wall had <par_2> health, but took <sub_<par_2>_<par_1>> damage and now has <par_1> health
```

Each `type:` exposes different par information — DhakhaR suggests building a quick test example like these to investigate what's available for any given type.

## Pars in `data:`

Store the damage calculation from above directly into the wall's data for later reference:

```yaml
- prefab: woodwall
  type: change, health
  data: float, lastDamageTaken, <sub_<par_2>_<par_1>>
```

Same thing works via a referenced data yaml:

```yaml
- prefab: woodwall
  type: change, health
  data: saveLastDamage

- name: saveLastDamage
  floats:
    - lastDamageTaken, <sub_<par_2>_<par_1>>
```

*— end of Part 1. Part 2 (poke pars) is reserved by the author; check the original thread later for updates.*
