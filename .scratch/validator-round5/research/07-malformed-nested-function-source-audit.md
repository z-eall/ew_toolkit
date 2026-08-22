# Malformed nested `<...>` reference — source audit (extra bracket / extra underscore)

Answers ticket `07-malformed-nested-function-source-audit.md`. Fetched fresh from
`raw.githubusercontent.com/JereKuusela/valheim-expand_world_prefabs/main`, 2026-08-22, saved
locally and read in full with a line-numbered reader (not WebFetch's summarizing pass — same
reason round4 research/05 avoided it: need byte-exact line citations):

- `ExpandWorldPrefabs/service/data/Functions.cs` (1138 lines, same file round4 research/05 already
  audited for the *well-formed*-dispatch side; this ticket needed different sections of the same
  file — `Replace`/`ResolveFunctions` (lines 24-88), not previously quoted line-by-line).
- `ExpandWorldPrefabs/service/Parse.cs` (448 lines) — `Kvp`, line 187-192.

**Central finding, stated up front:** the existing `.scratch/validator-round2` and `referenceValidation.ts`
comments describe EWP's `_`-splitting as "top-level"/nesting-aware (matching what `splitTopLevel`/
`walkKeySegments` in this repo implement). That description is correct for the *outcome* scripters
observe, but it is **not how EWP's own code works**. `Parse.Kvp` (`Parse.cs:187-192`) is a **naive
`str.IndexOf(separator)`** — first literal occurrence, zero awareness of `<...>` nesting — used for
*every* `_`/`=` split in `Functions.cs` (`GetFunction`'s function-name/argument split, `TryReplaceFunction`'s
default-value split, `SetValue`'s key/value split, and every argument-taking handler's own internal
split). The "nesting-aware" *effect* referenceValidation.ts's static scanner correctly reproduces is an
**emergent property of resolution order**, not of the split primitive itself: `ResolveFunctions`
(`Functions.cs:65-88`) finds and resolves the **innermost** `<...>` group first (via `str.IndexOf(">", i)`
then `str.LastIndexOf("<", end)` — nearest preceding `<`, not a depth-matched one), replaces it with
plain resolved text, and only then re-scans — so by the time any `_`/`=`-split code actually runs on a
substring, that substring is normally already bracket-free, and the naive first-occurrence split lands in
the right place *only because there's nothing else nested left to confuse it*. This distinction is exactly
where a malformed bracket (which changes *which* substring gets treated as "innermost") produces different
behavior than the well-formed case, and it's the mechanism behind both worked examples below.

---

## Worked example 1 — extra underscore: `<save_bossKillCount__<int_bossKills=0>>`

Intended: `<save_bossKillCount_<int_bossKills=0>>` (save a key named `bossKillCount`, with the value
read from the object's `int` ZDO field `bossKills`, defaulting to `0`). Typo: a doubled `_` between the
key name and the nested value.

Trace (source-cited at each step):

1. `Replace` (`Functions.cs:24-64`) finds the single outer balanced `<...>` group via its nesting
   counter — unaffected by the double underscore (it only counts `<`/`>`, not `_`) — and hands the
   whole thing to `ResolveFunctions`.
2. `ResolveFunctions` (`Functions.cs:65-88`) finds the **innermost** group first: first `>` in the
   string is the one closing `<int_bossKills=0>`; `LastIndexOf("<", ...)` from there finds that
   group's own `<` (the extra `_` sits *outside* this span, so it doesn't affect which group is found
   here). `TryReplaceFunction` resolves it via `ObjectFunctions`' `int` head (ZDO field lookup, source-cited
   in round4 research/05 — `ObjectFunctions.cs:63-70,88-100`) — say it returns `"3"`. The string is now
   flat: `<save_bossKillCount__3>`.
