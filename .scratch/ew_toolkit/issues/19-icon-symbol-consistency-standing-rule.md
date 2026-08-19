# Standing rule for icon/symbol consistency in user-facing text vs. UI chrome

Type: grilling
Status: resolved
Blocked by: (none)

## Question

Spotted mid-session (2026-08-19) while working the
[Validator Round 2](../../validator-round2/map.md) map: the hub-wide
message-quality checklist's item 7 (this map's [map.md](map.md) Notes,
"If an existing UI control directly resolves this exact diagnosis, name it
in the message text") shipped its first real instance in `fileNameCheck.ts`
as `use the 🗑️ trash icon's "Clear invalid files"` — a colorful/3D-rendering
emoji glyph inline in message text. The actual toolbar control it's naming
(`ICONS.trash` in `main.ts`) is a flat outline-style stroke SVG, matching
this hub's "minimalist dark chrome" visual identity (locked in
[ticket 18](issues/18-landing-page-prototype.md)). The emoji and the real
icon don't visually match.

Grill toward a concrete answer:

1. Is this worth a standing rule at all, or a one-off wording fix? (It's the
   first instance of item 7 firing, so there's no track record yet of how
   often this pattern recurs — but every future UI-hint message will hit the
   same choice.)
2. If a standing rule: what should message-quality checklist item 7 actually
   require — no emoji at all (name the control in plain text only, e.g.
   "use the trash icon's..." with no glyph); an inline `<svg>` reference
   pulled from the tool's own `ICONS` object so the text glyph always matches
   the real button; or something else?
3. Scope: hub-wide (applies to every Tool this hub ever hosts, same reach as
   the rest of the message-quality checklist) or per-tool (each Tool's own
   icon set, no shared token system)?
4. Does this need an actual shared icon/design-token doc (e.g. "the hub's
   icon style is outline-only, N-px stroke, no filled/colorful glyphs"), or
   is "match whatever `ICONS` already contains in this tool" sufficient
   without writing anything new down?

Fix (if any) touches `fileNameCheck.ts` and the message-quality checklist in
`ew_toolkit/map.md` — coordinate with whichever session owns diagnosis
message UI hints at the time this is picked up, since that's the same file
[Validator Round 2](../../validator-round2/map.md)'s Custom saved key ticket
explicitly stayed out of.

## Answer

**1. Worth a standing rule, not a one-off** — every future UI-hint message
(item 7) will hit the same choice, so leaving it undocumented just repeats
this same correction cycle per instance.

**2. What item 7 requires — plain words only, no glyph, ever.** Verified via
the actual render path first, not guessed: `main.ts:631` inserts
`problem.message` through `escapeHtml()` because the string can contain
scripter-typed content (a key/prefab name from their own file) — a real XSS
boundary, not a style choice, so it can never carry live markup. That rules
out embedding a real `<svg>` inside the message string itself.

A real icon *is* technically possible as a sibling DOM element next to the
message (the row already does exactly this for its copy-button icon,
`icon(ICONS.copy)`, untouched by escaping since it's trusted code, not user
data) — three concrete options were mocked up and compared: (A) plain text
only, (B) a trailing real `ICONS.trash` icon beside the message, (C) a
colored accent-bar with no icon. B was explored further for an inline
mid-sentence placement specifically, which turned out to need a second
"spell it out in words" rendering path for the "Copy diagnosis" clipboard
button (`main.ts:658`, which copies `problem.message` as raw plain text into
whatever the scripter pastes into a bug report) — a real ongoing cost, not
just more code up front.

**Decided: Option A, plain words only.** Cheapest, ships immediately, and
the clipboard/export path needs zero special-casing since the message stays
a single plain string. Item 7 gets one addition: *"name the control's
on-screen label in plain words — never an emoji or icon glyph, since
diagnosis message text is escaped and can never actually carry a live
symbol that matches the real button."*

**3. Scope: hub-wide** — same reach as the rest of the message-quality
checklist, since every future Tool inherits this same escaping constraint
for any user-influenced diagnosis text.

**4. No separate written icon/design-token doc needed for message text**
specifically (there's nothing to encode — plain words, done) — but seeing
this ticket land alongside real, already-existing visual drift (a
copy-pasted icon set, a diverged `--info` CSS variable between the Hub's two
Vite apps) surfaced a broader need: a shared icon/color-token module so
Tools stop *copying* shared visual identity and start *importing* it. That
broader fix is tracked as its own ticket:
[Add a shared icon/token module; migrate the validator to it and fix existing drift](20-shared-icon-token-module.md).

**Fix applied:** `ew_toolkit/map.md`'s message-quality checklist item 7
updated with the plain-words addition above; `fileNameCheck.ts`'s message
changed from `use the 🗑️ trash icon's "Clear invalid files"` to
`use the "Clear invalid files" trash icon` (no emoji, names the exact
on-screen button label) — the only line touched in that file, per the
narrow-edit agreement with the session that owns its other regions.
