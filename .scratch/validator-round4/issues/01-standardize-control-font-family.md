# Standardize font-family across all interactive controls

Type: task
Status: open
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

(pending)
