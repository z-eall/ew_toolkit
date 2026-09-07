# Structure and visual design comparison

Type: prototype
Status: resolved

## Question

Before anything moves into the hub repo, settle two things together, since they interact:

1. **Structural IA**: does the current prototype's folder/sidebar layout cleanly support a future second "component" (another Jere mod) being added later without a rebuild — given the nested URL decision (`/ew_wiki/ewp/...`, not flat)? If not, what reshaping does it need now, before content gets copied over?
2. **Visual design**: reuse the prototype's current look as-is, or adjust it — and if adjusted, reconcile with `ew_toolkit`'s shared visual identity rules (icon paths + color palette live in `shared/`, imported not copied, per `AGENTS.md`).

Use the `ew_toolkit:prototype` skill. Produce concrete options to react to (mockups, folder-tree sketches, or a small stub build) rather than describing structure in prose only.

## Answer

Both reshaped directly on the existing prototype (`C:\Users\Ultimate\Claude\ew_toolkit_wiki_prototype\starlight\`, stays local-only per the prototype map's Out of scope) so the maintainer reacted to a real, running site rather than descriptions. `astro build` verified clean after each change.

**1. Structural IA — adopt as-is.** All existing sections (`concepts/`, `reference/`, `recipes/`, `troubleshooting/`) moved under one `content/docs/ewp/` folder; the site's `base` is `/ew_wiki/`, so real routes now land at `/ew_wiki/ewp/...`, matching the nested-URL decision. The former Start Here page became `ewp/index.mdx`; a new thin `content/docs/index.mdx` is the hub landing page — lists components (currently just EWP) and is where a second mod's row would go. Sidebar nests everything under one collapsible "EWP" group; a second mod adds a sibling group with no reshaping of EWP's own pages. Maintainer approved this as-is — ticket 02 carries this reshape (not the old flat layout) into the real `ew_toolkit` repo.

**2. Visual design — adopt Variant A (Baseline).** Maintainer asked to see more options before deciding, so 4 variants were built, switchable live via `?variant=a|b|c|d` and a floating on-page switcher (`public/prototype-variant-switcher.js`, `src/styles/prototype-shared-palette.css`):
- **A · Baseline (chosen):** the 5 `shared/theme.css` values (`--bg #222831`, `--panel #393e46`, `--border #948979`, `--text #dfd0b8`, plus the light-mode swap) mapped 1:1 onto Starlight's own vars (`--sl-color-bg`, `--sl-color-bg-nav`/`-sidebar`/`-inline-code`, `--sl-color-text`/`-text-accent`, `--sl-color-hairline*`). Starlight's own default accent (indigo, used for links/current-page highlight/progress bar) is left untouched — not part of the shared 5-color palette, so nothing to reconcile there.
- B · Monochrome (not chosen): same base, but recolored the accent to the palette's own border tone — fully on-brand, felt too quiet.
- C · Layered (not chosen): same 5 colors, sidebar/content shades swapped for more depth contrast.
- D · Warm accent (not chosen): introduced one new amber color outside the approved 5 for the accent role — explicitly flagged as a rule exception, maintainer didn't take it.

**Carries into ticket 02:** reshape the real `ew_wiki` Tool folder to this nested `ewp/`-grouped structure with a hub landing `index.mdx`, base `/ew_wiki/`, sidebar nested under "EWP"; apply the Variant A palette mapping via `customCss` importing `shared/theme.css`'s values onto the same Starlight variables (Starlight's own accent color stays default — no palette work needed there).

