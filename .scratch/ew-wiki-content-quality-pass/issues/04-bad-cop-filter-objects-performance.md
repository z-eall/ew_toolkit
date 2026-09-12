Type: grilling
Status: resolved

## Question

Add a bad-cop (anti-pattern) example on the "Filter: by Objects" page ([objects-filtering.mdx](../../../ew_wiki/src/content/docs/ewp/concepts/objects-filtering.mdx)) about expensive object-range scans, using the wiki's existing "wrong vs. right" convention (see ticket 03 for the pattern).

Maintainer's draft text: "To check if objects are in range, all zones within range must be scanned. This is no problem usually, but setting a high max distance can be costly for performance." with this bad example:

```yaml
# removes portals when 10 already exist in the world
- prefab: portal_wood
  type: create
  objects:
  - prefab: portal_wood
    maxDistance: 20000
  objectsLimit: 10
  remove: true
```

The maintainer's original note said to then point to "Understanding Keys" for the better way to do this — **but charting found that page (`ewp-key.mdx`, "Custom Data: EWP Key") is about global save/load keys, not object-range scanning; it has no relevant "better way" content.** This ticket needs to decide: what's the actual better-practice cross-link (if any exists in the wiki already), or does this example stand alone without a "better way" pointer? Note `objects-filtering.mdx` already has a related performance `<Aside>` about `objectsLimit` forcing a full scan — check whether the new example should sit near that existing note rather than duplicate it.

Decide final wording, placement, and cross-link (or lack of one), then write it directly.

## Answer

Written in [objects-filtering.mdx](../../../ew_wiki/src/content/docs/ewp/concepts/objects-filtering.mdx), right after the existing `objectsLimit` performance `<Aside>` (extending that same performance note rather than duplicating it). Used the maintainer's draft `WRONG` example as-is.

**The "Understanding Keys" cross-link, revisited**: charting flagged `ewp-key.mdx` ("Custom Data: EWP Key") as a mismatch, since it's about global save/load keys, not object scans. On closer reading while resolving this ticket, that was too hasty — the page's own `<save++_X>`/`<save--_X>` counter mechanism (already demonstrated in its "Boar-kill counter" case study) *is* the real better-practice alternative: track a count directly with a counter key instead of re-deriving it by scanning every time. The maintainer's original instinct to link there was right; the CORRECT snippet here only shows the counter-maintenance half (create/destroy increment/decrement, both already-verified syntax from that page) and points to that page's full case study for the reactive `type: key` half, rather than inventing a new untested multi-rule chain for "remove the exact 11th portal."
