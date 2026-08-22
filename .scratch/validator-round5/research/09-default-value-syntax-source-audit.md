# EWP's `<name=default>` fallback-value syntax — source audit

Answers ticket `09-default-value-syntax-source-audit.md`. Fetched fresh from
`raw.githubusercontent.com/JereKuusela/valheim-expand_world_prefabs/main`, 2026-08-22
(direct `curl` fetch, not the WebFetch summarizing pass — same reason every other file in
this round avoided it: need byte-exact line citations), saved locally and read in full:

- `ExpandWorldPrefabs/service/data/Functions.cs` (1138 lines — same line count as every
  prior fetch this round, confirmed byte-identical). New close-read for this ticket:
  `TryReplaceFunction` (89-104), `GetFunction` (106-124), `GetGeneralFunction` (126-153),
  `GetArg` (902-905), and the `par` value-form case (226). Round4/round5-05/round5-07
  already covered other sections of this same file — not re-fetched separately, reused as
  ground truth per the ticket's own framing.
- `ExpandWorldPrefabs/service/data/ObjectFunctions.cs` (242 lines). New close-read:
  `GetGeneralParameter` (33-55) and its call signature — confirms this override's no-arg
  table never even receives a `defaultValue` parameter.
- `ExpandWorldPrefabs/service/Parse.cs` (448 lines). `Kvp` (187-192) — already
  source-verified by round5 research/07 as a naive `IndexOf`-based first-occurrence split;
  reused directly here, not re-derived, since this ticket's new finding is about *where*
  `Kvp` gets called with `'='` relative to the rest of dispatch, not about `Kvp`'s own
  mechanics.
- `ewp_toolkit/ewp_validator/src/referenceValidation.ts` (this repo), read in full per the
  ticket's instructions — `isRecognizedFunctionGroup` (500-504), `NO_ARG_FUNCTION_NAMES`/
  `NO_ARG_OBJECT_FUNCTION_NAMES`/`ARG_FUNCTION_HEADS`/`ARG_OBJECT_FUNCTION_HEADS` (429-472),
  `scanUnrecognizedFunctionHeads` (662-684), `splitTopLevel` (155-179), and
  `parseTypeKeyParameter`'s unrelated `=`-as-default handling for `type: key` (76-86, a
  different, `data.yaml`-specific feature, not EWP's `<...>` template engine — confirmed not
  the same mechanism as this ticket's finding, see the note at the end of §1).

---

## Q1 — Where does `=default` get parsed out, structurally?

**Uniformly, before any dispatch runs at all — not scoped to the argument portion of an
arg-taking call.** `TryReplaceFunction` (`Functions.cs:89-104`) is the entry point every
`<...>` group hits (round5-05's Q1 already traced `ResolveFunctions` handing each innermost
balanced pair here). Quoting it in full:

```csharp
private bool TryReplaceFunction(string rawKey, bool allValues, out string? resolved)
{
  var key = rawKey.Substring(1, rawKey.Length - 2);
  var keyDefault = Parse.Kvp(key, '=');
  var defaultValue = keyDefault.Value;
  // Ending with just '=' is probably a base64 encoded value.
  if (defaultValue.All(c => c == '='))
    defaultValue = "";
  else
    key = keyDefault.Key;

  resolved = GetFunction(key, defaultValue);
  if (resolved == null)
    resolved = allValues ? ResolveConditionValue(rawKey) : ResolveValue(rawKey);
  return resolved != rawKey;
}
```

Line by line:

1. `rawKey` is the whole bracketed text including `<`/`>` (round5-05 confirmed `rawKey` is
   always exactly one already-innermost-resolved balanced pair by the time this runs).
   Line 91 strips just the brackets.
