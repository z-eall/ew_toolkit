# Add a shared icon/token module; migrate the validator to it and fix existing drift

Type: task
Status: resolved
Blocked by: 19 (resolved)

## Question

Not a decision — the decision (share, don't copy, visual identity between
Tools) was made resolving
[Standing rule for icon/symbol consistency](19-icon-symbol-consistency-standing-rule.md).
This ticket is the implementation: build the shared module and use it to fix
the two concrete drift instances already found this session.

Root cause (confirmed by reading the code, not guessed): the Hub's root
landing page (`src/nav.ts`, `src/style.css`) and `ewp_validator`
(`ewp_validator/src/main.ts`, `ewp_validator/src/style.css`) each keep their
own separate copy of icon path data and color CSS variables. `main.ts:108`'s
own comment admits the icon set is "copied from the hub's nav.ts" by hand.
The color tokens have already drifted: `--info` means "the text color" in
the root `style.css` but a distinct blue (`#3794ff`) in the validator's.

Scope, per ticket 19's answer: icon paths + the "identity" palette
(`--bg`/`--panel`/`--border`/`--text`/`--muted`/`--hover`) move to a shared
module. Severity colors (`--error`/`--warning`/`--info`) stay local to
`ewp_validator` — they're validator-only diagnostic semantics the Landing
page has no use for, not Hub identity.

Do the work:

1. New top-level `shared/` directory (sibling to `src/` and
   `ewp_validator/`), holding: an icon-path registry (the outline-only,
   `currentColor`, stroke-width-1.7 convention `nav.ts` already documents)
   and the identity palette as CSS custom properties (dark + light, matching
   the existing two-theme values).
2. Widen both `tsconfig.json` files' `include` to reach `shared/` — no
   workspace/monorepo tooling needed, plain relative imports across a
   shared source folder. Confirm both `vite.config.ts`s don't need
   `server.fs.allow` changes for dev-server file serving across that
   boundary (check, don't assume).
3. Migrate `src/nav.ts` and `ewp_validator/src/main.ts` to both import icons
   from the shared registry instead of each keeping/copying its own path
   strings. Migrate both `style.css` files' identity-palette variables to
   reference the shared tokens instead of separately hardcoded hex values.
4. Fix the `--info` drift as part of the migration — give the Landing page's
   "text color" variable its own honestly-named token instead of reusing
   `--info`, since it was never really the same variable as the validator's
   severity color.
5. Regression coverage: existing tests must keep passing; no new test
   infrastructure needed purely for CSS variables, but confirm nothing
   silently starts resolving to `undefined`/blank.
6. Run `npx vitest run` / `npx tsc --noEmit` / `npm run build` in **both**
   the repo root and `ewp_validator/`, and live-verify both the Landing page
   and the validator in the browser preview (icons render, both themes
   still look correct) before marking resolved.

## Answer

**Real overlap turned out narrower than the ticket assumed** — worth
recording since it corrects the plan mid-implementation rather than forcing
a wrong unification. Diffed both `style.css` files' `:root` blocks directly:
`--bg`/`--panel`/`--border`/`--text`/`--muted` are byte-identical hex values
in both files today — genuinely one shared concept. `--hover` is not: the
validator uses it as a `background` fill for row/menu hover states (10+ call
sites), while the Landing page's same-named-in-spirit `--info` was used only
as a `border-color`/`color` brightening effect on `:hover` selectors — a
different visual treatment, not a copy of the same idea. Forcing them into
one shared `--hover` token would have visually changed the Landing page's
hover behavior. So `--hover` stays local to each consumer; only the five
byte-identical variables moved to the shared module.

**Built:**
- [shared/icons.ts](../../../shared/icons.ts) — `ICON_PATHS` registry (every
  icon glyph either app used, including the two genuinely-duplicated ones,
  `home` and the notepad/file icon, confirmed identical path data on both
  sides), plus `svgIcon()`/`icon()` wrapper helpers (also previously
  duplicated verbatim between `nav.ts` and `main.ts`).
- [shared/theme.css](../../../shared/theme.css) — the five byte-identical
  identity variables, dark + light.
- Both `tsconfig.json`s widened (`include: ["src", "shared"]` at root,
  `["src", "../shared"]` in `ewp_validator`) — confirmed via actual dev-server
  network requests (not assumed) that Vite serves `shared/` fine across the
  project-root boundary via its `@fs/` path, no `server.fs.allow` change
  needed in either `vite.config.ts`.
- `src/nav.ts` and `ewp_validator/src/main.ts` migrated to import icons
  instead of hand-copying path strings.
- Both `style.css` files `@import` the shared theme file instead of
  redeclaring the five identity variables.
- Fixed the `--info` drift: the Landing page's variable renamed to
  `--accent` (`var(--text)`, same resolved value, honest name) with an
  explanatory comment referencing checklist item 8, so it can never again be
  mistaken for the validator's severity `--info`.

**Verified:** `npx vitest run` — 190/190 passed, unchanged, in
`ewp_validator/`. `npx tsc --noEmit` clean in both the repo root and
`ewp_validator/`. `npm run build` succeeded in both. Live-verified in the
browser preview: Landing page renders with working icons/nav, theme toggle
confirmed via computed styles (`--accent` resolves to the correct per-theme
value, `--info` correctly absent — no more collision); validator renders
its full toolbar with the shared trash icon present as a real `<svg>` in the
DOM, and its own `--hover`/`--error`/`--warning`/`--info` severity colors
are untouched and correctly still validator-local. No new console errors in
either app (pre-existing Monaco-worker dev noise in `ewp_validator` is
unrelated, confirmed present before this change too).

**Not pursued, flagged for later:** `nav.ts` and `main.ts` also independently
duplicate the *theme-toggle mechanism* itself (localStorage key, `applyTheme`
logic), not just tokens/icons — a real, separate instance of the same
copy-don't-share pattern this ticket fixed for colors/icons, but a bigger,
riskier change (behavior, not just values) and out of this ticket's scope.
Left as a fog item on the Hub map's Not yet specified rather than folded in
here.
