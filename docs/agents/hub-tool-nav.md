# Hub site-nav bar

Every Tool (and the landing page) renders the identical top strip — Home /
each Tool / Support, current one marked active, plus the changelog link and
theme toggle — so arriving at any Tool from the hub feels like switching
tabs, not leaving the site.

**This bar has exactly one real implementation.** It used to be hand-copied
3 times (`ew_toolkit/src/nav.ts`, `ewp_validator/src/main.ts`,
`ew_wiki/src/components/Header.astro`) and drifted each time it was touched
— a missing Tool button, a different hover color, sticky-on-one-page-only.
That was the incident. Now:

- **The Tool registry** (which keys exist, in what order, which icon) lives
  in `shared/tools.json`; `shared/navBar.ts` builds `NAV_TOOLS` from it. Adding a Tool means adding one
  entry there — every consumer picks it up automatically.
- **The markup** is built by `shared/navBar.ts`'s `renderNavBar()` /
  `buildNavItems()`. A consumer supplies only its own `hrefFor(key)`
  function, since each site resolves links differently (Vite's `BASE_URL`
  on the landing page, relative paths in `ewp_validator`, Astro's fixed
  `/ew_toolkit/<tool>/` path in `ew_wiki`).
- **The CSS** (`.site-nav`, `.nav-link`, `.theme-toggle`, …) lives in
  `shared/theme.css`, already `@import`ed by every Tool's own
  `style.css`/`theme.css`. No Tool needs its own copy. On narrow screens the
  bar collapses to one short row with a hamburger drawer holding the Tool
  links; a new Tool inherits it and checks it at 375px, never rebuilds it.
- **The theme toggle** (`ew-toolkit-theme` localStorage key, apply/mount
  logic) lives in `shared/theme.ts`. A consumer with extra theme-dependent
  work (Monaco's editor theme, Starlight's separate `starlight-theme` key)
  passes an `onApply` callback to `mountThemeToggle()` rather than
  reimplementing the toggle.

**Adding a 4th Tool:**

1. Add one entry to `shared/tools.json` (key, label, icon, description). Nothing else lists Tools.
2. In the new Tool's own entry file, call `renderNavBar(buildNavItems(<key>, hrefFor))`
   and `mountThemeToggle()` — see `ewp_validator/src/main.ts` (plain Vite) or
   `ew_wiki/src/components/Header.astro` (Astro, via `set:html`) for the two
   existing shapes. `guard-hand-rolled-navbar.cjs` asks before letting a
   hand-written `site-nav`/`nav-link`/`theme-toggle` block land without one
   of these calls nearby — a real backstop, not just this reminder.
3. Set the new Tool's own build config `base` to the full nested path it's
   actually served at (`/ew_toolkit/<tool>/`), not just its bare name — a
   bare-name base breaks every asset and internal link once nested under the
   hub (see `ew_wiki`'s ticket 08 incident: wrong `base` plus 166 stale
   absolute links, only caught when the *combined* hub was finally built).
4. Build the combined hub (`npm run build:hub`), not just the new Tool
   standalone, and do this early and more than once while the Tool is still
   taking shape — not only at final registration. Every earlier check on
   `ew_wiki` alone passed while it was still broken once nested; only a
   combined build catches a wrong `base` or a stale absolute link.
5. Nothing else to touch — no other file's nav block needs updating, because
   there isn't another one.

## Phone drawer (2026-09-21)

Under 768px the bar shows the brand, the theme button and a hamburger; the Tool links and Changelog open in a drawer below the bar. Markup: `renderNavBar`. Styles: the phone block at the end of `shared/theme.css`. Behavior: `shared/navMenu.ts` (one document-level listener, started by `mountThemeToggle`, so a Tool needs no extra call and it survives the wiki's page swaps). The width lives in `PHONE_NAV_MAX_WIDTH`; a test pins it to the CSS. The validator's phone layout uses the same width (`PHONE_MAX_WIDTH` in `ewp_validator/src/uiRules.ts`).

Trap: on the wiki, Starlight's own page-menu button and the wiki's floating icon rail sat in the same layer as the header and drew over the open drawer. `ew_wiki/src/styles/theme.css` lifts the header one step on phones. A new Tool with its own floating buttons needs the same check at 375px, with a real tap on the hamburger.

## Design system: what is shared and what is checked (2026-09-21)

The theme toggle showed a color emoji on phones after it had been fixed for desktop. Cause: it was a text character (`☀`), and a phone draws that as an emoji whatever the font is. Pinning fonts never stops it. Checks now stand behind the shared look, so a new Tool inherits them:

1. **Symbols are drawn, never typed.** Every symbol in shared code is an SVG from `shared/icons.ts`. `ewp_validator/src/sharedGlyphs.test.ts` fails on a symbol or emoji character in `shared/` code. A Tool's own code follows the same rule (a star or arrow typed as text can turn into an emoji on a phone).
2. **The built hub is compared in a real browser.** `npm run check:look` (`scripts/check-hub-look.mjs`, run in CI after the smoke test) opens the landing page and every Tool in `shared/tools.json`, plus one sub-page per Tool, at 375px and 1280px. It fails if a page's nav bar or page body (font stack, base size, text and background color) differs from the landing page's, if a code block does not use the shared monospace token, if the theme button has no drawn icon, or if a phone bar button is under 40px. Link color and line height are left out on purpose: the wiki sets its own for reading. It also loads one file into the validator and checks its Problems panel: tabs, buttons, file names and note text use the page font, only quoted code and the line number use the code font, and every size is a token size. A new Tool is covered without editing the script (a Tool's own inner panels need their own block in the script, like `checkValidatorPanel`). Run it after any `shared/` change: `npm run build:hub` in WSL, then `HUB_BROWSER_CHANNEL=msedge node scripts/check-hub-look.mjs` on Windows (CI uses Chrome).
3. **Sizes come from tokens.** `shared/theme.css` defines `--tap-size` (smallest button side on a phone), `--radius` (6px) and `--radius-sm` (4px), `--fs-xs` (11px), `--fs-sm` (12.5px) and `--fs-md` (13.5px), `--font-sans` and `--font-mono` (the one sans-serif and the one monospace stack). Tool CSS uses them; do not type a raw radius, a 10 to 14px font size, a monospace stack or a palette hex. `ewp_validator/src/rawValues.test.ts` fails on any of these in the landing, validator and wiki theme CSS. Larger text sizes stay local.
4. **The reminder hook** `guard-shared-verify-all-tools` fires on any edit under `shared/` and points to the check above. The hook only reminds; the check is what fails.

Shared on purpose: the 5 palette colors, icons, the nav bar, the phone width, and the tokens above. Local on purpose: the validator's error, warning and info colors, and the wiki explainer widgets (`ew_wiki/src/components/*.astro`), which keep their own colors, radii, sizes and fonts and are not scanned by the raw-value test. The validator keeps its own status colors (`--error`, `--warning`, `--info`, `--ok` and tints) as named variables; `rawValues.test.ts` fails on a raw hex there. A Tool's own code follows the same symbol rule as `shared/` (only emoji-capable characters are banned; the Valheim star and plain arrows are fine). Move a status color to `shared/` when a second Tool needs it.