3. Re-scanning the now-flat string, `TryReplaceFunction` strips the outer `<`/`>`, then `GetFunction`
   (`Functions.cs:106-124`) does `Parse.Kvp(key, '_')` (naive `IndexOf('_')`) — finds the **first**
   literal `_` in `"save_bossKillCount__3"`, which is the one right after `"save"` (unaffected by the
   double underscore, since it's further in the string) → `key="save"`, `arg="bossKillCount__3"`.
4. `GetValueFunction("save", "bossKillCount__3", ...)` dispatches to `SetValue("bossKillCount__3")`
   (`Functions.cs:229`, `SetValue` at `Functions.cs:409-415`), which itself does `Parse.Kvp(value, '_')`
   — again naive first-occurrence. In `"bossKillCount__3"`, the first `_` is the one right after
   `"bossKillCount"` — consuming **only that one character** — so the split yields
   `Key="bossKillCount"`, `Value="_3"` **(the second, extra underscore survives as a leading character
   of the stored value)**.
5. `DataStorage.SetValue("bossKillCount", "_3")` — the **key name saved is correct** (`"bossKillCount"`,
   matching what a well-formed reference would have saved), but the **stored value is `"_3"`, not
   `"3"`** — a silent, persistent data corruption. No exception, no log line (`Functions.cs`/`Parse.cs`
   contain no `Log.*`/`Logger.*` calls anywhere, confirmed by round4 research/05 §2's grep). A later
   `<load_bossKillCount=0>` or an arithmetic function consuming it (`Parse.TryInt("_3")`) fails to parse
   and silently falls back to whatever default the *reader* specified — a second layer of silence.

**Why this matters for static analysis, and why it's a new gap, not a duplicate of ticket 06's
custom-key checks:** `referenceValidation.ts`'s `scanKeyOccurrences` (line 227-265) extracts the
*key name* for read/write-orphan matching via `splitTopLevel(inner, "_")[0]` — and for this exact
input, that correctly yields `"bossKillCount"`, matching what `SetValue` actually stores the key as
(step 5). **The key-name tracking ticket 06 built is unaffected by this bug** — the corruption is
entirely in the *value* portion, which `referenceValidation.ts` has never inspected (by design — it
only tracks key names, not value content). So this is a genuinely new class of defect, invisible to
every check that exists today.

**Is it statically detectable with acceptable confidence?** Yes, narrowly. The signal is: **two
adjacent literal `_` characters at the top level (i.e., not inside a `<...>` group) immediately
preceding a nested `<...>` group**, inside a `<save_.../<save++_.../<save--_.../<load_.../<clear_...>`
key template — the exact domain `scanKeyOccurrences`/`walkKeySegments` already parse. Reasoning for
low false-positive risk:
- `Parse.Kvp`'s naive-first-occurrence split means a doubled `_` **never has a legitimate meaning**
  anywhere in this dispatch chain — there's no EWP feature where an empty string between two
  underscores does anything useful; it can only ever consume one `_` and leave the other as a stray
  character. It is at best inert-but-suspicious, at worst corrupting.
- It must be scoped to `_` immediately preceding a `<...>` group (`__<`), not "any doubled underscore
  anywhere in a key name" — a scripter's key name *can* legitimately contain a literal `"__"`
  (DataStorage doesn't care what characters are in a key), so flagging every doubled underscore in
  arbitrary literal text would be a real false-positive risk. Scoping to "immediately before a nested
  group" avoids that: a scripter typing a deliberate double-underscore as part of a purely-literal key
  name is a real but different pattern than one that happens to sit right at a dynamic-parameter
  boundary — the latter is overwhelmingly more likely to be a fat-fingered extra separator than
  intentional styling.
- **Not** flaggable in general argument lists (e.g. `<mid_text__5_3>` on a pure-computation function):
  round4 research/05 §3b already established that pure math/text functions degrade gracefully
  (`Parse.TryInt`/`TryFloat` never throw, fall back to `defaultValue`) — worth noting the *mechanism*
  here is the same naive-Kvp-split root cause, but the *consequence* is graceful degradation, not
  persistent corruption, so it doesn't clear the same bar. Scope the new check to the `save`/`save++`/
  `save--` domain specifically, where the consequence is writing bad data to `DataStorage` — a
  materially worse, silent, and persistent outcome the existing pure-function analysis didn't cover.

---

## Worked example 2a — extra bracket, doubled outer pair: `<<save_bossKillCount_<int_bossKills=0>>>`

Intended: `<save_bossKillCount_<int_bossKills=0>>` (well-formed). Typo: one extra `<`/`>` pair
wrapping the whole thing.

Trace:

1. `Replace`'s nesting counter (`Functions.cs:24-64`) treats this as one balanced group (nesting goes
   0→1→2→3 across the three `<`, then 3→2→1→0 across the three `>`, extracting only when nesting drops
   to exactly 0 at a `>` that started from nesting 1) — the **entire** string, extra wrapper included,
   is handed to `ResolveFunctions` as one chunk.
2. `ResolveFunctions`'s innermost-first search (step 2 above) is unaffected by the extra *outer* pair —
   it still finds and resolves `<int_bossKills=0>` first, same as example 1, leaving:
   `<<save_bossKillCount_3>>`.
3. Re-scanning: first `>` is now the *first* of the two trailing `>`. `LastIndexOf("<", ...)` finds the
   **nearer** of the two leading `<` — i.e., the **second (extra) one**, not the outermost one. The
   substring extracted is `<save_bossKillCount_3>` — the well-formed inner content. `TryReplaceFunction`
   resolves this correctly: `SetValue("bossKillCount_3")` does `Parse.Kvp("bossKillCount_3", '_')` →
   `Key="bossKillCount"`, `Value="3"` → **`DataStorage.SetValue("bossKillCount", "3")` — the save
   genuinely succeeds, correctly, with the correct value.** `SetValue` returns `kvp.Value = "3"`.
4. But the *replacement* only covers the inner match (from the second `<` through the first trailing
   `>`) — the outermost extra `<` (position 0) and the outermost extra trailing `>` (the very last
   character) are **never consumed**, because they were never part of any group `ResolveFunctions`
   matched. The string becomes `<3>` (the leftover extra wrapper now flanking the correctly-resolved
   value).
5. `ResolveFunctions` scans again: `<3>` is itself a balanced group. `TryReplaceFunction` strips the
   brackets → key `"3"`. `Parse.Kvp("3", '_')` finds no `_` → `GetFunction` returns `null` immediately
   (`Functions.cs:114-115`, `if (keyArg.Value == "") return null;`). Falls to `ResolveValue` (the
   value-group fallback round4 research/05 §2 already traced in full) — no value group is named `"3"`
   → returns the input unchanged. `TryReplaceFunction` returns `false`. `<3>` is left as **literal
   text in the final output.**

**Net result: the save genuinely happens (correct key, correct value, verified in step 3) — but the
text left behind in the document is the literal string `"<3>"`, not the clean `"3"` a well-formed
reference would have produced.** This is worse than round4 research/05 §2's ordinary "unrecognized
function → literal passthrough" case in one specific way: it's not indistinguishable from a deliberate
choice, and it's not harmless — if this `<...>` sits inside a field a *later* step expects to be a
clean number (e.g. nested one level further inside another function's argument, or a typed `int`/
`float` data field), the stray `<`/`>` characters will fail to parse there too, propagating the
corruption instead of just leaving obviously-wrong-looking text.

**Is it statically detectable?** Yes, precisely, with a narrow structural shape: an outer balanced
`<...>` group (found by the same depth-counting `findGroupEnd` already in `referenceValidation.ts`)
whose entire inner content is *itself* exactly one single balanced `<...>` group spanning the whole
inner span, with nothing else around it — i.e. `inner.length > 0 && findGroupEnd(inner, 0) === inner.length`.
This "redundant double-wrapper" shape:
- Is checkable with the exact primitive already in this file (`findGroupEnd`), no new parsing needed.
- Is low-false-positive: legitimate decorative text that happens to contain two adjacent literal `<`
  characters (e.g. a chat message reading `<<WARNING>>`) does **not** have this shape, because the
  *inner* content in that case is real text (`"<WARNING>"` is not itself one more balanced `<...>`
  group spanning the whole span in the way this check requires — wait, it actually is one balanced
  group: `<WARNING>` balances). **This is a real caveat worth flagging explicitly**: `<<WARNING>>`
  decorative chat text and `<<save_x_<int_y>>>` malformed syntax have the *identical* structural
  shape (outer wrap around one inner balanced group) — a purely structural check cannot tell them
  apart. The distinguishing signal has to be semantic, not just structural: only flag the redundant-
  wrapper shape when the **inner** group's head matches a known/plausible EWP function shape (reuses
  `isRecognizedFunctionGroup`/`scanUnrecognizedFunctionHeads`'s existing head-matching, already in this
  file) — i.e., only warn when unwrapping the redundant outer pair would land on something that looks
  like a real EWP function call, not on arbitrary decorative text. This keeps the check meaningfully
  scoped to the `<...>` reference domain the ticket cares about, not free-form chat/message strings.

---

## Worked example 2b — extra bracket, unmatched single: `<save_bossKillCount_<<int_bossKills=0>>`

Typo: an extra `<` before `int`, with no corresponding extra `>` (net bracket count in this span:
3 `<` vs. 2 `>` — genuinely unbalanced).

Trace: `Replace`'s nesting counter (`Functions.cs:24-64`) increments on every `<` and only extracts a
group when a `>` brings nesting back down to exactly 0 having started the run at 1. With one extra
unmatched `<`, nesting never returns to 0 within this span — **no group is ever extracted from this
text at all.** If this is the entire field value, the whole thing (including the inner `<int_bossKills=0>`
that would otherwise have resolved fine on its own) is emitted as pure literal text — no save happens,
nothing resolves, matching round4 research/05 §2's ordinary "falls through, no error, left as literal"
outcome. This alone is not worse than the already-documented "unrecognized function" case.

**But there is a materially worse failure mode this trace exposes**: `Replace` is called once per
string field and its nesting counter is **stateful across the entire field's text**, not scoped to one
`<...>` reference. An unmatched extra `<` anywhere earlier in a field's text means nesting is
permanently off-by-one for the *rest* of that field — **every subsequent, otherwise-well-formed
`<...>` reference later in the same string value can be swallowed into the wrong group, or never
individually extracted at all**, because the nesting count at their `>` will no longer be the `1` the
extraction condition requires. One malformed bracket can silently break unrelated, correctly-written
templates elsewhere in the same field. (This is inferred directly from `Functions.cs:24-64`'s counter
logic — no test case in the fetched source confirms it empirically, but the mechanism is unambiguous
from the code: nesting is a single running counter across the whole call, with no per-group reset or
recovery.)

**Is it statically detectable?** Yes, trivially — this is exactly what `findGroupEnd` (`referenceValidation.ts:114-124`)
already computes and returns `-1` for. **The gap here is not a missing detection primitive — it's that
every call site in this file that hits a `-1` explicitly discards it** with a comment claiming it's
"left for the structural pre-check" (`referenceValidation.ts:236`, `:588`, `dataFieldValidation.ts:194`
has its own copy of `findGroupEnd` with the same shape). That hand-off target does not exist:

---

## Confirming the ticket's "what's already confirmed" section's open question

The ticket asked to check whether `structuralPrecheck.ts` (or `formatLint.ts`) already catches
unbalanced `<`/`>` at the YAML/text level before assuming this needs new detection. **It does not.**
Read `structuralPrecheck.ts` in full (683 lines) and grepped `formatLint.ts`: `structuralPrecheck.ts`'s
only two sources of errors are (a) `parseDocument`'s YAML syntax errors/warnings, and (b) ajv schema
validation against `schema.generated.json`. Angle brackets have no special meaning in YAML — an odd or
mismatched count of `<`/`>` characters inside a plain or quoted scalar is completely ordinary,
syntactically valid YAML text; `parseDocument` will never flag it, and ajv only checks field *shape*
(string/array/object/enum), never string *content* for this. `formatLint.ts`'s `KEY_CHECKS` array (the
only content-pattern-checking code in either file, per grep) contains no bracket-counting logic either.

