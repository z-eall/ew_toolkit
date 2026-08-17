# Resolve the `data:`/`name:` entry-key discrepancy in WEC's data system

Type: research
Status: open
Blocked by: (none)

## Question

Ticket 02 found WEC's own `README_data.md` inconsistent with itself: the "Dynamic data entries" example uses `data:` as the entry-name key, while the "Loot generation" section and every EWP example use `name:` for the same purpose. Not resolved in that research pass.

Read WEC's source directly — `WorldEditCommands/service/data/DataData.cs`, `DataEntry.cs`, `PlainDataEntry.cs` (confirmed present in the repo's file tree at https://github.com/JereKuusela/valheim-world_edit_commands) — to determine whether `name:` and `data:` are both valid aliases for the entry-name property, or whether one of them is a doc typo.

Save findings to `.scratch/ewp-toolkit/research/07-wec-entry-key-discrepancy.md`.
