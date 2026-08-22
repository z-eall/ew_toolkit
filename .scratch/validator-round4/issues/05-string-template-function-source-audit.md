# Source-verify EWP's complete string-template function set and argument shapes

Type: research
Status: resolved
Blocked by: (none)
Parent: [Validator Round 4 map](../map.md)

## Question

The scripter wants a typo in an EWP string-template function name (e.g.
`<strink_X>` instead of `<string_X>`) or an invalid/unaccepted value passed
to one, caught as an error — analogous to how `keysCompatible` already
catches custom-saved-key read/write mismatches. Before any detection logic
can be designed (ticket 06, blocked by this one), the validator needs a
ground-truth list of what actually exists to compare against — nothing in
this repo currently source-verifies EWP's *complete* function-name set the
way [round2 ticket 07](../../validator-round2/issues/07-custom-key-validation-rework.md)
did for `<save_X>`/`<load_X>`/`<clear_X>` specifically.

`referenceValidation.ts` today only understands 4 function heads
(`save`, `save++`, `save--`, `load`, `clear` — `KEY_HEAD_RE`, line 180) as
part of the custom-saved-key feature. EWP's `docs/functions.md` documents a
much larger set used throughout string fields (`<string_X>`, `<int_X>`,
`<float_X>`, `<par_X>`, `<pid>`, `<host>`, `<time>`, math/random functions,
etc.) — this research should NOT re-derive the save/load/clear rules
(already correct per round2 ticket 07's audit), only cover the *rest* of the
function catalog those don't touch.

Research, dispatched as a `/research` AFK sub-agent per this map's Notes:

1. Fetch and read EWP's `docs/functions.md` and the C# source that actually
   parses/dispatches these functions at runtime (likely `Functions.cs` /
   `Parse.cs`, per round2 ticket 07's citations) — list every recognized
   function name, its expected argument shape (how many `_`-or-other
   -delimited parameters, what type each resolves to), and whether matching
   is case-sensitive (round2 ticket 07 found `DataStorage` calls are
   case-insensitive; confirm whether the same holds for the general
   function dispatcher, or whether it's case-sensitive there — don't assume
   either way).
2. Determine what happens at runtime when an unrecognized function name is
   used inside `<...>` (e.g. `<strink_X>`) — is it left as a literal string,
   silently dropped, or does it error/log? This determines whether a typo
   is a silent no-op (worth a warning) or a hard runtime failure (worth an
   error).
3. Determine what happens when a *recognized* function gets an
   argument/value it doesn't accept (the scripter's "inputting invalid
   values which are not accepted by the code" case) — is this even
   checkable statically, or does it depend on runtime state (e.g. an
   `<int_X>` needing X to resolve to a real custom key) the validator has
   no access to, similar to how prefab-name/global-key checks were ruled
   out in [reference validation feasibility](../../ew_toolkit/research/04-reference-validation-feasibility.md)?
4. Note any function whose name is a likely typo *target* for another
   (e.g. `string`/`strink`, or other real near-miss pairs actually seen in
   the wild if discoverable) — not required, but useful context for ticket
   06's typo-distance design.

Cite file/line for every claim, matching this repo's existing research
rigor (see round2 ticket 07's research file as the template).

## Answer

Full audit: [../research/05-string-template-function-source-audit.md](../research/05-string-template-function-source-audit.md).

Gist:

1. **~110 distinct built-in function names**, spread across 4 dispatch tables: `Functions.cs`'s
   `GetGeneralFunction` (14 no-arg names) and `GetValueFunction` (68 argument-taking names,
   including save/load/clear/key already covered by round2), plus `ObjectFunctions.cs`'s
   `GetGeneralParameter` (17 no-arg, object-context-only) and `GetValueFunction` (11
   argument-taking, object-context-only) — `ObjectFunctions` extends rather than replaces the
   base tables. Plugin-registered names (`Api.cs`, Expand World Code) are a separate, unbounded,
   source-invisible namespace. **Function-name dispatch is case-sensitive** (plain C# `string
   switch`, no lowering anywhere) — the opposite of `DataStorage`'s case-insensitive key values
   from round2, so don't assume either way per feature.
2. **Unrecognized function name (e.g. `<strink_X>`) → silent literal passthrough, no log/warn/error
   ever.** One extra wrinkle: before giving up, EWP checks the bracketed text against `data.yaml`
   **value groups** (an unrelated same-syntax feature) — if a value group happens to share the
   typo'd name, the typo silently resolves to a random group value instead of staying inert.
3. **"Recognized function, invalid argument" is mostly NOT statically checkable — same trap as
   ticket 04's prefab-name verdict.** The dominant real-world functions (`<int_X>`, `<string_X>`,
   `<item_X>`, etc.) resolve against live ZDO data, reflected Unity component fields, inventory
   contents, or player state — none visible to a static YAML scan. The pure math/text functions
   are technically argument-shape-checkable, but EWP already treats a bad argument as
   silent-degrade-to-default, not an error, so there's no real error to catch. One genuine
   exception: `<iter_OP_...>`/`<iter2_OP_...>`'s `OP` token is drawn from a small, fixed,
   source-enumerable set of reducer function names — a real static-check opportunity.
4. **Near-miss pairs for ticket 06**: `randf`/`randi`/`random`/`randomfloat`/`randomint` cluster;
   undocumented `calcf`/`calci` aliases (missing from `docs/functions.md` entirely); the 2-letter
   comparison family `eq`/`ne`/`gt`/`ge`/`lt`/`le` (all mutually valid — a typo here is
   wrong-but-valid, not catchable by name-distance at all); `hash`/`hashof`/`textof`; bare `<par>`
   vs. `<par_X>` (same word, two different dispatch tables/arities).
