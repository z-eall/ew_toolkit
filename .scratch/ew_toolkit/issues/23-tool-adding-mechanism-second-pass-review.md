# Does the Tool-adding mechanism actually hold up a second time?

Type: grilling
Status: open

## Question

This map's own fog note asked: "Absorbing the validator as Tool #1 proves the mechanism once, but genuinely validating 'adding a Tool' as repeatable needs a real Tool #2 — which is out of scope for this map. Revisit once a Tool #2 is chosen." Tool #2 (`ew_wiki`) is now chosen, built, and shipped (see [Ew Wiki Real Build](../ew-wiki-real-build/map.md), closed).

Revisit that question for real: did the hub's Tool-adding mechanism (hardcoded landing-page list, each Tool keeping its own `package.json`/`vite.config`, `scripts/build-hub.mjs` copying output into `dist/<subpath>/`) actually hold up cleanly for `ew_wiki`, or did the build-out surface friction the mechanism doesn't account for?

Known candidate friction, surfaced by `ew_wiki`'s own map but not yet folded back into this map's own mechanism/Notes:
- The hand-copied site-nav-bar/theme-toggle/favicon drift ([ticket 21](issues/21-unify-hub-tool-nav-bar.md), [ticket 22](issues/22-unify-favicon.md)) — both already resolved here, but worth asking whether the *pattern* ("shared visual identity, no enforcement until a 2nd Tool exists to prove drift") should get a standing checklist item for a hypothetical Tool #3, rather than waiting to be caught by hand again.
- `ew_wiki`'s own base-path bug (ticket 08's Answer: `base` was `/ew_wiki/` instead of the real nested `/ew_toolkit/ew_wiki/`, plus 166 stale absolute cross-links) — only caught when the *combined* hub was built for the first time, since every prior `ew_wiki` ticket only build-checked it standalone. Worth asking whether "build-check the combined hub, not just the new Tool alone" belongs in the mechanism itself now.

Resolve by deciding: does the mechanism (as currently described in this map's Notes) need updating in light of what `ew_wiki` actually took to integrate cleanly? If yes, what changes; if no, say why the friction found was Tool-specific rather than mechanism-shaped.
