# EWP script reference

Read this before you write or change an EWP or WEC script, in the wiki or in the validator. Each entry is short and names its source or reason.

## Code facts

- A trigger with no object measures from the world origin (0,0,0). A `poke:` from it reaches 100 m by default, so it needs `maxDistance:`, `position:` or `offset:`. The validator warns. Source: EWP `docs/scripting.md`, poke fields.
- An object that EWP spawns does not fire `create` rules unless its `spawn:` entry has `triggerRules: true`. An object that EWP removes fires `destroy` rules only with `triggerRules: true`. A spawned object that the game destroys later still fires `destroy` rules. No error shows when it is missing. Source: EWP `DelayedSpawn.cs`, `HandleCreated.cs`, `PrefabManager.cs` (RemoveZDO), checked 2026-10-06 on 1.62.0.
- A trigger with no object (`globalkey`, `key`, `time`, `realtime`, `custom`, `event`) runs only `chance`, `exec`, `command`, client RPCs and `poke`. `spawn:`, `swap:`, `terrain:` and `data:` on it do nothing. The validator warns. Source: EWP `PrefabManager.cs` (HandleGlobal).
- A rule with a bare `prefab:` name fires for every live instance. To react to one object, tag it with `data:` at spawn and `filter:` on that tag.
- `limit:` caps the count. With no `random:`, it picks the closest matches, not the one you placed. To poke one object, use a filter, not `limit: 1` alone.
- EWP and WEC store a `bool` as an int. Data and filter examples use `int` (0 or 1) or `string`. An RPC line keeps the real `bool`. Source: `ew_wiki/docs/sources.md`.

## Before you write

- Find each key, trigger, function and field name in the local source first. Run `node valheim-modding/scripts/source-lookup.mjs --kind key <term>` (or `trigger`, `function`, `text`).
- If it says `NOT FOUND`, do not write the term.
- Read the local copy in `valheim-modding/upstream/` before any web page.

## Habits

- A complete script starts with one `#` line that says what the whole script does. A reader may copy only the code. The house rule `wiki-script-header-comment` checks it.
- The first time an example uses a field whose meaning is not clear, add a `#` comment on that line.
- Field order is a personal habit of the maintainer, not an EWP rule. Order: `scripts/ewp-field-order.json`. The formatter `scripts/format-ewp-scripts.mjs` applies it.
- Run `npm run validate <script>` on every script. It proves the shape only.

## Lessons (each with its incident)

- Check the chain by hand before you land a script with linked rules. Every name can be real and the shape valid, and the chain can still fail. Incident 2026-09-09: a Bonemass timer example had no `triggerRules:`, no `filter:` and no `limit:`. It passed the validator and failed three ways. (Unverified: the old note said the boss death rule never fired. The source shows a spawned object still fires `destroy` rules, so the failure may have been a `create` rule.)
- An ownership claim needs code proof. Use the ledger `ew_wiki/docs/guide-source/3-advanced-guide/EWP_pid_ownership_code_findings.md` and cite a row. Incident 2026-09-15: wrong claims went in, and each fix was another guess.
