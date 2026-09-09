# Script Writing Checklist

Every EWP rule entry's *nouns* — prefab, field, component — already get checked by [`AGENTS.md`'s "Never guess" order](../AGENTS.md#never-guess--real-source-first). This checklist covers the other failure mode: a script where every noun is real and the shape is schema-valid, but the *interactions between rules* are still wrong. `ewp_validator` proves shape. Nothing proves this — only tracing the chain by hand against EWP's own source does.

Run through every question below before landing any example with more than one linked EWP rule entry (a spawn that another rule reacts to, a poke that triggers a rule, any chain where one entry's action feeds another entry's trigger).

## Does the trigger type support the field being used?

Not every field works on every trigger. A no-prefab trigger (`type: time`, `type: realtime`, `type: globalkey`, `type: key`, `type: custom`, `type: event`) has no prefab of its own, and its position always defaults to the world origin `(0,0,0)` — it can't `spawn:` directly, and anything it `poke:`s needs an explicit `position:`/`offset:` to reach a real location. Check `docs/scripting.md`'s own trigger list before assuming a field just works.

## Does a spawned or removed object need `triggerRules: true`?

EWP's own docs say it plainly: objects spawned or removed by the mod don't trigger `create`/`destroy` rules by default. If a later rule in the chain is meant to react to something this script spawned — its death, its state change — the `spawn:` entry needs `triggerRules: true`, or that later rule never fires. No error, no warning: it just silently never happens.

## Does a rule matching a common prefab need a uniqueness filter?

A rule that matches by bare `prefab:` name fires for *every* live instance of that prefab, not just the one this script cares about. If a rule's own logic depends on reacting to "the one I spawned" specifically, tag that instance with `data:` at spawn time and `filter:` the reacting rule on the same tag — otherwise a wild instance, a player's own, or one from an unrelated rule triggers it too.

## Does a `poke:` or `objects:` entry need a `limit:` — or a filter?

Matching by bare prefab name reaches every instance in range, not one. `limit:` only caps *how many* get poked — with no `random:`, it picks whichever matching instances are *closest*, not "the specific one I placed." If the intent is "poke this one specific marker object," that needs a uniqueness `filter:` (tag the instance at placement, `filter:` on that tag) — `limit: 1` alone still risks poking a closer stray instead of the one you meant. Reach for `limit:` alone only when any matching instance is fine to poke and count is the only thing being capped — not identity.

## Then validate

Run the script through `ewp_validator`'s CLI before it lands, every time:

```bash
npm run validate <path-to-script.yaml>
```

This proves the shape is right. It proves nothing about the four questions above — that's what this checklist is for. Both checks are required; neither substitutes for the other.

## Cautionary example

A recurring-boss-timer case study spawned Bonemass with no `triggerRules:` (its own death rule never fired), no `filter:` (any Bonemass dying anywhere would have cleared its guard key), and poked a marker prefab with no `limit:` (multiple markers in range would have spawned multiple bosses) — three separate, silent failures in one five-line example, on a script that used only real prefab names and passed schema validation cleanly.
