# Hub site-nav bar

Every Tool (and the landing page) renders the identical top strip — Home /
each Tool / Support, current one marked active, plus the changelog link and
theme toggle — so arriving at any Tool from the hub feels like switching
tabs, not leaving the site.

**This bar has exactly one real implementation.** It used to be hand-copied
3 times (`ew_toolkit/src/nav.ts`, `ewp_validator/src/main.ts`,
`ew_wiki/src/components/Header.astro`) and drifted each time it was touched
— a missing Tool button, a different hover color, sticky-on-one-page-only.
See `.scratch/ew_toolkit/issues/21-unify-hub-tool-nav-bar.md` for the
incident. Now:

- **The Tool registry** (which keys exist, in what order, which icon) lives
  in `shared/navBar.ts`'s `NAV_TOOLS` array. Adding a Tool means adding one
  entry here — every consumer picks it up automatically.
- **The markup** is built by `shared/navBar.ts`'s `renderNavBar()` /
  `buildNavItems()`. A consumer supplies only its own `hrefFor(key)`
  function, since each site resolves links differently (Vite's `BASE_URL`
  on the landing page, relative paths in `ewp_validator`, Astro's fixed
  `/ew_toolkit/<tool>/` path in `ew_wiki`).
- **The CSS** (`.site-nav`, `.nav-link`, `.theme-toggle`, …) lives in
  `shared/theme.css`, already `@import`ed by every Tool's own
  `style.css`/`theme.css`. No Tool needs its own copy.
- **The theme toggle** (`ew-toolkit-theme` localStorage key, apply/mount
  logic) lives in `shared/theme.ts`. A consumer with extra theme-dependent
  work (Monaco's editor theme, Starlight's separate `starlight-theme` key)
  passes an `onApply` callback to `mountThemeToggle()` rather than
  reimplementing the toggle.

**Adding a 4th Tool:**

1. Add one entry to `shared/navBar.ts`'s `NAV_TOOLS`.
2. In the new Tool's own entry file, call `renderNavBar(buildNavItems(<key>, hrefFor))`
   and `mountThemeToggle()` — see `ewp_validator/src/main.ts` (plain Vite) or
   `ew_wiki/src/components/Header.astro` (Astro, via `set:html`) for the two
   existing shapes.
3. Nothing else to touch — no other file's nav block needs updating, because
   there isn't another one.
