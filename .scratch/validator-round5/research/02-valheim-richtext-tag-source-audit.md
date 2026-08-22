Type: research
Status: answered

## Question

Source-verify the complete (or as-complete-as-practically-enumerable) set of
RichText markup tags Valheim's own UI/chat text supports, so
`ewp_validator`'s `scanUnrecognizedFunctionHeads()` stops flagging them as
"Unknown EWP function name" false positives, and determine whether a cheap
shape-based rule can recognize them instead of a hardcoded exhaustive
tag-name list.

## Summary / Answer

Valheim's chat/UI text renders through stock Unity **TextMeshPro (TMP)**,
unmodified as far as any source available to this repo shows — there is no
evidence of a Valheim-specific tag vocabulary, and no Valheim-specific
restriction of which stock TMP tags are enabled. The repro examples in the
ticket (`<#ddd>`, `</b>`, `<br>`, `<#00ff00>`, `</color>`, `<#fff000>`,
`<size=15>`) are all stock TMP tags, not a custom Valheim set.

**A shape-based rule works for most of the class, but not all of it** — see
§2 for the one part that genuinely needs a short hardcoded name list, and
§2d for the one real collision risk found (already a non-issue in current
code, explained below).

Recommended implementation: add an `isRichTextTag(inner)` guard at the top
of `scanUnrecognizedFunctionHeads()`'s loop (before the `<head_...>` split),
with three branches — two pure-shape, one small bounded allow-list. Full
code sketch in §3.

## 1. The tag set

### 1a. Where "Valheim's own source" actually lives (or doesn't)

The ticket suggested checking `https://github.com/Valheim-Modding` for
Valheim's own source/decompile. I enumerated that org's repos directly:

```
AssetRipper, CommonPackages, ExampleMod, Jotunn, JotunnModExample,
JotunnModStub, ModSettings, Valheim.DisplayBepInExInfo, ValheimLib, Wiki
```
(`gh api orgs/Valheim-Modding/repos`, checked 2026-08-22)

None of these hold Valheim's own game source or a decompile of it. `Wiki`
(https://github.com/Valheim-Modding/Wiki) is a *Unity project setup guide*
for modders (`Valheim-Unity-Project-Guide`), not game source. `Jotunn` and
`ValheimLib` are community mod-support libraries; they wrap and extend the
game's APIs but don't redistribute IronGate's own C#. So there is no
first-party "Valheim's own source" available through this org to grep for a
custom tag table — the ticket's assumption that such a repo exists there
turned out not to hold, which the ticket itself flagged as a possibility
("don't assume a specific repo name without checking").

Given that, the next-best evidence is:
- **Unity's own TextMeshPro manual** (the actual rendering engine Valheim's
  text runs through) — this is authoritative for *what tag shapes TMP
  parses*, which is the mechanical question the validator cares about.
- **Community decompile evidence that Valheim's chat text is TMP_Text**,
  confirming the engine identification.
- **Community confirmation that Valheim's own text surfaces (signs, using
  the same in-game text renderer family) actually accept these tags**,
  confirming Valheim hasn't disabled/restricted the tag set TMP ships with.

### 1b. Confirmation Valheim's chat/UI text is TextMeshPro

Decompiled Valheim chat mods on Thunderstore (BetterChat, Chatter — both
distribute decompiled source alongside the mod) show `MessageHud` and chat
UI elements typed as `TMP_Text`/`TextMeshProUGUI`, not legacy Unity `Text`:
- https://thunderstore.io/c/valheim/p/Crystal/BetterChat/source/
- https://thunderstore.io/c/valheim/p/ComfyMods/Chatter/v/2.6.0/ ("Chatter... updated almost all Text components to TMP_Text equivalents")

This matches the ticket's own framing ("Valheim's in-game text ... is built
on TMP") — treated here as confirmed, not re-derived.

### 1c. TMP's supported tag table (primary source)

