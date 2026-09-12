Type: task
Status: resolved

## Question

Replace `ew_toolkit`'s 3 independent, hand-copied site-nav-bar implementations with one real shared implementation, so a 4th Tool can never repeat this drift:

- `src/nav.ts` (landing page) — builds the bar as a template-string HTML.
- `ewp_validator/src/main.ts` — the bar is raw hardcoded HTML, typed by hand. **It's missing the `ew_wiki` button entirely** — never updated when that Tool was registered.
- `ew_wiki/src/components/Header.astro` — a Starlight override with its own copy of the markup, its own copy of the `.site-nav` CSS block, and its own theme-bridging script.

**Reported symptoms** (maintainer, 2026-09-11):
1. Missing button — `ewp_validator`'s copy never got a `ew_wiki` entry.
2. Shape/alignment — the wiki's rendered nav bar looks different (shape/alignment) from the other two pages, even though its CSS is a hand-copied "pixel-for-pixel" match. Something wrapping it (Starlight's own header layout) is the likely cause — diagnose for real, verify on a live running page, don't just compare source diffs.

**Also found while investigating** (folds in per the maintainer's "check for other candidates that get the same treatment" ask):
- The `.site-nav` CSS block is *also* hand-copied 3 times: `ew_toolkit/src/style.css`, `ewp_validator/src/style.css`, and `Header.astro`'s own `<style>` block. Same duplication shape as the markup, needs the same fix.
- The theme-toggle mechanism (`applyTheme`/`getStoredTheme`, the `ew-toolkit-theme` key) is independently implemented 3 different ways: `nav.ts`, `main.ts`, and `Header.astro`'s bridging script (which also reconciles Starlight's own separate `starlight-theme` key — a 4th variant). Already flagged as open fog on this map's "Not yet specified" — this ticket graduates and resolves it.
- `nav.ts` and `Header.astro` both cite `docs/agents/hub-tool-nav.md` as "the standing rule" — **that file doesn't exist.** The real rule lives in `AGENTS.md`'s UI/UX-consistency mechanism 4, which currently tells the next Tool author to "hand-render... copy the block" — i.e. it documents doing the exact thing that caused this bug. Needs rewriting once the shared mechanism ships (either write the promised file for real, or drop the dead pointer and fix `AGENTS.md`'s wording to point at the new shared function instead of "copy the block").
- `.agents/hooks/ew_toolkit/guard-nav-registry-addition.cjs` exists specifically to catch drift *between hand copies* when `nav.ts` registers a new Tool. Once there's only one real copy, that premise disappears — decide whether to delete the hook or repoint it at whatever new shared file becomes the single source of truth.

## Decided already (2026-09-11 grilling, ew_wiki bug-fix session)

- Share as **one plain function** (e.g. `shared/nav.ts` exporting something like `renderNavHtml(current, base)`), not a Web Component — matches the existing `shared/icons.ts`/`shared/theme.css` pattern, works the same called from a vanilla page and from an Astro island via `set:html`.
- Not done until checked on a real live page for all 3 Tools — source-diff matching alone doesn't close this ticket.

## Also fixed while resolving (maintainer request, 2026-09-11)

- ew_wiki's nav icon changed from the generic `toolbox` fallback to a dedicated `book` glyph (`shared/icons.ts`), now that `NAV_TOOLS` no longer needs the fallback for this Tool.

## Related, spun into its own ticket

- The browser-tab favicon is *also* built 3 separate ways (2 accidental byte-identical copies + 1 completely different default icon on `ew_wiki`) — same "1 master, shared" problem, different technical mechanism (a static asset, not shareable code). See [ticket 22](22-unify-favicon.md).

## Out of scope for this ticket (still-unsharp fog, not ticketed)

- `ewp_validator/src/confirmModal.ts` also deliberately stayed unshared, "same discipline as the theme-toggle," per its own comment — but no second Tool has a confirm-style dialog yet, so there's still nothing to prove a shared shape against. Left as fog in this map's Notes for whenever a 2nd Tool needs one.

## Answer

Built a real shared implementation, replacing all 3 hand copies:

- **`shared/navBar.ts`** — `NAV_TOOLS` (the one Tool registry: key/label/icon, now including `ew_wiki`), `buildNavItems(current, hrefFor)`, `renderNavBar(items)`. Each consumer supplies only its own `hrefFor` (landing page: Vite `BASE_URL`; `ewp_validator`: relative paths; `ew_wiki`: fixed `/ew_toolkit/<tool>/`, since that Tool is always served at that nested path).
- **`shared/theme.ts`** — `getStoredTheme`/`applyTheme`/`mountThemeToggle`, all 3-4x-duplicated theme logic collapsed into one, with an `onApply` hook for each consumer's own extra work (`ewp_validator`'s Monaco editor theme; `ew_wiki`'s Starlight `starlight-theme` key bridge).
- **`shared/theme.css`** — the `.site-nav`/`.nav-link`/etc. CSS block, added once; removed from `ew_toolkit/src/style.css`, `ewp_validator/src/style.css`, and `ew_wiki/src/components/Header.astro`'s own `<style>` (all 3 already `@import shared/theme.css`, so nothing else needed touching to pick it up).
- **`docs/agents/hub-tool-nav.md`** — written for real (previously a dead pointer from 2 files); `AGENTS.md` mechanism 4 rewritten to point at it instead of "copy the block," in both worktrees, via `/writing-for-agents`.
- **`guard-nav-registry-addition.cjs`** deleted (both `settings.json` files) — its premise (drift between hand copies) no longer exists once there's one copy. Retirement recorded in `docs/agents/hooks-vs-rules.md`.

**Root causes found and fixed, not just patched:**
- `ewp_validator/src/main.ts`'s nav block was raw hand-typed HTML that simply never gained a 4th `<a>` when `ew_wiki` was registered — the missing-button bug.
- The "shape not aligned" bug was 2 real CSS differences, not a rendering quirk: `ew_toolkit/src/style.css` had `position: sticky`, `ewp_validator/src/style.css` had `flex: none` instead, and `ew_wiki`'s copy had neither (plus a redundant `font-family` override and Starlight-token colors instead of the raw shared tokens). Unified to `position: sticky` + `flex: none` together (safe in both a scrolling page and the validator's fixed-height flex layout) and the raw `--panel`/`--border`/etc. tokens everywhere.
- Also fixed per maintainer request while resolving: `ew_wiki`'s nav icon changed from the generic `toolbox` fallback to a dedicated `book` glyph.

**Verified on live pages** (not just source diffs): built all 3 Tools + the combined hub via WSL (`node scripts/build-hub.mjs`), served the real `dist/` output, browsed all 3 pages. Landing page, validator, and wiki now render the identical nav bar — same shape, spacing, colors, and all 4 buttons — confirmed by screenshot.

**Spun off, not fixed here**: the favicon is a separate 3-way duplication (2 accidental byte-identical copies + `ew_wiki` serving Starlight's own default icon, not the toolkit's) — different technical mechanism (static asset, not shareable code) — see [ticket 22](22-unify-favicon.md).
