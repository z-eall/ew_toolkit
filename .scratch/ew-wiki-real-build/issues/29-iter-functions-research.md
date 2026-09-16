# `iter`/`iter2` functions — source research for a solo teaching page

Type: research
Status: resolved

## Question

`<iter_OP_MINI_MAXI_TEMPLATE>` / `<iter2_OP_MINI_MAXI_MINJ_MAXJ_TEMPLATE>` are EWP's "reduce over a range" functions — real, source-confirmed (`Functions.cs:198-199,305-327`) in the existing validator research (`.scratch/validator-round4/research/05-string-template-function-source-audit.md`), but never taught on the wiki. Flagged by the maintainer as a genuinely complex advanced-math topic that needs careful, source-verified treatment to be learnable rather than intimidating. Surfaced by a `/wayfinder` review, 2026-09-14.

Research questions, source-verified against `Functions.cs:305-327` (already fetched in the round4 research — cite/re-confirm rather than re-fetch unless something looks stale):
1. What does `OP` actually do — the small fixed set of reducer operation names (round4's research flagged this as "genuinely checkable," a small enumerable set) — list them precisely, with what each one computes.
2. Walk `iter`'s exact evaluation order for a concrete example (e.g. summing something across a MINI-MAXI range) in plain terms — this is the part most likely to confuse a reader, so get the mechanics exactly right before drafting anything reader-facing.
3. Same for `iter2`'s nested MINI-MAXI/MINJ-MAXJ two-dimensional case.
4. Find or construct a realistic use case an intermediate-to-advanced EWP scripter would actually reach for this to solve — not just a synthetic example.

## Notes

Blocks [ticket 30](30-iter-functions-page.md) (writing the actual teaching page). Keep this ticket to grounding facts, not reader-facing prose.

## Answer

Re-fetched `ExpandWorldPrefabs/service/data/Functions.cs` fresh from
`raw.githubusercontent.com/JereKuusela/valheim-expand_world_prefabs/main/...` on 2026-09-14
(1138 lines — same length as round4's 2026-08-22 fetch, no drift) and read the relevant
sections directly with `sed`/`grep -n`, not a summarizing pass. **The line numbers round4 cited
are still accurate**: dispatch at `Functions.cs:198-199`, `HandleIter`/`HandleIter2` at
`Functions.cs:305-327`. I additionally read the helper chain those two call into
(`Functions.cs:329-405`, not fully quoted in round4) since that's where the actual per-iteration
mechanics live — round4 was scoped to "is `OP` a closed set", not a full mechanics walkthrough.

### 0. The full call chain (needed to answer all four questions precisely)

```
"iter"  => HandleIter(value, defaultValue)      Functions.cs:198,305-314
"iter2" => HandleIter2(value, defaultValue)     Functions.cs:199,316-327
  -> BuildIteratorTemplate(...)                 Functions.cs:329-335
  -> BuildIteratorReduceExpression(...)         Functions.cs:336-364
       -> RenderIteratorTemplate(...) per index Functions.cs:366-375
            -> ReplaceIteratorToken(...) x1-2   Functions.cs:383-405 (word-boundary token swap)
            -> IsIteratorLiteral(...)           Functions.cs:407-410 (float.TryParse check)
```

`HandleIter`/`HandleIter2` do the parsing of the fixed-position arguments (`OP`, `MINI`,
`MAXI`[, `MINJ`, `MAXJ`], template). Everything after `OP`/`MINI`/`MAXI`(`/MINJ`/`MAXJ`) is
rejoined with `_` back into one `TEMPLATE` string (`Functions.cs:312,325`) — so **a template is
allowed to contain its own underscores**; only the first 3 (`iter`) or 5 (`iter2`) `_`-split
segments are consumed positionally.

`BuildIteratorTemplate` (`Functions.cs:329-335`) appends `=defaultValue` to the template if the
caller supplied a default (via `<iter_..._TEMPLATE=default>`) and the template doesn't already
have its own `=`. This just forwards the outer default down so each synthesized per-index
function call degrades the same way the outer `<iter_...>` would have.

### Q1 — the `OP` reducer set

`OP` is **not** a special iter-only vocabulary — it's spliced verbatim into a brand-new function
call string and handed back to the normal `<...>` resolver
(`Functions.cs:363`: `return $"<{operation}_{string.Join(Separator.ToString(), values)}>";`),
which is then re-resolved through the exact same dispatch that handles every other `<...>` in the
file (confirmed by the `Replace`/`ResolveFunctions` comment at `Functions.cs:79`: *"Resolved could
contain functions, so need to recheck the same position"* — `i = start - 1` forces a re-scan of
the position that was just filled in). So **any argument-taking function whose `GetValueFunction`
arg-shape is "any number of `_`-split values" works as `OP`** — round4's §1b table already
enumerates the candidates that fit that shape:

| `OP` | What it computes over the per-index values | Cite |
|---|---|---|
| `add` | sum (or, if every operand strictly parses as a 2-3-component vector, vector sum) | `Functions.cs:193,615-636` |
| `sub` | first value minus each following value, left to right | `Functions.cs:194,639-661` |
| `mul` | product of all values (starts at 1) | `Functions.cs:195,663-693` |
| `div` | first value divided by each following value, left to right; any zero divisor makes the whole thing return `defaultValue` | `Functions.cs:196,695-727` |
| `mod` | first value modulo each following value in sequence; a zero divisor returns `defaultValue` | `Functions.cs:197,730-743` |
| `min` | the smallest of all values | `Functions.cs:191,292-297` |
| `max` | the largest of all values | `Functions.cs:192,298-303` |
| `addlong`/`sublong`/`mullong`/`divlong`/`modlong` | same five ops, long-typed arithmetic instead of float | `Functions.cs:200-204,745-812` |

There is no whitelist or enum anywhere in source restricting `OP` to this list — it's a
consequence of arg-shape compatibility, not a hardcoded set. In practice this **is** a small,
fixed, closed set for scripting purposes: these ~13 names are the only built-in functions that (a)
take a variadic `_`-split list and (b) produce something a scripter would plausibly want to reduce
over a range. Anything else technically compiles (e.g. `OP=left`) but produces nonsense or
`defaultValue`, since `left`'s arg shape (`text, count`) doesn't match "N values to fold." An
invalid/nonsensical `OP` does **not** error — per round4 §2/§3c, it falls through the unrecognized-
function path silently (checked against `data.yaml` value groups, then left as inert literal text
— specifically the *synthesized* `<op_v1_v2_...>` string, not the scripter's original template).

### Q2 — `iter`'s exact evaluation order, worked example

Take `<iter_add_1_3_i>` — sum `i` for `i` from 1 to 3.

1. `HandleIter` receives `value = "add_1_3_i"`. Split on `_` → `["add","1","3","i"]` (4 parts,
   passes the `>= 4` check).
2. `operation = "add"`. `minI = Parse.TryInt("1") = 1`. `maxI = Parse.TryInt("3") = 3`.
3. `template = string.Join("_", values.Skip(3)) = "i"` (only one segment left here — for a longer
   template like `<iter_add_1_3_i_x_10>`, `values.Skip(3)` would be `["i","x","10"]`, rejoined as
   `"i_x_10"` — the template keeps its internal underscores).
4. `BuildIteratorTemplate("i", defaultValue)`: since no explicit default was given in this example,
   `defaultValue == ""`, so the template is returned unchanged: `"i"`.
5. `BuildIteratorReduceExpression("add", "i", 1, 3, null, null, "")`: `operation` and `template`
   are both non-empty, `minI(1) <= maxI(3)`, so it proceeds.
6. Since this is 1D (`minJ`/`maxJ` are `null`), it loops `i` from `minI` to `maxI` inclusive,
   calling `RenderIteratorTemplate("i", i, null)` each pass and appending to a `values` list, **in
   ascending `i` order**:
   - `i=1`: `ReplaceIteratorToken("i", "i", "1")` → the whole template *is* the token `i` with
     word-boundaries on both sides (start/end of string count as boundaries), so it becomes `"1"`.
     `RenderIteratorTemplate` then checks: does `"1"` start with `<`/end with `>`? No. Does it
     parse as a float (`IsIteratorLiteral`)? Yes (`float.TryParse("1")` succeeds) → returned as-is:
     `"1"`.
   - `i=2` → `"2"` (same path).
   - `i=3` → `"3"`.
7. `values = ["1","2","3"]`, count is 3 (not 0, not 1), so:
   `return $"<add_{string.Join("_", values)}>"` → **`"<add_1_2_3>"`**.
8. This string is `HandleIter`'s return value, which flows back up as the result of resolving
   the *original* `<iter_add_1_3_i>` bracket. Because it still contains `<...>`, `ResolveFunctions`
   (`Functions.cs:65-88`) re-scans from the just-filled position (`i = start - 1`,
   `Functions.cs:79-80`) and resolves `<add_1_2_3>` as an ordinary `add` call: `1+2+3 = 6`.
9. Final output: `"6"`.

**Where the token-substitution nuance matters**: `ReplaceIteratorToken` (`Functions.cs:383-405`)
only swaps `i`/`j` when they're not adjacent to another letter/digit — so a template like
`i_min_10` (meaning "compare `i` against 10 using `min`") replaces the leading `i` (boundary: start
of string, then `_`) but would **not** corrupt a token embedded inside a longer identifier — e.g. a
template containing the literal word `time` is untouched because the `i` inside `time` is
adjacent to `t`/`m`, not a boundary.

**The "value is a function call" branch** (not hit in the example above, but real): if after token
substitution the fragment doesn't parse as a plain number, `RenderIteratorTemplate`
(`Functions.cs:371-375`) wraps it as `<...>` instead of leaving it literal — so
`<iter_add_1_3_int_val_i>` with template `int_val_i` would, per index, substitute `i` (e.g.
`int_val_1`), see that `"int_val_1"` doesn't parse as a float, and wrap it as `<int_val_1>` — a
full nested function call that itself gets resolved (reading a ZDO int field named `val_1` off the
current object) before the outer `add` ever runs. This is how `iter` is used for anything beyond
pure arithmetic on the index itself: the template names a *pattern* of per-object data keys
(`val_1`, `val_2`, `val_3`, ...) and `iter` builds the list of `<int_val_N>` lookups, then reduces
them with `OP`.

### Q3 — `iter2`'s nested 2D case, worked example

Take `<iter2_add_1_2_1_2_i>` (ignore `j` in the template on purpose, to show the redundant-summation
trap plainly) — `MINI=1,MAXI=2,MINJ=1,MAXJ=2`.

1. `HandleIter2` splits `"add_1_2_1_2_i"` on `_` → `["add","1","2","1","2","i"]` (6 parts, passes
   the `>= 6` check).
2. `operation="add"`, `minI=1`, `maxI=2`, `minJ=1`, `maxJ=2` (positions 1-4, in that fixed order:
   `MINI, MAXI, MINJ, MAXJ` — **not** `MINI, MINJ, MAXI, MAXJ**; confirmed by the parse order at
   `Functions.cs:319-323`).
3. `template = "i"` (everything after the first 5 segments, rejoined).
4. `BuildIteratorReduceExpression("add", "i", 1, 2, 1, 2, "")`. Both range checks pass
   (`minI<=maxI`, `minJ<=maxJ`).
5. Because `minJ`/`maxJ` both have values, it takes the 2D branch (`Functions.cs:345-352`):
   **`j` is the outer loop, `i` is the inner loop** — `for j in minJ..maxJ: for i in minI..maxI:
   values.Add(RenderIteratorTemplate(template, i, j))`. Concretely, the evaluation order is:
   `(i=1,j=1)`, `(i=2,j=1)`, `(i=1,j=2)`, `(i=2,j=2)` — **`i` varies fastest, `j` varies slowest**
   (row-major with `i` as the "column"). This ordering only matters if `OP` is order-sensitive
   (`sub`/`div`/`mod`); for `add`/`min`/`max`/`mul` it's invisible in the final number, but it
   matters if a scripter is building a positional string instead (e.g. a grid of tile names) rather
   than reducing.
6. Since the template here is just `i` (no `j` token used), each of the 4 renders produces `"1"`,
   `"2"`, `"1"`, `"2"` in that order — `j` never appears in the output text at all, so both rows
   collapse to the same two values. This is a deliberate "gotcha" example: a scripter iterating
   `iter2` but referencing only `i` in the template silently double-counts each `i` value once per
   `j`, rather than erroring — worth flagging explicitly on the teaching page, since it's the kind
   of mistake that produces a plausible-looking but wrong number with no signal anything went
   wrong.
7. `values = ["1","2","1","2"]` (count 4) → `"<add_1_2_1_2>"` → re-resolved → `1+2+1+2 = 6`.

A template that actually uses both tokens, e.g. `<iter2_add_1_2_1_2_i_mul_j>` (per-cell `i*j`, then
summed — a real 2D-grid reduction), would instead render `(1*1)=1`, `(2*1)=2`, `(1*2)=2`,
`(2*2)=4` in that same `j`-outer/`i`-inner order, giving `<add_1_2_2_4>` → `1+2+2+4 = 9`. (Note:
`i_mul_j` here is itself a nested `<...>`-producing template fragment per the Q2 "function call"
branch — `i`/`j` get token-substituted first, then the resulting non-numeric fragment like
`"1_mul_1"` is wrapped as `<mul_1_1>` and resolved before the outer `add` runs. This nesting-of-
iterators-through-synthesized-function-calls is the same mechanism as Q2's `int_val_i` example,
just chained one level deeper.)

### Q4 — a realistic intermediate/advanced use case

The `int_val_i` pattern from Q2/Q3 (reading a numbered sequence of per-object data keys and
reducing them) is not synthetic — it's the shape the `docs/functions.md` description and the
`ObjectFunctions.GetValueFunction` table (round4 §1b, `int`/`float`/`string` reading ZDO
extra-data by key name) exist to support. A concrete, plausible script use: **an EWP rule that
totals a set of numbered "slot" values stored on an object** — e.g. a custom loot-table or
quest-progress system that stores `val_1`, `val_2`, ... `val_5` as separate `ints:` keys on a ZDO
(common in EWP scripting because `ints:`/`floats:` blocks are flat key-value, not arrays), and a
rule elsewhere needs their sum to decide a threshold:

```yaml
- type: <int_totalRequired>
  value: <iter_add_1_5_int_val_i>
```

This resolves to `<add_<int_val_1>_<int_val_2>_<int_val_3>_<int_val_4>_<int_val_5>>`, then to the
sum of whatever those five ZDO int fields currently hold — equivalent to manually writing
`<add_<int_val_1>_<int_val_2>_<int_val_3>_<int_val_4>_<int_val_5>>` by hand, except the range is
parametric (`iter_add_1_N_...`) so changing the slot count only touches one number instead of
requiring every call site to be hand-edited. This is the actual value proposition of `iter` over
just writing out a long `<add_...>` chain by hand: it turns a fixed-N reduction into a
range-parametric one, at the cost of the indirection being much harder to read — which is exactly
why the maintainer flagged this as the wiki's most confusion-prone topic.

### Confidence

High — every claim above traces to a specific cited line in the freshly re-fetched
`Functions.cs` (2026-09-14, `main`, 1138 lines, matching round4's byte count), read directly with
`sed -n`, not summarized. The worked examples in Q2/Q3 were traced by hand through the exact
source logic (not executed against a live game), so the *mechanism* is source-certain but the
specific example scripts were not run in-game to confirm the final rendered string byte-for-byte —
flag for ticket 30 if the maintainer wants an in-game screenshot to pair with the walkthrough.
