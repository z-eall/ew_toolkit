# Reference-validation feasibility (no external game-data index)

Research for: `.scratch/ew_toolkit/issues/04-reference-validation-feasibility.md`

Primary sources (all fetched 2026-08-17 from the `main` branch of
`JereKuusela/valheim-expand_world_prefabs`):

- README: https://raw.githubusercontent.com/JereKuusela/valheim-expand_world_prefabs/main/README.md
- Scripting reference: https://raw.githubusercontent.com/JereKuusela/valheim-expand_world_prefabs/main/docs/scripting.md
- Function/template reference: https://raw.githubusercontent.com/JereKuusela/valheim-expand_world_prefabs/main/docs/functions.md
- Repo listing (top level): https://api.github.com/repos/JereKuusela/valheim-expand_world_prefabs/contents/
- Repo listing (`docs/`): https://api.github.com/repos/JereKuusela/valheim-expand_world_prefabs/contents/docs
- Examples: https://raw.githubusercontent.com/JereKuusela/valheim-expand_world_prefabs/main/examples_bosses.md,
  https://raw.githubusercontent.com/JereKuusela/valheim-expand_world_prefabs/main/examples_progression.md

Note on method: pages were fetched through the WebFetch tool, which runs the raw
markdown through a small summarizing model rather than returning byte-for-byte
text. Quoted fragments below are reproduced as returned by that pass and should
be treated as "close paraphrase/quote," not a byte-diffed copy — worth a manual
skim of `docs/scripting.md` before finalizing any parser regexes.

## 1. File-loading model (why cross-file matters at all)

From the README:

> "You can have multiple script files with names `expand_prefabs_*.yaml`. This
> is useful to organize scripts and also makes it easy to get files from other
> people."
>
> "Script file `expand_world/expand_prefabs.yaml` is created automatically...
> Script files support data system of World Edit Commands. You can freely mix
> scripts, data and values in the same file."

So EWP already treats every `expand_prefabs_*.yaml` file in the folder as one
merged namespace — there's no per-file isolation. Anything that counts as a
"definition" can legally live in a different file than its "usage," and the
docs explicitly say data/scripts/values can also be mixed in a single file.
This means a toolkit only needs to (a) know the glob of files that get loaded
together and (b) parse all of them into one symbol table; it does not need to
understand per-file scoping rules.

## 2. Reference-field inventory

### 2a. Fields that reference real Valheim game data (needs the deferred index)

- `prefab` (the object-id filter on triggers/objects) — matches real prefab
  names or built-in "value groups" (`Tameable`, `Piece`, `creature`,
  `structure`) and wildcards like `Trophy*`.
- `swap` and `spawn` prefab targets — same prefab-name space.
- Component/field paths inside `strings`/`floats`/`ints` data blocks, e.g.
  `Humanoid.m_name`, `Humanoid.m_bossEvent` (from `examples_bosses.md`) —
  these are Unity/Valheim component-and-field names baked into the game, not
  scripter-invented identifiers.
- The README's own "Custom prefab names" setting acknowledges this directly:
  > "Custom prefab names: Comma separated list of prefab names that are
  > processed even when server doesn't recognize them. The prefab names must
  > be exact match, including capitalization."
  That escape hatch exists *because* prefab names are otherwise validated
  against the game's known prefab set — confirming this whole category is
  fundamentally data-aware and belongs in the deferred/out-of-scope bucket.

None of the above is buildable without the external prefab/item/creature
index. This matches the ticket's framing and is excluded from the rest of
this report.

### 2b. Fields that reference scripter-invented identifiers (no game data needed)

Four distinct identifier namespaces exist in EWP. They are **not** uniform —
only one of them has a clean, schema-level definition/usage split.

**i. `data.yaml` named templates — the strong case.**

From `docs/scripting.md`, the `data` action field:

> "data: Sets object data either with format `name` or `type, key, value`.
> Format `name` can be used to set multiple values (entry name from
> `data.yaml`)."

And on Spawns:

> "data: Entry in the `data.yaml` to be used as initial data."

`examples_bosses.md` shows the definition side concretely:

```yaml
- name: ultra_bonemass
  strings:
  - Humanoid.m_name, Ultra Bonemass
  - Humanoid.m_bossEvent, army_bonemass
  floats:
  - Humanoid.m_runSpeed, 50
  - RandomSkillFactor, 1.5
  - max_health, 10000
  - health, 10000.1
```

and the usage side:

```yaml
- prefab: Bonemass
  type: create
  data: ultra_bonemass
  chance: 0.1
```

This is a genuine definition/usage pair at the YAML-schema level: a list
entry under `name:` in `data.yaml` defines an identifier; a bareword value of
the `data:` field anywhere else (in `data.yaml` itself or any
`expand_prefabs_*.yaml` file, since files are merged) is a usage of that
identifier. The only structural wrinkle is distinguishing the bareword form
(`data: ultra_bonemass`) from the inline triple form (`data: int, level, 3`)
— doable with a simple heuristic (does the value contain the `type, key,
value` comma-separated shape, or is it a single bare token).

**ii. Custom saved "keys" — a weaker, string-templated case.**

`docs/scripting.md` describes the `key` trigger type and its filters:

> `"key"`: "When a custom saved data is set or removed. Parameter is the data
> name." ... "This only triggers when the saved data actually changes."

> `keys` / `bannedKeys` filters: format `"key1 value1, key2 value2, ..."`,
> with values convertible to a numeric range `min;max;step`.

But there is no dedicated YAML *action field* that defines a key. Instead,
`docs/functions.md` shows keys are set/read via inline string templates:

