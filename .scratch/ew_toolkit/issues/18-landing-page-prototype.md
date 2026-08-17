# Prototype the landing page

Type: prototype
Status: resolved
Blocked by: [16-restructure-into-hub-layout.md](16-restructure-into-hub-layout.md)

## Question

Design and prototype the hub's root landing page: a small vanilla Vite/TS app (matching the validator's existing `src/main.ts` style, no framework) that lists available Tools and links to each one's subpath. Ship the hardcoded Tool-registration list (name/subpath/description) that this map's Notes already lock in as the v1 mechanism.

Open design questions to resolve here: visual layout for a 1-2-Tool list, whether/how to show a tagline (the old map's ticket 14 left this as an optional cosmetic bit, carried into this map's Not-yet-specified), and how much of the current validator page's own look-and-feel (if any) the landing page should echo for visual consistency.

Use the `/prototype` skill per this map's Notes.

## Answer

Prototyped 3 structurally different variants (minimal list, card grid + tagline, validator-echo chrome) switchable via `?variant=` on the live route, per `/prototype`'s UI branch. User reviewed against an external reference, https://valheimtools.stream/ (a similar Valheim-tooling site they use), and picked a fusion: that site's row layout — a button per Tool with its description beside it — combined with this map's own minimalist dark chrome (closest to prototype variant C's palette, not the reference site's own colors). User also asked for a light/dark theme toggle (dark default, persisted via `localStorage`), which wasn't one of the original open questions but was folded in as part of the same decision.

Landing page tagline: yes, shown as a subtitle under the "EW Toolkit" h1 (resolves the old map's ticket 14 cosmetic bit and this map's "Not yet specified" item).

Shipped directly to `src/main.ts` / `src/style.css`. The 3-variant switcher code was never committed (iterated straight to the fused design in the working tree once the user gave feedback), so there's no separate prototype artifact to preserve on a throwaway branch — the fused design here is the only decision that landed.

**Follow-on (same review pass):** user pointed at valheimtools.stream again for its fixed top nav — persistent across every page, current page highlighted — and asked for the same here, plus a 3rd nav entry "Support" (placeholder page: appreciation text + donation links for Jere and the site owner, both still TODO) and a theme-toggle label fix (show current theme, not the switch target).

Implemented as a shared `src/nav.ts` (hardcoded nav-item list + theme logic, same v1-hardcoded-list principle as the Tool registry) consumed by both `src/main.ts` (Home) and the new `src/support.ts`/`support.html` (Support, a second Vite entry point relocated by `scripts/build-hub.mjs` from `dist/support.html` to `dist/support/index.html` so it serves at `/support/`). Nav order is fixed: Home, then Tools in registration order, Support always last — future Tools insert between the last Tool and Support. The EWP Validator app (separate Vite project, no shared workspace tooling) got the same nav markup/CSS duplicated by hand, with relative links (`../`, `./`, `../support/`) since it always lives one level under the hub root.

Verified via `npm run dev` and a full `npm run build:hub` + `vite preview`: nav links and active-page highlighting work in both dev and the production layout, `/support/` resolves correctly post-build, and the validator's own nav correctly links back out.
