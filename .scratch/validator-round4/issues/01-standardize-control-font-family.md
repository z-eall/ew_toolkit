# Standardize font-family across all interactive controls

Type: task
Status: resolved
Blocked by: (none)
Parent: [Validator Round 4 map](../map.md)

## Question

The scripter reported the FILTER dropdown's text "seems different" from the
rest of the UI, expecting a standing hub-wide font rule to have already
caught this.

Live-verified root cause (`getComputedStyle` in the browser preview, sidebar
sort/filter menu open):

| Selector | Element type | Computed `font-family` |
|---|---|---|
| `.sort-item .menu-label` | `<button>` | `Arial` (UA default) |
| `.menu-toggle-all` | `<button>` | `Arial` |
| `.validate-btn` | `<button>` | `Arial` |
| `.icon-btn` | `<button>` | `Arial` |
| `.filter-item .menu-label` | `<label>` | `-apple-system, "Segoe UI", Roboto, sans-serif` (correct) |
| `.mode-toggle button` | `<button>` | `-apple-system, "Segoe UI", Roboto, sans-serif` (correct — this one class already sets `font: inherit` explicitly, `style.css` ~601) |

Root cause: `body` sets the hub's font stack (`style.css` ~36), but
`<label>` elements inherit it normally while `<button>`/`<input>`/`<select>`
elements do not by default — every browser gives form controls a UA-default
font unless a rule explicitly overrides it. `.mode-toggle button` happens to
have that override; nothing else does. This is a global gap, not a
FILTER-menu-specific one — the scripter's own repro (FILTER text) is just
the most visible instance.

Fix: add one global rule (near the existing `* { box-sizing: border-box; }`
reset at the top of `style.css`) restoring inheritance for every form
control:

```css
button, input, select, textarea {
  font-family: inherit;
}
```

Then re-verify in the browser preview that `.sort-item`, `.menu-toggle-all`,
`.validate-btn`, and `.icon-btn` all compute the hub sans-serif stack, and
confirm nothing that deliberately wants a different font (e.g. `.problems`'s
monospace, `#editor`'s Monaco-managed font) regressed — those live inside
elements that aren't form controls, or (per the existing `.catfilter-menu`/
`.report-menu` override) already have their own explicit `font-family`, so
the global rule should only ever fill gaps, never fight an existing
deliberate override. Grep `style.css` for every `<button`/`<input`/`<select`
class site as a completeness check, not just the ones already found live.

Live-verify: screenshot or computed-style check confirming every button
class above now matches `body`'s font stack, both themes, no regressions in
`.mode-toggle`, `.catfilter-menu`, `.report-menu`, or the Monaco editor.

## Answer

Added the global reset at `style.css`:23-30 (right after the existing
`* { box-sizing: border-box; }` block):

```css
button,
input,
select,
textarea {
  font-family: inherit;
}
```

Verified via `getComputedStyle` in a live preview (`npm --prefix
ewp_validator run dev -- --port 5175`, navigated directly rather than
through `preview_start`'s name lookup — see caveat below):
`.validate-btn` and `.icon-btn` now compute
`-apple-system, "Segoe UI", Roboto, sans-serif` (previously `Arial`).
`.mode-toggle button` (which already had its own explicit `font: inherit`
at `style.css` ~608, now redundant but harmless) is unaffected.
`.menu-toggle-all` / `.sort-item .menu-label` / `.filter-item .menu-label`
live inside the sidebar's sort/filter dropdown, which only renders once a
file is loaded, so they weren't reachable via `querySelector` without
uploading a fixture; confirmed instead by grep (`grep -n "font-family|font:"
style.css`) that neither has any explicit `font-family` rule of its own, so
the same cascade mechanism that fixed `.validate-btn`/`.icon-btn` (a bare
element-selector reset, beaten only by more-specific class selectors)
applies identically.

Grepped every `font-family`/`font:` declaration in `style.css` (8 total) to
confirm no existing deliberate override collides: `.problems`'s monospace
(~828, a `<div>`, not a form control — unaffected regardless), the
`.catfilter-menu`/`.report-menu` sans-serif override (~879), the
`.confirm-list-scroll ul`'s monospace (~1318, a `<ul>`, not a form control),
and two other `font: inherit`/`font-family: inherit` rules (~608, ~931,
~980) that are now redundant but harmless. All of these are class or
compound selectors, so they retain higher specificity than the new bare
`button, input, select, textarea` rule regardless of source order — no
regression risk. Monaco's editor font is managed by Monaco itself inside a
canvas/contenteditable surface, untouched by this CSS.

`npx vitest run` (243 tests) and `npx tsc --noEmit` both pass clean.

**Tooling caveat for future sessions in this worktree**: `preview_start`
with a `name` resolves `.claude/launch.json` against the harness's primary
working directory (the outer `C:\Users\Ultimate\Claude`), not this
worktree's `cwd` — even after `cd`. In this worktree that outer
`launch.json` points `ewp_validator` at the **sibling** `ew_toolkit`
checkout, so a name-based `preview_start` silently ran `npm --prefix
ew_toolkit/ewp_validator run dev` on port 5173 instead of this worktree.
No harm resulted (it only rewrote gitignored `schema.generated.json`/
`rpcParams.generated.ts` in that sibling checkout, confirmed no git diff),
but I stopped that server immediately and instead started Vite manually via
Bash (`npm --prefix ewp_validator run dev -- --port 5175 --strictPort`) and
used `preview_start`/`navigate` with the explicit `http://localhost:5175/…`
URL to attach the Browser pane to it. Screenshot capture also failed in
this session ("Browser pane is not displayed, so the page is not
compositing frames") even after `preview_start`; fell back to
`javascript_tool` (`getComputedStyle`) for verification instead, which
worked fine. Recommend future sessions in this worktree do the same
(manual Vite + explicit URL, `javascript_tool` over `screenshot`) rather
than trusting `preview_start`'s name-based launch.json resolution.