> `<save_X_Y>`: "Saves custom data with key X and value Y."
> `<save++_X>` / `<save--_X>`: increment/decrement shorthand.
> `<load_X=default>`: "Gets custom data with key X. If not found, returns the
> given default value."
> `<clear_X>`: "Removes custom data with key X."

These templates can be embedded inside arbitrary string-valued fields
(command text, data values, chat text, etc.) — there's no single schema
location a parser can check the way it can check `data.yaml`'s `name:` list.
Detecting "this key was read/filtered on but never written" is still
possible without external game data (regex-scan every string field for
`<save_...>` writes vs. every `keys:`/`bannedKeys:`/`type: key` reference),
but it's a fuzzier, regex-over-free-text check rather than a structural
schema check, and it will have real false-positive risk (e.g. a key legitimately
seeded by an admin console command or another mod, never appearing as a
`<save_...>` template anywhere in the loaded YAML).

There's also a separate, easy-to-confuse file: the README notes
`expand_world/ewp_data.yaml` is "created automatically if custom keys are
saved" — this is an auto-generated runtime save file (game state), not an
authored source of definitions, and should not be treated as a definition
site for static analysis.

**iii. Global keys — same shape as (ii), but worse for false positives.**

`globalKeys` / `bannedGlobalKeys` filters and the `type: globalkey` trigger
reference Valheim's global-key system (lower-cased strings). Reading is done
via `<globalkey_*>` templates. Critically, the docs show no EWP action that
directly *sets* a global key from script — many real global keys (e.g.
`defeated_bonemass`, used in `examples_progression.md`'s "Greydwarves become
stronger after defeating Bonemass" example) are set by vanilla game logic
itself and will never appear as a "definition" anywhere in a scripter's YAML.
A structural "defined but never used" or "used but never defined" check on
global keys would therefore misfire constantly against legitimate vanilla
key names unless paired with a bundled static list of vanilla global-key
names — which is itself a (much smaller, easier-to-maintain) data file, and
arguably still "data-aware" work, just lighter-weight than a full prefab
index.

**iv. Event names — out of scope for this repo's file set.**

`type: event` triggers fire on event start/end with the event name as the
trigger parameter; `events`/`playerEvents` filters check nearby/possible
events by name (default 100m search radius, overridable via
`eventDistance`). But event definitions themselves belong to Expand World's
separate world-event system, not to `expand_prefabs_*.yaml` / `data.yaml`.
A structural validator scoped to this repo's file set cannot resolve event
names without also ingesting that other config domain — treat as deferred,
same bucket as game-data prefab names, though for a different reason (wrong
file set, not wrong data source).

**v. `connect` / `attach` / poke `target`/`self`/`connected` — not static identifiers at all.**

These link objects at runtime via ZDO ids (`<zdo>` passed as a poke
parameter) or dynamic relationships (self/connected), not by any
scripter-authored name. There is nothing to cross-reference structurally —
these are procedural links, not a namespace of ids with definitions and
usages. Confirmed no `name`/id field exists on poke configs in the
docs (poke fields are `prefab`, `self`, `target`, `connected`, `pars`,
`parameter`) and no round-trip example pairs a poke definition with a
named trigger match — the `poke` trigger type just fires "when `pokes`
field is used," not against a named identifier.

## 3. Concrete structural pattern for v1

Only case **2b-i** (`data.yaml` names) has an unambiguous, purely-structural
definition/usage pattern:

- **Definition site**: any YAML mapping with a `name:` key inside a list
  (conventionally under `data.yaml`, but per the README's "mix scripts, data
  and values in the same file" note, technically anywhere in the loaded
  file glob).
- **Usage site**: any `data:` field whose value is a single bareword token
  (not the `type, key, value` triple shape) — appearing on `create`-type
  action blocks or on Spawn entries — anywhere across the loaded file set.
- **Check**: build the set of all defined names across every loaded file;
  flag any bareword `data:` usage not in that set (undefined reference);
  optionally flag defined names with zero usages (dead definition) as a
  separate, lower-severity lint.

This requires no external game data — it's pure YAML parsing plus a string
heuristic, and it directly addresses the ticket's "typo in a cross-file
reference" pain point for the one namespace where EWP's own schema gives a
clean signal.

## 4. Bottom line

**Buildable now, no data-aware groundwork:**

1. `data.yaml` name/`data:` reference validation (same-file and cross-file,
   since all `expand_prefabs_*.yaml` + `data.yaml` files are loaded as one
   namespace). This is the clean win — ship it for v1.
2. Custom-saved-key (`keys`/`bannedKeys`/`type: key`) cross-check between
   `<save_X...>` template writes and filter/trigger reads, as a best-effort
   *warning*-level lint, not a hard error — implement only if the false-positive
   rate from step 1's learnings proves acceptable, since keys can legitimately
   be set outside the scanned file set (other mods, console commands).

**Must wait for data-aware groundwork (or a separate, smaller static list):**

3. Any `prefab`/`swap`/component-path validation against real Valheim game
   data — explicitly out of scope per the ticket, confirmed necessary here
   since prefab names are validated against the actual game/mod-recognized
   set (see the README's "Custom prefab names" escape hatch).
4. Global-key definition/usage checking — blocked less by "external index"
   and more by the fact that legitimate global keys are frequently defined
   by vanilla game logic, not by the scripter's own YAML; would need a
   bundled static list of vanilla global-key names to avoid constant false
   positives. Worth flagging as a smaller, separate follow-up rather than
   full data-aware scope, but it is not a v1 same-file/cross-file structural
   win the way `data.yaml` is.
5. Event-name validation — blocked because event definitions live in a
   different config domain (Expand World's world-event system) outside this
   repo's own file set entirely, not just because of missing game data.
