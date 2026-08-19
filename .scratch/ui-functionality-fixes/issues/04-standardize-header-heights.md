# Standardize section header height across the hub site

Type: task
Status: resolved
Blocked by: (none)

## Question

The "LOADED FILES" sidebar header and the editor's filename header don't
line up in height:

- `.sidebar-header` (`style.css:171-182`): `padding: 8px 10px; font-size:
  11px; text-transform: uppercase; letter-spacing: 0.05em`.
- `.active-file-name` (`style.css:712-720`): `padding: 4px 10px 4px 12px;
  font-size: 12px`, no uppercase transform.

The vertical-padding delta (8px vs 4px) is what actually drives the height
mismatch; the font-size/case difference is a separate stylistic
inconsistency worth resolving in the same pass since both are "section
header" conventions.

1. Pick one canonical section-header height (recommend converging on the
   *shorter* of the two, 4px vertical padding, so the editor's already-tight
   layout doesn't grow) and apply it to both `.sidebar-header` and
   `.active-file-name`.
2. Decide once whether "section header" style hub-wide means uppercase+
   letterspaced (matches "LOADED FILES") or normal-case (matches the
   filename bar) — since the map's destination says "standardize... across
   the hub site," check `ew_toolkit/src/*` (the hub shell, outside
   `ewp_validator`) for any other section-header-styled element and confirm
   this convention is the one to converge on everywhere, not just these two.
3. Consider introducing one shared CSS class/custom property (e.g.
   `--section-header-height` or a `.section-header` utility class) rather
   than matching the numbers by coincidence in two separate rules, so a
   future third header (a new tool's panel) inherits the standard instead of
   needing its own manual match.

Live-verify: screenshot both headers side by side (and any other
hub-shell header this touches) confirming equal height.

## Answer

Added a shared `.panel-header` class (`style.css`) carrying the common
`padding: 4px 10px`, `border-bottom`, `display: flex`, `align-items: center`
— converged on the *shorter* 4px vertical padding as recommended, so the
editor layout didn't grow. Applied it to `.sidebar-header` and
`.active-file-name` in `main.ts`'s markup (both now `class="... panel-header"`),
removing the padding/border/flex properties that moved into the shared rule
from each one's own block — `.sidebar-header` keeps only its
uppercase/letterspaced/muted styling and `justify-content: space-between`;
`.active-file-name` keeps only `padding-left: 12px` (its one deliberate
asymmetry, overriding the shared rule's left padding) plus its font-size/gap.

**Item 2 (hub-wide check)**: searched `ew_toolkit/src/*` (the hub shell
outside `ewp_validator`) for any other section-header-styled element —
none exist; `nav.ts`/`support.ts`/`main.ts` have no header bar of this kind.
So there's nothing else to converge *yet*; the uppercase-letterspaced-vs-
normal-case question stays exactly as it already was (sidebar keeps
uppercase as a true section *label*, the filename bar stays normal-case
since it displays dynamic content, not a label) — no hub-wide precedent
existed to contradict this, and forcing one convention onto genuinely
different content types (a static label vs. a live filename) isn't the same
kind of "standardize" ask as the height mismatch was.

**Item 3 (shared mechanism)**: done via the `.panel-header` class rather
than matching two numbers by coincidence — a future third panel adopts the
standard by adding one class.

**`.problems-header`**: checked, not touched — its children
(`.problems-tabs`/`.problems-actions`) already use `padding: 4px 6px`
(vertical 4px), so it already matched the new canonical height; restructuring
it onto `.panel-header` would have meant moving padding from children to
container for no visible change, not worth the churn.

Live-verified: `getBoundingClientRect().height` read via `javascript_tool`
confirms all three headers (`sidebar-header`, `active-file-name`,
`problems-header`) now measure exactly 33px. 175/175 tests passing,
type-check clean.