**So the "leave for structural pre-check" comments in `referenceValidation.ts` are currently
describing a check that does not exist anywhere in this codebase.** Every `<...>` reference with an
unbalanced bracket count is silently invisible to every diagnostic in `ewp_validator` today — not
merely under-prioritized, but literally unreachable by any existing code path. This is the single
clearest, highest-confidence finding of this audit.

---

## Answers to the ticket's three questions

**1. Extra underscore** — Yes, changes resolution, confirmed via source trace (worked example 1).
`Parse.Kvp` is a naive first-occurrence split at every level of dispatch, not bracket-aware; a doubled
`_` immediately before a nested `<...>` group survives as a stray leading character in the *value* a
`save`/`save++`/`save--` writes to `DataStorage`, silently corrupting persisted state with no error
anywhere. Statically detectable with high confidence when scoped narrowly: two adjacent top-level `_`
characters immediately preceding a `<...>` group inside a save/load/clear key template. Not
generalizable to arbitrary argument-taking functions' arguments — there the same root mechanism only
produces graceful, already-accepted-as-normal degradation (round4 research/05 §3b), not persistent
corruption, so it doesn't clear the same bar for a new warning.

**2. Extra bracket** — Does not uniformly fail structurally before reaching function resolution;
behavior depends on the exact shape:
   - An unmatched, genuinely-unbalanced bracket count (worked example 2b) never reaches function
     resolution for that span at all (silently left as literal text, matching the "unrecognized
     function" no-op shape) — but can also corrupt *other*, well-formed references later in the same
     field by permanently offsetting `Replace`'s nesting counter. This shape is **already computed** by
     this file's own `findGroupEnd` (`-1` return) but is currently discarded under a false assumption
     that `structuralPrecheck.ts` catches it elsewhere — confirmed above that it does not. This is not
     a "gap needing new detection logic" — it's a wiring gap: the signal already exists and is being
     thrown away.
   - A redundant *matched* extra outer pair (worked example 2a) passes bracket-balance checking
     (it's balanced) but still produces silently-wrong output: the real function call underneath
     executes correctly (including persistent side effects like a `save`), but the substituted text
     is corrupted with stray literal `<`/`>` characters. Statically detectable via a narrow structural
     shape (`inner` is itself exactly one balanced group spanning its own full length), but must be
     additionally gated on the inner content looking like a real EWP function head — the pure
     structural shape alone is indistinguishable from legitimate decorative double-angle-bracket text
     (e.g. chat message styling).

**3. Scope boundary** — There is a real, confidently-detectable subset, but it is **narrower and more
surgical** than "malformed nested references in general," and it splits into two very different kinds
of fix:
   - **(a) Unmatched/unbalanced bracket count** — not a new detection problem at all, just a
     currently-discarded signal (`findGroupEnd`'s `-1`) that needs to be surfaced as a diagnostic
     instead of silently skipped. This is the highest-confidence, lowest-effort, zero-new-false-positive
     item — it was never going to false-positive because an unbalanced count is never valid EWP syntax
     under any reading.
   - **(b) Doubled top-level underscore immediately before a nested group, inside a save/load/clear key
     template** — a new, narrow heuristic with a source-verified corruption mechanism and a low
     false-positive design (scoped to the exact `__<` shape, not bare doubled underscores in literal
     text).
   - **(c) Redundant matched double-wrapper `<<...>>`** — real and source-verified, but needs the extra
     "inner content looks like a real function head" gate to avoid false-positiving on decorative text;
     more implementation-fiddly than (a)/(b) and lower-frequency in practice (a scripter has to
     literally double-type both the open and close bracket correctly for this exact shape to occur,
     whereas (a)/(b) are single fat-finger slips).

The honest overall verdict is **not** "no gap exists" (round5 ticket 01's precedent, applied honestly
here, does not repeat — this audit found a real, source-confirmed, currently-unreachable gap) and
**not** "the whole 'extra bracket or extra underscore' class is worth one broad warning" either — most
of the plausible malformation space (arbitrary extra underscores inside general function arguments,
brackets that are unbalanced in ways not covered by (a)/(b)/(c)'s narrow shapes) either degrades
gracefully in ways EWP itself already treats as normal (round4 precedent) or requires case-by-case
runtime tracing this static scan can't generalize. Recommend building (a) and (b) for ticket 08 — both
have concrete, source-verified mechanisms, narrow high-confidence detection shapes, and reuse existing
primitives (`findGroupEnd`, `walkKeySegments`/`splitTopLevel`) with no new parsing infrastructure.
Recommend treating (c) as optional/lower-priority — real, but lower frequency and needs the extra
semantic gate to stay low-noise; ticket 08 can decide whether it's worth the added complexity or should
be split into its own follow-up.

---

## Concrete recommendation for ticket 08

**Build now, `kind: "malformed-reference"`, severity `warning` (matching the ticket's ask):**

1. **Unbalanced bracket surfacing.** In `scanKeyOccurrences` (`referenceValidation.ts:227-265`) and
   `scanUnrecognizedFunctionHeads` (`referenceValidation.ts:612-626`), the existing `if (end === -1) continue;`
   lines currently discard the signal. Instead of only `continue`-ing past a KEY_HEAD_RE match or a
   `<`-scan candidate, add a **separate scan** that finds every `<` in the (comment-stripped) text
   whose `findGroupEnd` returns `-1`, and every `>` with no plausible preceding unmatched `<` (the
   mirror case — an extra `>`) and reports each as: `"Unbalanced '<'/'>' — this reference never closes
   (or closes with no matching open). EWP's own parser leaves this — and, if it's not the last such
   reference in the field, everything after it in the same string — as literal, unresolved text."`
   Point the range at the lone bracket character found. Cite the field-wide-nesting-counter mechanism
   (`Functions.cs:24-64`) in the message/comment to explain the "everything after it" clause.

2. **Doubled top-level underscore before a nested group, in a save/load/clear key.** Extend
   `scanKeyOccurrences`'s `save`/`save++`/`save--`/`load`/`clear` branches: after extracting `inner`,
   scan it (respecting `<...>` groups as opaque, i.e. only at the same "top-level" positions
   `splitTopLevel`/`walkKeySegments` already compute) for a literal `__` immediately followed by a `<`.
   Report: `"Doubled '_' right before a nested '<...>' parameter — EWP's key/value split only consumes
   one underscore, so the extra one becomes a leading '_' baked into the saved value ('_X' instead of
   'X'), silently, with no error."` Cite `Parse.cs:187-192` and `Functions.cs:409-415`.

**Optional / lower priority, same severity if built:**

3. **Redundant double-wrapper `<<...>>`.** In `scanUnrecognizedFunctionHeads`'s balanced-group scan,
   after computing `inner` for an outer match, check `findGroupEnd(inner, 0) === inner.length`; if so,
   recurse one level to get the *inner* group's own head, and only report if that inner head passes
   `isRecognizedFunctionGroup` (i.e., unwrapping the redundant pair reveals a real function call, not
   decorative text). Report: `"Extra matched '<'/'>' pair around a real function call — the function
   still runs (including any side effect like a save), but the result text keeps stray '<'/'>'
   characters around it, which can break whatever reads this value next."` Cite the worked-example-2a
   trace above.

None of these three need new parsing primitives — all reuse `findGroupEnd`/`walkKeySegments`/
`splitTopLevel`/`isRecognizedFunctionGroup`, already present in `referenceValidation.ts`.

---

## Confidence

High for the core mechanism claims (`Parse.Kvp`'s naive-`IndexOf` implementation, `Replace`'s
nesting-counter extraction, `ResolveFunctions`'s innermost-first `LastIndexOf`-based search, `SetValue`'s
own internal `Kvp` split) — every claim traces to a specific fetched-and-read line range in `Functions.cs`
(24-64, 65-88, 89-104, 106-124, 228-232, 409-415) or `Parse.cs` (187-192), fetched fresh from `main` on
2026-08-22.

Medium for the two full worked-example traces (1, 2a, 2b) — the step-by-step character-index walk-through
was done by hand against the quoted source logic, not run against the actual compiled mod, so a
transcription slip in the trace is possible even though the underlying rules (Kvp is `IndexOf`,
`ResolveFunctions` finds nearest-preceding `<`, `Replace`'s nesting counter is field-wide-stateful) are
directly source-confirmed. Re-deriving the trace against a live EWP+Valheim instance, if one becomes
available, would raise this to High.

Low/inferred: the claim in worked example 2b that an unmatched bracket can corrupt *later, unrelated*
references in the same field is a direct logical consequence of the field-wide nesting counter
(`Functions.cs:24-64` has no per-group reset), but no worked test case in the fetched source
demonstrates it empirically — flagged the same way round4 research/05 flagged its own medium-confidence
`iter`/`iter2` claim, for the same reason (mechanism confirmed by code-reading, not by observed output).
