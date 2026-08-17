# Scope the data.yaml reference-validation feature for v1

Type: grilling
Status: resolved
Blocked by: (none)

## Question

Ticket 04 confirmed `data.yaml` named-template references (definition = `name:` entry, usage = bareword `data:` field) are cleanly checkable, same-file and cross-file, with no game-data index. It also found custom-saved-key (`<save_X_Y>`) cross-checking is possible but has real false-positive risk (keys can legitimately be set by other mods/console commands outside the scanned file set).

Decide for v1:
- Should an undefined `data:` reference be a hard error or a warning?
- Should "defined but never used" (dead `data.yaml` entry) be flagged at all, and at what severity?
- Does the custom-saved-key best-effort lint ship in v1, or is it deferred given its false-positive risk?

See [research/04-reference-validation-feasibility.md](../research/04-reference-validation-feasibility.md) for full context.

## Answer

- **Undefined `data:` reference** (bareword value with no matching `name:` entry anywhere in the loaded file set): **hard error.** Structurally unambiguous — no legitimate reason a `data:` field points at nothing.
- **Dead `data.yaml` entry** (`name:` defined, zero `data:` usages in the loaded set): **low-severity info/hint**, not an error or warning. May be intentional (future system) or referenced from a file outside the currently-loaded batch — surfaced for pruning, not flagged as wrong.
- **Custom-saved-key lint** (`<save_X_Y>` writes vs. `keys:`/`bannedKeys:` reads): **ships in v1, warning-level.** Flag a one-sided match within the loaded file set — a key referenced in `keys:`/`bannedKeys:` with no corresponding `<save_...>` write anywhere loaded, or vice versa — without trying to account for external interference (other mods, console commands setting the key). The warning message should point the user at `expand_world/ewp_data.yaml` (the mod's auto-generated runtime save file, confirmed in ticket 04's research) to verify the key's actual live state before treating the flag as a real bug — giving a concrete way to rule out false positives rather than suppressing the check.
