# EWP — Maths / Number-Related Functions

*Source: DhakhaR's "Maths with EWP 'Number related functions'" (Valheim World Editing Discord, #guides).*

Examples and ideas using number-related functions. Each `<function_X_Y>` is used inline in scripts (commands, data, parameters, etc.).

## Basic

| Function | Returns | Example |
|---|---|---|
| `<abs_X>` | absolute value of X | -3 → 3, -9 → 9 |
| `<add_X_Y>` | sum of X and Y | 3, 5 → 8 |
| `<sub_X_Y>` | difference of X and Y | 9, 3 → 6 |
| `<mul_X_Y>` | product of X and Y | 2.5, 10 → 25 |
| `<div_X_Y>` | quotient of X and Y | 10, 5 → 2 · 6, 2 → 3 |
| `<mod_X_Y>` | remainder of X ÷ Y | 4, 2 → 0 · 4, 1.9 → 0.2 |

For longs (e.g. `<tick>`), prefer the long-specific variants — same behavior as their non-long counterparts: `<addlong_X_Y>`, `<divlong_X_Y>`, `<modlong_X_Y>`, `<mullong_X_Y>`, `<sublong_X_Y>`. Or wrap a regular function with `<calclong_X>`, e.g. `<calclong_<add_<tick>_<tick>>>`.

## Powers

- `<pow_X_Y>` — X raised to power Y (reverse of `log_X_Y`). 10, 3 → 1000 · 2, 2 → 4
- `<sqrt_X>` — square root of X. 4 → 2 · 100 → 10
- `<log_X_Y>` — logarithm of X, base Y (reverse of `pow_X_Y`). 1000, 10 → 3
- `<log_X>` — natural log of X. 1 → 0 · 2 → 0.6931 (used in exponential math)
- `<exp_X>` — e raised to power X (reverse of `log_X`). 0.6931 → 2

Useful for visualizing logs: https://www.desmos.com/calculator/auubsajefh

## Rounding

- `<ceil_X>` — smallest integer ≥ X. 10.1 → 11
- `<floor_X>` — largest integer ≤ X. 5.7 → 5
- `<round_X>` — nearest integer to X. 10.3 → 10 · 10.6 → 11

## Random

- `<randf_X_Y>` — random decimal between X and Y (up to 6 decimal places), never reaching Y. 1, 5 → e.g. 2.324552
- `<randi_X_Y>` — random integer between X and Y, never reaching Y. 1, 44 → e.g. 12

## Picking

- `<max_X_Y>` — larger of X and Y. 10, 29 → 29
- `<min_X_Y>` — smaller of X and Y. 14, 5 → 5

## Angles

`<asin_X>`, `<acos_X>`, `<atan_X>`, `<atan_X_Y>` (arctan of X/Y), `<sin_X>`, `<cos_X>`, `<tan_X>`.

To convert degrees → radians, multiply by π/180, i.e. `<mul_<a>_0.0174533>`:
```
<sin_<mul_<par_1>_0.0174533>>
<tan_<mul_<par_1>_0.0174533>>
```

## Tips and Tricks

**Nesting** — X or Y can be a number, a parameter (`<day>`, `<par_1>`), a data.yaml value, or another function:
```
<add_6_4>                          # = 10
<add_5_<add_6_4>>                  # = 15
<add_<add_2_3>_<add_6_4>>          # = 15 (2+3+6+4)
```

**Decimal places** — `round`/`floor`/`ceil` only give whole numbers. To keep N decimal places: multiply by 10^N, round, then multiply by 10^-N. Example reducing `<div_22_7>` (3.142857...) to 2 decimal places:
```
<mul_100_<div_22_7>>                              # step 1: shift
<round_<mul_100_<div_22_7>>>                       # step 2: round
<mul_0.01_<round_<mul_100_<div_22_7>>>>            # step 3: shift back → 3.14
```
```yaml
- prefab: Player
  type: say, deci
  command: s <mul_0.01_<round_<mul_100_<div_22_7>>>>
```

**Toggle** — `<abs_<sub_<VALUE>_1>>` flips a 1 to a 0 and a 0 to a 1, without needing extra filters. Examples:
```yaml
# toggle a saved key
- prefab: Player
  type: say, togglekey!
  exec: <save_testkey_<abs_<sub_<load_testkey=0>_1>>>
  command: s test key = <load_testkey=0>
```
```yaml
# toggle a ward on/off
- prefab: Player
  type: say, toggleward!
  poke: [{prefab: guard_stone, parameter: toggleWard, maxDistance: 10}]

- prefab: guard_stone
  type: poke, toggleWard
  data: int, enabled, <abs_<sub_<int_enabled>_1>>
```

**Matcher** — formula for 2-team scripts, where `<par_1>` (1 or 2) is the incoming state and `<int_team>` (1 or 2) is what an object belongs to:

`<add_1_<abs_<sub_<par_1>_<int_team>>>>` → returns 1 if they match, 2 if they don't.

```yaml
# credit: Zeall
- type: key, teambell
  poke:
    - prefab: dverger_guardstone
      filter: int, isBaseWarCastleWard, 1;2
      limit: 2
      maxDistance: 20000
      parameter: changeCastleWardStatus <par_1>

- prefab: dverger_guardstone
  type: poke, changeCastleWardStatus
  data: isBaseWarCastleWardStatus<add_1_<abs_<sub_<par_1>_<int_isBaseWarCastleWard>>>>
```

## Weighted Random & Advantage Rolling

**Weighted random** — adding two random rolls together weights the result toward the middle of the range (like two dice most often summing to 7), instead of an even spread:
```
<randi_1_13>                          # flat, equal chance 1-12
<add_<randi_1_7>_<randi_1_7>>         # weighted toward the average (2-12)
```

**Advantage/disadvantage rolling** (from D&D) — take the higher (`<max_`) or lower (`<min_`) of two rolls:
```
advantage d6:      <max_<randi_1_7>_<randi_1_7>>
disadvantage d6:   <min_<randi_1_7>_<randi_1_7>>
advantage d10:     <max_<randi_1_11>_<randi_1_11>>
disadvantage d10:  <min_<randi_1_11>_<randi_1_11>>
advantage d20:     <max_<randi_1_21>_<randi_1_21>>
disadvantage d20:  <min_<randi_1_21>_<randi_1_21>>
advantage d100:    <max_<randi_1_101>_<randi_1_101>>
disadvantage d100: <min_<randi_1_101>_<randi_1_101>>
```

## Triangle Distance Finder

Quickly finds the distance to something X,Z away — useful e.g. for setting an accurate `maxDistance`. If a script spawns a `wood_pole` 5m right / 10m forward:
```yaml
- prefab: Player
  type: say, spawn pole
  spawn: [{prefab: wood_pole, pos: 5,10,0}]
```
Saying `!triangle 5 10` calculates the straight-line distance via Pythagoras:
```yaml
- prefab: Player
  type: say, !triangle * *
  command: s distance is <sqrt_<add_<pow_<par_1>_2>_<pow_<par_2>_2>>>m
```
Result: `11.18m`. (The thread includes an animated screenshot proving this in-game with a few more example rolls — 3,3 → 4.24m; 2,2 → 2.83m.)

## Polygon Radius Calculator

Posted as a follow-up (June 2026) — "useful for building smooth circles" — but the content lives in the server's **#chat** channel via a jump-link rather than in this guide thread, so it wasn't captured here. Check the original #guides thread's link to #chat for that one.
