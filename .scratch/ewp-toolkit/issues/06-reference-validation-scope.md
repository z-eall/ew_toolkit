# Scope the data.yaml reference-validation feature for v1

Type: grilling
Status: claimed
Blocked by: (none)

## Question

Ticket 04 confirmed `data.yaml` named-template references (definition = `name:` entry, usage = bareword `data:` field) are cleanly checkable, same-file and cross-file, with no game-data index. It also found custom-saved-key (`<save_X_Y>`) cross-checking is possible but has real false-positive risk (keys can legitimately be set by other mods/console commands outside the scanned file set).

Decide for v1:
- Should an undefined `data:` reference be a hard error or a warning?
- Should "defined but never used" (dead `data.yaml` entry) be flagged at all, and at what severity?
- Does the custom-saved-key best-effort lint ship in v1, or is it deferred given its false-positive risk?

See [research/04-reference-validation-feasibility.md](../research/04-reference-validation-feasibility.md) for full context.
