# EWP script reference

Read this before you write or change an EWP or WEC script, in the wiki or in the validator. Each entry is short and names its source or reason.

## Code facts

- A trigger with no prefab (`time`, `realtime`, `globalkey`, `key`, `custom`, `event`) starts at the world origin (0,0,0). It cannot `spawn:` by itself. A `poke:` from it needs `position:` or `offset:`. Source: EWP `docs/scripting.md`, trigger list.
- An object that EWP spawns or removes does not fire `create` or `destroy` rules. Add `triggerRules: true` to the `spawn:` entry if a later rule must react. No error shows when it is missing. Source: EWP docs.
- A rule with a bare `prefab:` name fires for every live instance. To react to one object, tag it with `data:` at spawn and `filter:` on that tag.
- `limit:` caps the count. With no `random:`, it picks the closest matches, not the one you placed. To poke one object, use a filter, not `limit: 1` alone.
- EWP and WEC store a `bool` as an int. Data and filter examples use `int` (0 or 1) or `string`. An RPC line keeps the real `bool`. Source: `ew_wiki/docs/sources.md`.

## Habits

- A complete script starts with one `#` line that says what the whole script does. A reader may copy only the code. The house rule `wiki-script-header-comment` checks it.
- The first time an example uses a field whose meaning is not clear, add a `#` comment on that line.
- Field order is a personal habit of the maintainer, not an EWP rule. Order: `ew_toolkit/AGENTS.md`, "Script field order".
- Run `npm run validate <script>` on every script. It proves the shape only.

## Lessons (each with its incident)

- Check the chain by hand before you land a script with linked rules. Every name can be real and the shape valid, and the chain can still fail. Incident 2026-09-09: a Bonemass timer example had no `triggerRules:`, no `filter:` and no `limit:`. It passed the validator and failed three ways.
- An ownership claim needs code proof. Use the ledger `ew_wiki/docs/guide-source/3-advanced-guide/EWP_pid_ownership_code_findings.md` and cite a row. Incident 2026-09-15: wrong claims went in, and each fix was another guess.
