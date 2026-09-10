# EWP Guide Series: How to Use `type: realtime`

*Source: Zeall's guide (Valheim World Editing Discord, #guides). Assumes familiarity with `type: time` — see the companion [type: time guide](./EWP_Type_Time_Guide.md) first if needed.*

## Syntax

```yaml
- type: realtime, second [unixEpochTimestamp]
- type: realtime, minute [minute] [hour] [dayOfYear]
- type: realtime, hour [hour] [dayOfYear]
- type: realtime, day [dayOfYear]
```

## Fundamental

**`type: realtime, second`** — fires whenever the real-world second changes:
```yaml
- type: realtime, second [unixEpochTimestamp]
  command: s Changed <par>
```
Result: `Changed second 1777867434`, `Changed second 1777867435`, `1777867436`... etc.

**`type: realtime, minute`** — fires whenever the real-world minute changes. `minute`/`hour`/`day` all rely on the **server's timezone**:
```yaml
- type: realtime, minute [minute] [hour] [dayOfYear]
  command: s Changed <par>
```
Result: `Changed minute 33 10 124`, `34 10 124`, `35 10 124`... — the first number is the minute, the second is the current hour (server timezone), the third is the day-of-year. Example: May 4, 2026 → Jan(31)+Feb(28)+Mar(31)+Apr(30)+4 = day **124**.

**`type: realtime, hour`** — fires whenever the real-world hour changes. `<par>` can be broken into individual components:
```yaml
- type: realtime, hour [hour] [dayOfYear]
  command: s Changed <par_0> <par_1> <par_2>
```
Result: `Changed hour 10 124`, `hour 11 124`, `hour 12 124`... — `<par_0>` gives the string label (e.g. "hour"), `<par_1>` the hour value, `<par_2>` the day-of-year value.

**`type: realtime, day`** — fires whenever the real-world day changes:
```yaml
- type: realtime, day [dayOfYear]
  command: s Today is <realtime_dddd>.
```
Result: `Today is Monday.` ... `Today is Tuesday.` etc.

> **Correction (from thread comments):** the day example above was originally posted with a copy-paste typo as `type: realtime, hour [dayOfYear]` — it should read `type: realtime, day [dayOfYear]` as shown here.

## Functions / Parameter Use of `<realtime>`

Per Jere's GitHub documentation:

- **`<realtime>`** — seconds since Unix epoch (Jan 1, 1970), UTC, as a `long`.
- **`<realtime_X>`** — formatted real-world time. Supports .NET `DateTime` format strings (e.g. `<realtime_yyyy-MM-dd HH:mm:ss>`). Uses the **server's** timezone.
- **`<realtime_X_Y>`** — formatted real-world time in a **custom timezone offset**, useful when the server timezone differs from the one you want. Example: `<realtime_HH:mm_-5>` for Eastern Standard Time.

Extending the triggers above with formatting:
```yaml
- type: realtime, minute
  command: s It is now <realtime_mm> minutes past <realtime_HH>.

- type: realtime, hour
  command: s It is <realtime_HH_-5> sharp in UTC -5 timezone.

- type: realtime, day
  commands:
    - s Date is <realtime_yyyy-MM-dd>.
    - s Today is <realtime_dddd>.
```
Results:
```
# minute changes
It is now 33 minutes past 10.
It is now 34 minutes past 10.
...

# hour changes
It is 5 sharp in UTC -5 timezone.
It is 6 sharp in UTC -5 timezone.
...

# day changes
Date is 2026-05-04.
Today is Monday.
...
Date is 2026-05-05.
Today is Tuesday.
...
```

## Usage Example: Simplified Weekday Buff

Shoutout to OÐØ, who built a full "WEEKDAY BUFF" system using Cron_Job — [see the original thread for the full version](https://discord.com/channels/1167153871546744842/1460410783505580112). This is a simplified demo of the same idea:

```yaml
# Set a new key for the current day
- type: realtime, day
  command: setkey <realtime_dddd>   # e.g. "monday"

# Monday - weaker monsters
- type: globalkey, monday
  commands:
    - removekey sunday   # remove yesterday's key
    - setkey EnemyDamage 95
    - setkey EnemyLevelUpRate 100
    - setkey EnemySpeedSize 95

# Tuesday - double EXP
- type: globalkey, tuesday
  commands:
    - removekey monday
    - removekey EnemyDamage 95
    - removekey EnemyLevelUpRate 100
    - removekey EnemySpeedSize 95
    - setkey SkillGainRate 200

# Wednesday - double resources
- type: globalkey, wednesday
  commands:
    - removekey tuesday
    - removekey SkillGainRate 200
    - setkey ResourceRate 200

# ...continue the same pattern for the rest of the week
```

## Open Question (unresolved in thread)

A commenter (David D.) raised how leap years are handled for the `dayOfYear` counting (Jan 31 + Feb 28/29) — as of this guide, that wasn't confirmed/answered, so `Cron_Job` may still be the safer choice if leap-year-accurate day counting matters for your script.
