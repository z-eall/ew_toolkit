# Standing rule: diagnosis messages hint at the UI action that fixes them

Type: grilling
Status: resolved
Blocked by: (none)

## Question

The scripter wants diagnosis messages to point at an existing UI button when
one directly resolves the problem — their example: a message about an
invalid file should hint "use the trash-bin icon" (the Clear Invalid
action, see [Clear Invalid scope](../validator-ui-polish/issues/01-clear-invalid-scope.md))
rather than leaving the scripter to discover that button on their own. This
is explicitly asked as a **standing rule**, not a one-off message edit — so
it needs a durable convention, not a single ticket's worth of text changes.

Grill toward a concrete answer:

1. Inventory which current diagnoses have a direct one-click UI fix
   available (Clear Invalid → invalid-file problems; is there anything
   else? check Clear-All, per-group remove, per-file remove) versus
   diagnoses that have no UI shortcut at all (most Structure/Value/
   Reference problems require the scripter to actually edit the YAML) —
   ground this with a real pass over `main.ts`'s action buttons before
   asking the scripter to decide scope, so the question isn't guessed at.
2. Format: does the hint append to the existing message text
   (`"... — use the 🗑️ trash icon to clear it."`) or render as a separate
   visual affordance (an inline action link/button inside the diagnosis row
   itself, e.g. a small "Clear" button next to that specific problem)? The
   two-line tag redesign this session already added structure to each row
   — decide whether this is a third visual element or folds into the
   existing message text.
3. Where does this rule live — does it become a new line item in the
   hub-wide message-quality checklist
   ([EW Toolkit map](../../ew_toolkit/map.md) Notes), and does it interact
   with the [Editable Message & Category Catalog map](../../message-catalog/map.md)'s
   upcoming YAML catalog (if a message's wording becomes scripter-editable,
   can the scripter also edit *which* button it points to, or is that
   fixed in code)?
4. Scope for this pass specifically: implement for every diagnosis that
   currently has a UI shortcut (per question 1's inventory), or start with
   just the Invalid-file example and leave the rest for a follow-up once the
   pattern is proven?

## Resolution

**1. Inventory (real pass over `main.ts`'s action buttons):**
- Diagnoses with a direct one-click UI fix: **Invalid file** (`fileNameCheck.ts`)
  → trash-dropdown's "Clear invalid files"; **Legacy but working / legacy
  filename** (`fileNameCheck.ts`'s "rename to data*.yaml" notice) → the
  filename text is already click-to-rename (`renameFile`).
- No UI shortcut at all (require a YAML edit): Structure problem, Value
  problem, Reference problem — always; and the *other* two "Legacy but
  working" messages (legacy `delay:`, legacy `spawn:`/`swap:` in
  `structuralPrecheck.ts`) — same category as the filename one, but no
  button fixes these.
- Conclusion: the rule is **per-message, not per-category** — "Legacy but
  working" mixes a UI-fixable message with two that aren't.

**2. Format:** append to the existing message text (e.g. "... — use the 🗑️
trash icon's 'Clear invalid files' to remove it."), not a separate inline
action element. Avoids a third visual element on an already-restructured row
and avoids wiring new click handlers into the diagnosis row.

**3. Where it lives:** added as item 7 of the hub-wide message-quality
checklist ([EW Toolkit map](../../ew_toolkit/map.md) Notes) — a durable
standing rule, per-message not per-category. Catalog-editability (can the
scripter edit which button a message points to) deferred until the
message-catalog YAML catalog actually exists — nothing to author-control yet
since current messages are hardcoded template strings.

**4. Scope:** both cases implemented this pass (same two-line change, two
message strings in `fileNameCheck.ts`) — proves the pattern on two different
actions (remove vs. rename), not just one.

**Implementation:** [fileNameCheck.ts](../../../ewp_validator/src/fileNameCheck.ts)
— both the Invalid-file and legacy-filename messages now name the fixing UI
control. Existing test (`fileNameCheck.test.ts`) uses `toContain`, so it
covers the new text without a fixture change.
