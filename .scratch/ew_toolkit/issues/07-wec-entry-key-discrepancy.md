# Resolve the `data:`/`name:` entry-key discrepancy in WEC's data system

Type: research
Status: resolved
Blocked by: (none)

## Question

Ticket 02 found WEC's own `README_data.md` inconsistent with itself: the "Dynamic data entries" example uses `data:` as the entry-name key, while the "Loot generation" section and every EWP example use `name:` for the same purpose. Not resolved in that research pass.

Read WEC's source directly — `WorldEditCommands/service/data/DataData.cs`, `DataEntry.cs`, `PlainDataEntry.cs` (confirmed present in the repo's file tree at https://github.com/JereKuusela/valheim-world_edit_commands) — to determine whether `name:` and `data:` are both valid aliases for the entry-name property, or whether one of them is a doc typo.

Save findings to `.scratch/ew_toolkit/research/07-wec-entry-key-discrepancy.md`.

## Answer

Definitively resolved via source: `name:` is the only valid key; `data:` is a documentation typo, not an alias. Full findings: [research/07-wec-entry-key-discrepancy.md](../research/07-wec-entry-key-discrepancy.md).

- `WorldEditCommands/service/data/DataData.cs` declares a `name` field and no `data` field, with no YamlDotNet alias attributes anywhere in `DataData.cs`/`DataEntry.cs`/`PlainDataEntry.cs`.
- `DataLoading.LoadEntry` gates registration on `data.name != null` exclusively — a `data:`-keyed entry deserializes with `name` left null and silently fails to register.
- README's own field-reference table (line 56) agrees with source (`name:`); all 10 occurrences of the buggy `- data:` form are confined to one contiguous "Dynamic data entries" section — a single copy-paste error propagated through that section's examples, not a genuine second accepted key.
- Schema should accept only `name:` for this property, and can optionally lint-flag `data:` appearing where `name:` is expected (siblings like `ints:`/`floats:`/`strings:` present, no `name:`) as "likely meant `name:`."