Unity's official TextMeshPro manual, fetched 2026-08-22:
- Index: https://docs.unity3d.com/Packages/com.unity.textmeshpro@3.2/manual/RichTextSupportedTags.html
- Raw table source: https://raw.githubusercontent.com/needle-mirror/com.unity.textmeshpro/master/Documentation~/include-rich-text-tags.md

Full tag table (33 tags), reproduced from the source above:

| Tag | Arg via `=`? | Notes |
|---|---|---|
| `align` | yes | |
| `allcaps` | no (pair) | same as `uppercase` |
| `alpha` | yes | |
| `b` | no (pair) | |
| `br` | no (self-closing, no pair) | |
| `color` | yes | also has a `#RRGGBB` shorthand form (§1d) |
| `cspace` | yes | |
| `font` | yes | |
| `font-weight` | yes | |
| `gradient` | yes | |
| `i` | no (pair) | |
| `indent` | yes | |
| `line-height` | yes | |
| `line-indent` | yes | |
| `link` | yes | |
| `lowercase` | no (pair) | |
| `margin` | yes | |
| `mark` | yes | |
| `mspace` | yes | |
| `nobr` | no (pair) | |
| `noparse` | no (pair) | |
| `page` | no (self-closing) | |
| `pos` | yes | |
| `rotate` | yes | |
| `s` | no (pair) | |
| `size` | yes | |
| `smallcaps` | no (pair) | same as `uppercase` |
| `space` | yes | |
| `sprite` | yes | |
| `strikethrough` | no (pair) | |
| `style` | yes | |
| `sub` | no (pair) | |
| `sup` | no (pair) | |
| `u` | no (pair) | |
| `uppercase` | no (pair) | |
| `voffset` | yes | |
| `width` | yes | |

Source for the `=`/no-arg split per tag: the individual `RichText*.md` pages
linked from the table above (spot-checked `RichTextColor.md`,
`RichTextSize.md`, `RichTextMark.md` directly — see quotes in §1d/§2).

### 1d. The `<#RRGGBB>` hex shorthand (not in the table above — separate mechanism)

`RichTextColor.md` (fetched raw, 2026-08-22) documents color two ways:
named colors via `<color="name">`, and hex via `<color=#FFFFFF>` /
`<color=#FFFFFFFF>` — but its own worked example uses the tag **without**
the `color=` prefix:

> ```
> <color="red">Red <color=#005500>Dark Green <#0000FF>Blue <color=#FF000088>Semitransparent Red
> ```

confirming `<#RRGGBB>` (and `<#RRGGBBAA>`) is valid TMP shorthand syntax on
its own, not just as `color=`'s argument value.

Community confirmation that Valheim specifically accepts the **3- and
4-digit** shorthand forms too (`<#RGB>`, `<#RGBA>`) — matching the ticket's
`<#ddd>` repro example exactly — comes from a Steam Community guide on
Valheim sign text (signs use the same in-game TMP-based text renderer
family as chat/tooltips):
https://steamcommunity.com/sharedfiles/filedetails/?id=3030696826

> "Colorization in Valheim signs can be done using HTML color tags like
> `<#FF0000>` for red, or using the shorthand form `<#FF0>` for yellow...
> A fourth digit can be added to the shorthand form to lower the alpha
> channel... such as `<#0F08>`."

This is a secondary/community source, not Unity's or IronGate's own docs,
but it's in-game empirical confirmation of exactly the tag shape the ticket
asked about, and matches the ticket's own repro. Treated as corroboration,
not sole authority — the *shape* (`#` + 3/4/6/8 hex digits) is what the
implementation needs, and that shape is consistent between Unity's own
6/8-digit-documented form and this 3/4-digit community-confirmed extension
(TMP's hex parser accepts all four lengths; Unity's manual page just doesn't
happen to show the 3/4-digit examples).

## 2. Tag shape vs. EWP function head shape

