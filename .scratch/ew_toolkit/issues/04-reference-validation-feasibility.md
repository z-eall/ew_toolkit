# Can key references be validated without full data-aware game data?

Type: research
Status: resolved
Blocked by: (none)

## Question

Investigate EWP's YAML structure to determine whether same-file references (a key pointing to another key/id in the same document) and/or cross-file references (a system in one file pointing at an id defined in another file) can be structurally validated using patterns derivable from the schema/docs alone — without needing a full external prefab/item database. Report what's feasible now vs. what genuinely needs data-aware groundwork (deferred, out of this map's v1).

Save findings to `.scratch/ew_toolkit/research/04-reference-validation-feasibility.md`.

## Answer

All `expand_prefabs_*.yaml` + `data.yaml` files load into one merged namespace (per Jere's README) — so cross-file checking is legitimate once the toolkit reads the whole glob, no per-file scoping needed. Full findings: [research/04-reference-validation-feasibility.md](../research/04-reference-validation-feasibility.md).

**Buildable for v1, no game-data index needed:**
- `data.yaml` named-template references — a clean definition (`name:` entry in `data.yaml`) / usage (`data:` field, bareword form) pair, checkable same-file and cross-file with pure YAML parsing + one heuristic (bareword vs. the `type, key, value` triple form). This is the concrete v1 recommendation and directly answers the "typo in a cross-file reference" pain point.
- Custom saved keys (`<save_X_Y>` templates vs. `keys`/`bannedKeys`/`type: key` reads) — doable via regex-scan, but real false-positive risk (keys can be set by other mods/console commands outside the scanned files). Recommended as a best-effort warning, not a v1 hard error.

**Must wait (confirmed genuinely data-aware or out of file-set scope):**
- `prefab`/`swap`/component-path fields — validated against real Valheim game data; README's own "Custom prefab names" escape hatch confirms this.
- Global keys — mostly set by vanilla game logic, not scripter YAML; would false-positive constantly without a bundled static list of vanilla global-key names.
- Event names — defined in Expand World's separate world-event system, outside this repo's file set entirely.
- `connect`/`attach`/poke `target` — runtime ZDO links, not named identifiers; nothing to structurally check.