2. **Line 92 — the `=`-split runs on the *entire* remaining text, unconditionally, before
   `GetFunction` (the no-arg/arg-taking dispatcher) is even called.** `Parse.Kvp(key, '=')`
   is the same naive `str.IndexOf('=')` first-occurrence split round5-07 already
   source-verified for `_` (`Parse.cs:187-192`) — here it's the exact same primitive, just
   called with `'='` as the separator instead. This is not a code path *inside*
   `GetFunction`; it happens entirely in the caller, before `key` is handed to `GetFunction`
   at all.
3. Lines 94-98 are a narrow guard, not a scoping restriction: if the text after the first
   `'='` consists **entirely** of `'='` characters (including the vacuous case of no `'='`
   present at all, where `Kvp` returns an empty `Value`), the split is treated as *not*
   having happened — `key` is left as `keyDefault.Key` in the no-`'='`-found case (trivially
   the same as the original text), but in the found-but-all-`'='` case `key` is **not**
   reassigned at all, leaving the trailing `=...` characters stuck on the front portion.
   This is a real, source-confirmed edge case (documented in §3's edge-case note below), not
   part of the ticket's main question — it only matters for a bracket text that is
   *literally* `something=` or `something==` etc. with nothing else after the first `=`,
   which a real base64 default value (many characters, only the trailing 0-2 chars are `=`
   padding) essentially never produces, since `Kvp` splits at the *first* `=`, and a real
   base64 payload has non-`=` characters both before and after that first `=` occurrence in
   the overwhelming majority of cases (it would only trigger if the base64 string's very
   first character were itself `=`, which never happens for real base64 output).
4. **Line 100 — only now, after `key` has already had any `=default` suffix stripped off,
   does `GetFunction(key, defaultValue)` run** (`Functions.cs:106-124`) — this is the
   no-arg-then-arg-taking dispatcher round4's research already traced. It first tries the
   *entire* (already `=`-stripped) `key` against the no-arg table (`GetGeneralFunction`,
   line 112), and **only if that returns `null`** does it do the *second*, independent split
   on `'_'` (`Parse.Kvp(key, Separator)`, line 114) to peel off an arg-taking head.

**Answer to the ticket's precedence question:** `=` is checked/split first, always,
unconditionally, on the *whole* bracket content — before the no-arg table is even
consulted, and therefore necessarily before the `_`-split (which only runs at all if the
no-arg check on the `=`-stripped text already failed). `_` is checked second, and only ever
operates on the *remaining* (already `=`-stripped) key. There is no code path in this repo
where `_` is split before `=`, and no code path where `=`-stripping is conditional on which
dispatch branch (no-arg vs. arg-taking) eventually matches — **the split happens before
either branch is chosen.** This directly answers the ticket's framed alternative in favor of
"uniform, applies to any recognized name," not "only within the argument portion of an
arg-taking call."

**Worked confirmation with the ticket's own repro**, `<par2=H4sIAAAA...AA==>`:
`key` after line 91 = `"par2=H4sIAAAA...AA=="`. `Parse.Kvp(key, '=')` finds the *first* `=`
(right after `par2`) → `keyDefault.Key = "par2"`, `keyDefault.Value = "H4sIAAAA...AA=="`
(everything after, trailing `==` padding and all — `IndexOf` only ever splits once, at the
first occurrence, so the payload's own internal/trailing `=` characters stay part of
`defaultValue`, never re-split). That value is not *entirely* `=` characters (it has many
other characters), so the line-95 guard doesn't fire → line 98 runs → `key = "par2"`.
`GetFunction("par2", "H4sIAAAA...AA==")` → `GetGeneralFunction("par2", ...)` hits the exact
case label `"par2" => GetArg(2, defaultValue)` (`Functions.cs:134`) directly. **This
resolves correctly in EWP today** — the scripter's example is not, and never was, invalid
EWP syntax; it is purely a validator false positive, exactly as the ticket's chart-time
repro established.

---

## Q2 — Is `par2` a genuinely distinct dispatch path from `par_2`, or the same value reached two ways?

**Both.** They are two structurally distinct dispatch routes — different tables, different
argument-parsing rules — that happen to converge on the identical underlying helper call for
the specific case of index `2`.

- **`par2`** is a *hardcoded, per-digit case label* in the no-arg table
  (`GetGeneralFunction`, `Functions.cs:126-153`):
  ```csharp
  "par2" => GetArg(2, defaultValue),
  ```
  Ten literal labels exist, `par0` through `par9` (lines 132-141) — indices 0-9 only, each
  its own switch arm with the index baked in as a C# literal. No parsing of the index
  happens at all; the digit is only ever a distinguishing character in the *name itself*.
- **`par_2`** reaches the *value-form* `par` case in the arg-taking table (`GetValueFunction`,
  `Functions.cs:226`):
  ```csharp
  "par" => Parse.TryInt(value, out var i) ? GetArg(i, defaultValue) : defaultValue,
  ```
  Here `"par"` is the fixed dispatch key (matched via the `_`-split, `Functions.cs:114`,
  peeling `key="par"`, `arg="2"` from `"par_2"`), and `2` is *parsed at runtime* from
  whatever text follows the `_` (`Parse.TryInt(value, ...)`) — so `par_2` and `par2` are not
  even parallel in *how* the index is obtained (compile-time literal vs. runtime int parse).
  Critically, this means `par_2` is **not bounded to 0-9** the way the no-arg `par0`-`par9`
  family is — `<par_47>` is valid syntax (dispatches to `GetArg(47, defaultValue)`) with no
  no-arg equivalent, since there is no `par47` case label. `GetArg`'s own bounds check
  (`args.Length <= index || args[index] == "" ? defaultValue : args[index]`,
  `Functions.cs:902-905`) means an out-of-range index just falls back to `defaultValue`
  rather than throwing — consistent with round4 research/05 §3b's "silent degrade, not
  error" pattern for every other numeric-argument function in this file.
- **Both routes terminate at the exact same private helper**, `GetArg(int index, string
  defaultValue = "")` (`Functions.cs:902-905`) — for index `2` specifically, `par2` and
  `par_2` produce byte-identical results for byte-identical `args`/`defaultValue` inputs,
  because they're literally the same function call underneath. This is not a coincidence to
  be preserved as "one canonical form" though — `par0`-`par9` exist as their own no-arg
  entries precisely *because* they're common enough to warrant a shorter, argument-free
  spelling; `par_X` exists as the general escape hatch for any index (including the ones
  `par0`-`par9` don't cover, and any index computed dynamically via a nested `<...>` group,
  e.g. `<par_<par0>>`).

**Consequence for the validator:** `par2` and `par_2` correctly stay on their respective
no-arg/arg-taking tables (`NO_ARG_FUNCTION_NAMES` vs. the `par` entry in
`ARG_FUNCTION_HEADS`) — they are genuinely different dispatch shapes reached through
genuinely different code paths in source, not a single case that got listed twice. The fix
this ticket is scoping does **not** need to unify them into one check; it only needs each
existing branch to independently tolerate a `=default` suffix, which (per Q1) is exactly
what EWP's own source does to both — uniformly, at the `TryReplaceFunction` layer, before
either branch is even chosen.

---

## Q3 — Does `=default` apply to any no-arg name, or is it scoped narrower (e.g. just `par0`-`par9`)?

**Two different, both source-confirmed answers depending on what "applies" means — this is
the ticket's most important nuance, worth stating precisely:**

### 3a. Syntactically — `=default` is accepted (never breaks dispatch) after **every** no-arg name in the catalog, with no exception

Because the `=`-split happens in `TryReplaceFunction`, entirely before `GetFunction` runs
(Q1), the `key` that ultimately reaches the no-arg switch (`GetGeneralFunction` and, in an
object context, `ObjectFunctions.GetGeneralParameter`) has **already** had any `=...` suffix
stripped off, regardless of which no-arg name it turns out to be. There is no per-name
opt-in — the stripping is a property of the calling code (`TryReplaceFunction`), not of the
individual `case` arms in the switch. So `<prefab=fallback>`, `<pid=fallback>`,
`<day=fallback>`, `<x=fallback>` — *any* member of `NO_ARG_FUNCTION_NAMES` or
`NO_ARG_OBJECT_FUNCTION_NAMES` — parses and dispatches to the correct base function exactly
as if the `=fallback` suffix weren't there at all. None of these error, none of them fall
through to the value-group/literal-passthrough fate (round4 research/05 §2) the way the
validator currently, incorrectly, predicts for all of them.

### 3b. Functionally — the default value is only ever *used* by `par0`-`par9`

Whether the stripped-off `defaultValue` has any actual effect depends entirely on whether the
matched `case` arm references its `defaultValue` parameter at all:

- **`GetGeneralFunction`** (`Functions.cs:126-153`, the base no-arg table): scanning every
  arm — `prefab`, `safeprefab`, `par` (bare), `day`, `ticks`, `x`, `y`, `z`, `snap`,
  `amount`, `time`, `realtime` — **none of them reference `defaultValue` in their
  expression.** Only the ten `par0`-`par9` arms do, via `GetArg(N, defaultValue)`
  (`Functions.cs:132-141`). For every other name in this table, `defaultValue` is computed
  by the caller, passed in, and silently discarded — the suffix parses cleanly but has zero
  observable effect.
- **`ObjectFunctions.GetGeneralParameter`** (`ObjectFunctions.cs:33-55`, the 17-name
  object-context extension): **doesn't even have a `defaultValue` parameter in its method
  signature** (`private string? GetGeneralParameter(string key)`, line 33) — it's simply
  never passed one at all. `=default` on `<pid=fallback>`, `<pos=fallback>`, etc. parses
  (per 3a) and dispatches correctly, but there is no code path by which the default value
  could ever reach any of these 17 names even in principle, let alone be used.

**So the honest, precise answer is: `par0`-`par9` are not the boundary of what *parses*
(that boundary doesn't exist — every no-arg name tolerates the suffix), they are the
boundary of what *matters*.** The ticket's own reasoning — "numbered parameters can be
legitimately absent/null when a trigger passes fewer args than expected, which is exactly
the scenario a default value protects against" — is exactly right as the reason `par0`-`par9`
are the *only* no-arg family that was ever designed to consume a default: `GetArg`'s
`args.Length <= index || args[index] == ""` check (`Functions.cs:904`) is precisely "this
value might not exist," which is not true of `prefab`, `x`, `pid`, or any of the others —
those always resolve to *something* concrete from the object's live state, so a fallback for
"the function had no answer" was never a scenario their design needed to handle.

**Implication for scope, stated plainly per the ticket's ask:** the fix needs to be
**broader** than "just allow `=` on par2" — it must allow `=` after **any** name in
`KNOWN_NO_ARG_NAMES`, not just the `par0`-`par9` subset, because that is what EWP's source
structurally does (Q1: the strip happens before the no-arg table is even consulted, with no
per-name gate). Restricting the validator's fix to only the `par`-family would leave the
exact same false-positive bug live for `<prefab=fallback>`, `<pid=fallback>`,
`<day=fallback>`, etc. — syntactically valid EWP (the default is simply inert there), but
still flagged as "Unknown EWP function name" today for the identical structural reason `par2`
currently is. There is no source-backed reason to scope narrower than "the whole no-arg
table" — and no source-backed reason to scope *broader* either (e.g. to arbitrary
argument-taking heads) since that branch already tolerates the suffix correctly, per Q1's
last paragraph and the existing code comment quoted in the ticket's own "what's already
confirmed" section.

---

## Recommendation for `isRecognizedFunctionGroup`

**One change, in the no-arg branch only** (`referenceValidation.ts:500-504`):

```ts
function isRecognizedFunctionGroup(inner: string): boolean {
  // EWP strips a `=default` suffix off the ENTIRE bracket text before any
  // no-arg/arg-taking dispatch runs at all (Functions.cs:89-104,
  // TryReplaceFunction — the `=`-split happens in the caller, unconditionally,
  // before GetFunction/GetGeneralFunction ever sees the key). So every no-arg
  // name tolerates a `=default` suffix, not just the par0-par9 family — source
  // research/09 confirmed the default is only *used* by par0-par9 (via
  // GetArg), but it parses and dispatches cleanly for every other no-arg name
  // too, the suffix is just silently inert there. Split on the first
  // top-level `=` (nested `<...>` groups stay opaque, matching splitTopLevel's
  // existing convention elsewhere in this file — by the time EWP's own naive
  // IndexOf('=') runs, any nested group has already been resolved to flat
  // runtime text, so treating a nested group as atomic here is the correct
  // static-time equivalent, not an approximation).
  const withoutDefault = splitTopLevel(inner, "=")[0] ?? inner;
  if (KNOWN_NO_ARG_NAMES.has(withoutDefault)) return true;
  // The arg-taking branch already tolerates a `=default` (or any) suffix
  // unmodified — `head` is only ever the text before the first top-level `_`,
  // and no EWP function name contains `=`, so `_`-based head extraction is
  // insensitive to where a later `=` sits, matching EWP's own behavior
  // (confirmed research/09 Q1's worked trace of `<par_2=foo>`). No change
  // needed here.
  const head = splitTopLevel(inner, "_")[0] ?? inner;
  return KNOWN_ARG_HEADS.has(head);
}
```

Notes for implementation:

- **Use `splitTopLevel(inner, "=")`, not a naive `indexOf`/`String.split`.** EWP's own
  `Parse.Kvp` *is* a naive first-occurrence `IndexOf`, but that's safe in EWP's runtime only
  because any nested `<...>` group has already been resolved to flat text by the time
  `TryReplaceFunction` runs on the outer bracket (round5-05's Q1 precedent — the same reason
  that research recommended `keyToPattern`/top-level-aware splitting for the value-group fix
  rather than reproducing EWP's naive split literally). The validator never resolves nested
  groups, so a literal `=` character sitting inside a nested group's own text (e.g.
  `<pid_<load_x=default>>`) must not be mistaken for the outer bracket's own default-value
  separator. `splitTopLevel` already exists in this file and already has exactly this
  "treat `<...>` as opaque" behavior — reuse it, don't add a new primitive.
- **No changes needed to `KNOWN_NO_ARG_NAMES`, `KNOWN_ARG_HEADS`,
  `scanUnrecognizedFunctionHeads`, or any of the name tables.** The bug is entirely in
  `isRecognizedFunctionGroup`'s no-arg branch doing an exact whole-text match; every table
  and every call site around it is already correct.
- **Scope is the whole `KNOWN_NO_ARG_NAMES` set** (`NO_ARG_FUNCTION_NAMES` ∪
  `NO_ARG_OBJECT_FUNCTION_NAMES`), not a `par`-only special case — per Q3, this is what the
  source actually does, and narrowing it to `par0`-`par9` would leave `<prefab=x>`,
  `<pid=x>`, `<day=x>`, etc. still falsely flagged for the identical root cause.
- **Optional/low-priority precision detail, not recommended for this pass:** EWP's own
  "ends with only `=` characters" guard (Q1, lines 94-98 of `TryReplaceFunction`) means
  `<par2=>` or `<par2==>` (a default value consisting of *nothing but* equals signs)
  actually does **not** dispatch as `par2` in real EWP — the key is left with the trailing
  `=` stuck on it, fails the no-arg exact match, and falls through to the unrecognized-name
  path. Replicating this exactly would require checking whether
  `splitTopLevel(inner, "=")[1]` (the suffix) is empty-or-all-`=`. This is a vanishingly
  rare, almost certainly never-hand-written shape (a real base64/text default is not just
  padding characters) — recommend leaving the validator slightly more lenient here (treating
  `<par2=>` as recognized when EWP would technically reject it) rather than adding a special
  case for an edge condition no real script is likely to ever hit. Flagged here only so a
  future maintainer doesn't rediscover this as a "gap" — it's a deliberate, low-stakes
  simplification, not an oversight.
- **`scanUnrecognizedFunctionHeads` needs no changes.** It already calls
  `isRecognizedFunctionGroup(inner)` and `continue`s past a match (line 678); fixing the
  function it calls is sufficient. The `head` it computes afterward
  (`splitTopLevel(inner, "_")[0]`, line 679) is only used when the occurrence is *not*
  recognized, for the typo-suggestion pool — unaffected by this change.
- **This is unrelated to `parseTypeKeyParameter`'s `=`-handling** (`referenceValidation.ts:76-86`),
  which the ticket's own "what's already confirmed" section flagged as a *different* prior
  instance of `=`-as-default in this codebase. That code parses `type: key, dataName value`
  — a `data.yaml`-level trigger-parameter field, a completely separate EWP feature from the
  `<...>` string-template engine this ticket audited. The two `=`/default mechanisms are
  unrelated in source (different C# call sites, different files, different purposes) and
  this fix does not touch or depend on that code path.

---

## Test cases worth adding (for the follow-on implementation ticket)

Straight from this audit's worked traces:

- `<par2=H4sIAAAA...AA==>` (the ticket's real repro) — must now be recognized.
- `<par2>` bare and `<par_2>` — already recognized today, must remain so (regression guard;
  confirms the fix doesn't accidentally change the no-`=` case).
- `<prefab=fallback>`, `<pid=fallback>`, `<day=fallback>` — other no-arg names with a
  `=default` suffix, previously unaffected by any existing test since the ticket's repro was
  `par`-specific; these confirm the fix is scoped to the whole no-arg table, not just `par`.
- `<par_47=fallback>` — an arg-taking `par_X` outside the 0-9 no-arg range, with a default;
  confirms the arg-taking branch (already correct, untouched by this fix) still works
  alongside the no-arg fix.
- `<pid_<load_x=default>>` (or similar) — a nested group containing its own literal `=`,
  sitting *after* the outer no-arg name with no top-level `=` of its own; confirms
  `splitTopLevel` (not a naive indexOf) is actually being used, and that this case is
  correctly still flagged as unrecognized (`pid` takes no argument, `pid_X` dispatches
  nowhere — a genuine EWP dead end, not a false positive to suppress).
- A genuine typo with a default suffix, e.g. `<prefeb=fallback>` — confirms the fix doesn't
  over-suppress: stripping `=fallback` should yield `prefeb`, which still isn't in
  `KNOWN_NO_ARG_NAMES`, so it must still be flagged (and still get a typo suggestion via
  `suggestFunctionName`).

---

## Confidence

High for everything in Q1 and Q3 — both trace directly to a fully-quoted, fetched-fresh
`TryReplaceFunction`/`GetFunction`/`GetGeneralFunction`/`GetArg` block
(`Functions.cs:89-153,902-905`) and `ObjectFunctions.GetGeneralParameter`'s method signature
(`ObjectFunctions.cs:33`), with no gap between "what the code does" and "what this doc
claims" — the worked trace of the ticket's own repro string was executed by hand against the
quoted source line-by-line, not inferred.

High for Q2's core claim (two distinct dispatch routes converging on the same `GetArg` call)
— directly visible by comparing `Functions.cs:134` (`par2`'s case arm) against
`Functions.cs:226` (`par`'s value-form case arm) side by side; both cited lines were read
directly, not summarized.

Medium for the Q1 base64-edge-case guard's practical irrelevance (§3, "Optional/low-priority
precision detail") — the *mechanism* is directly source-confirmed (`Functions.cs:94-98`
quoted in full), but the claim that real-world base64 default values essentially never
trigger it is a reasoned inference about typical scripter input, not something verified
against actual EWP scripts in the wild (consistent with how round4/round5-05/round5-07 each
flagged their own real-world-frequency claims as inferred, not observed).