Recall EWP's own head-parsing rule (source-verified in
`referenceValidation.ts`'s existing comments, `scanUnrecognizedFunctionHeads`
+ `isRecognizedFunctionGroup`): a `<...>` group's entire inner content is
first tried whole against a no-arg name table; failing that, it's split on
the **first top-level `_`**, and the piece before that `_` is the head,
checked against an arg-taking name table. Every real EWP head is a bare
identifier (letters, digits, and the two literal `save++`/`save--` names) —
**no known or plausible EWP head starts with `/` or `#`, and no EWP head
ever contains `=` before its first `_`** (EWP's own argument separator is
always `_`, never `=` — confirmed by every one of the 79 names in
`ARG_FUNCTION_HEADS`/`ARG_OBJECT_FUNCTION_HEADS`, and by the `<load_key=default>`
example in this same file's `scanKeyOccurrences`, where the `=` appears
*after* the `_`-delimited head, never before it).

That gives three independently-safe shape checks and one bounded-risk one:

**(a) Closing tags — `/...` — pure shape, zero collision risk.**
Every TMP closing tag is `</name>` with no argument ever. No EWP head can
start with `/` (not a valid identifier character, not used anywhere in the
79-name catalog). Safe to skip on `inner.startsWith("/")` alone, regardless
of what follows — no name list needed.

**(b) Hex color shorthand — `#` + 3/4/6/8 hex digits — pure shape, zero
collision risk.** No EWP head starts with `#`. Safe to skip on
`/^#[0-9a-fA-F]{3,4}$|^#[0-9a-fA-F]{6}$|^#[0-9a-fA-F]{8}$/` alone (lengths
3, 4, 6, 8 only — 5 and 7 aren't valid TMP hex forms and shouldn't be
silently swallowed if they show up, since they're more likely a scripter
mistake than a real tag).

**(c) `name=value` attribute tags — bounded allow-list, not open shape.**
This is the one place a blanket shape rule ("any bare identifier followed by
`=` before any `_`") is *not* safe to use unrestricted, even though no
*current* EWP head collides with it. Reasoning: this validator's whole
purpose for this code path is catching typos against the real EWP
`<head_arg>` convention. If a scripter fat-fingers `<load_foo>` as
`<load=foo>` (swapping the argument separator), an unrestricted
"identifier=value → assume richtext, skip" rule would silently swallow that
typo instead of flagging it — a real, if narrow, regression risk, and
exactly the kind of collision the ticket asked to be called out explicitly.

  Mitigation (already anticipated by the ticket's own phrasing, "a
  known-tag-name-then-`=`" check): restrict this branch to a short, fixed
  set of the TMP attribute-tag names from §1c's table (the ones marked
  "yes" for `=`) — `align, alpha, color, cspace, font, font-weight, gradient,
  indent, line-height, line-indent, link, margin, mark, mspace, pos, rotate,
  size, space, sprite, style, voffset, width` (21 names). A typo'd EWP head
  like `load=foo` doesn't match any of these, so it still falls through to
  the existing unrecognized-function path and gets flagged (today's
  behavior, unchanged). This list is TMP's own fixed vocabulary — it only
  changes if Unity revises TMP's tag set, which is exactly the kind of
  stable, rarely-touched list this repo already accepts elsewhere (e.g. the
  existing `ARG_FUNCTION_HEADS` catalog).

**(d) Bare no-arg pair/self-closing tags — bounded allow-list, not
shape-detectable at all.** `<b>`, `<i>`, `<u>`, `<s>`, `<br>`, `<sub>`,
`<sup>`, `<mark>` (bare), `<nobr>`, `<noparse>`, `<page>`, `<allcaps>`,
`<uppercase>`, `<lowercase>`, `<smallcaps>`, `<strikethrough>` have *no*
distinguishing shape — they're bare identifiers with no `/`, `#`, or `=`, so
none of the three checks above can recognize them. They need a small
hardcoded name set, same as (c). This is unavoidable, not a missed
shape-rule opportunity: a bare short identifier is structurally identical to
a bare EWP no-arg function name (e.g. `x`, `y`, `z`, `i`, `j`, `a`, `pos`,
`rot`), so nothing but a name list can tell `<b>` (richtext) from a
hypothetical single-letter EWP typo apart.

  **One real, already-resolved collision found here:** TMP's `<i>` (italics)
  is a bare identifier that collides letter-for-letter with EWP's own `i`
  no-arg function (`ObjectFunctions.GetGeneralParameter`, already in
  `NO_ARG_OBJECT_FUNCTION_NAMES` in `referenceValidation.ts`). This is not a
  new problem to solve — `<i>` is *already* silently recognized today, just
  for the wrong reason (it's read as EWP's object-index function, not as
  italics). Functionally harmless either way (both readings mean "don't
  flag this"), but worth documenting explicitly since the ticket asked to
  call out any real collision: **do not add `i` to a new bare-tag set** —
  it's already covered, and adding it again would be redundant, not wrong.
  No other name in (d)'s list collides with any of the 79 known EWP heads
  (checked each of the 16 names above against `NO_ARG_FUNCTION_NAMES`,
  `NO_ARG_OBJECT_FUNCTION_NAMES`, `ARG_FUNCTION_HEADS`,
  `ARG_OBJECT_FUNCTION_HEADS` in the current source — no other overlap).

## 3. Scope: tag argument values (Q3)

Per the ticket's own framing and Round 4's precedent (not statically
checking EWP function *argument* validity), tag argument values are out of
scope here too, for the same reason: TMP silently ignores malformed/unknown
attribute values (e.g. an out-of-range `<size=999999>` just renders huge
text, doesn't error), so there's no "silent no-op you'd want to catch"
pattern here the way there might be for something that hard-fails. Recognize
the tag **head** shape only, per (a)-(d) above, and stop there — same scope
line this file already draws for EWP functions themselves (recognize the
head, never validate the argument).

## 4. Implementation recommendation

Add a guard function and call it first in `scanUnrecognizedFunctionHeads()`,
before the existing `isRecognizedFunctionGroup`/split logic — richtext tags
are a categorically different thing from EWP functions, not another
function name to add to the existing tables, so keep it a separate skip
rather than merging into `KNOWN_ARG_HEADS`/`KNOWN_NO_ARG_NAMES` (that would
also incorrectly make richtext tag names show up in `suggestFunctionName`'s
"did you mean" candidate pool for real EWP typos).

```ts
// RichText tags (Valheim's chat/UI text runs through Unity TextMeshPro,
// confirmed by decompiled MessageHud/chat mod source using TMP_Text — see
// research/02-valheim-richtext-tag-source-audit.md §1b) are not EWP
// functions and must never be flagged as unrecognized ones. Recognized by
// shape wherever the shape alone is unambiguous (closing tags, hex color
// shorthand); by a short fixed TMP tag-name list only where shape can't
// tell a richtext tag apart from a bare/short EWP head (§2c/§2d of that
// research — the one real collision found there, TMP's `<i>` vs EWP's own
// `i` object function, is already handled by the existing EWP name tables
// and deliberately NOT duplicated here).
const TMP_HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const TMP_ATTRIBUTE_TAG_NAMES = new Set([
  "align", "alpha", "color", "cspace", "font", "font-weight", "gradient",
  "indent", "line-height", "line-indent", "link", "margin", "mark",
  "mspace", "pos", "rotate", "size", "space", "sprite", "style",
  "voffset", "width",
]);

// Bare pair/self-closing tags with no distinguishing shape. `i` deliberately
// omitted — already recognized via EWP's own `i` object-function name.
const TMP_BARE_TAG_NAMES = new Set([
  "b", "u", "s", "br", "sub", "sup", "mark", "nobr", "noparse", "page",
  "allcaps", "uppercase", "lowercase", "smallcaps", "strikethrough",
]);

function isRichTextTag(inner: string): boolean {
  if (inner.startsWith("/")) return true; // closing tag, any name
  if (TMP_HEX_COLOR_RE.test(inner)) return true; // <#RGB>/<#RGBA>/<#RRGGBB>/<#RRGGBBAA>
  const eq = inner.indexOf("=");
  const underscore = inner.indexOf("_");
  if (eq !== -1 && (underscore === -1 || eq < underscore)) {
    const name = inner.slice(0, eq).toLowerCase();
    if (TMP_ATTRIBUTE_TAG_NAMES.has(name)) return true;
  }
  return TMP_BARE_TAG_NAMES.has(inner.toLowerCase());
}
```

And in `scanUnrecognizedFunctionHeads()`:

```ts
const inner = text.slice(i + 1, end - 1);
if (isRichTextTag(inner)) continue; // <-- new, before isRecognizedFunctionGroup
if (isRecognizedFunctionGroup(inner)) continue;
```

This directly fixes every example in the ticket's repro (`<#ddd>` → (b),
`</b>` → (a), `<br>` → (d), `<#00ff00>` → (b), `</color>` → (a), `<#fff000>`
→ (b), `<size=15>` → (c)), plus the rest of TMP's documented tag set,
without hardcoding an exhaustive list for the two shape-safe categories, and
with only two short (21- and 15-entry) fixed lists for the categories where
shape genuinely can't do the job — matching this repo's low-maintenance
preference as closely as the actual grammar allows.

## Sources

- Valheim-Modding org repo listing — `gh api orgs/Valheim-Modding/repos` (checked 2026-08-22): AssetRipper, CommonPackages, ExampleMod, Jotunn, JotunnModExample, JotunnModStub, ModSettings, Valheim.DisplayBepInExInfo, ValheimLib, Wiki. No game-source/decompile repo present.
- https://github.com/Valheim-Modding/Wiki/wiki/Valheim-Unity-Project-Guide — confirms `Wiki` repo is a Unity-project setup guide, not game source.
- https://docs.unity3d.com/Packages/com.unity.textmeshpro@3.2/manual/RichTextSupportedTags.html — official TMP supported-tags index.
- https://raw.githubusercontent.com/needle-mirror/com.unity.textmeshpro/master/Documentation~/include-rich-text-tags.md — full 33-tag table (mirror of Unity's own docs source).
- https://raw.githubusercontent.com/needle-mirror/com.unity.textmeshpro/master/Documentation~/RichTextColor.md — `<color=...>` and `<#RRGGBB>` shorthand documentation and example.
- https://raw.githubusercontent.com/needle-mirror/com.unity.textmeshpro/master/Documentation~/RichTextSize.md — `<size=...>` px/percent/relative argument forms.
- https://raw.githubusercontent.com/needle-mirror/com.unity.textmeshpro/master/Documentation~/RichTextMark.md — `<mark=...>` hex-with-alpha argument form.
- https://steamcommunity.com/sharedfiles/filedetails/?id=3030696826 — community guide confirming Valheim's own text renderer (signs) accepts 3-/4-digit hex shorthand (`<#FF0>`, `<#0F08>`), matching the ticket's `<#ddd>` repro.
- https://thunderstore.io/c/valheim/p/Crystal/BetterChat/source/ and https://thunderstore.io/c/valheim/p/ComfyMods/Chatter/v/2.6.0/ — decompiled/documented evidence that Valheim's `MessageHud`/chat UI uses `TMP_Text`/`TextMeshProUGUI`, confirming the engine.
- `C:\Users\Ultimate\Claude\ew_toolkit\ewp_validator\src\referenceValidation.ts` — this repo's existing EWP function-name catalog (`NO_ARG_FUNCTION_NAMES`, `NO_ARG_OBJECT_FUNCTION_NAMES`, `ARG_FUNCTION_HEADS`, `ARG_OBJECT_FUNCTION_HEADS`) and `scanUnrecognizedFunctionHeads`/`isRecognizedFunctionGroup`, checked against every proposed richtext tag name for collisions.
