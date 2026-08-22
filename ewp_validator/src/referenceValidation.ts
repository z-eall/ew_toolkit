// Ticket 06's data.yaml reference validation, scoped per ticket 04's research:
// this is the one identifier namespace (data.yaml named templates) with a
// clean, purely-structural definition/usage split that needs no external
// game-data index. Global keys and prefab names are explicitly out of scope
// (ticket 04, 2b-iii/2a) — too many legitimate definitions live outside any
// loaded file (vanilla game logic, other mods), which would make a
// structural check mostly false positives.
//
// Two checks, all cross-file (every expand_prefabs_*.yaml + data.yaml in
// the loaded batch is one merged namespace, per the README):
//   1. An undefined `data:`-shaped reference -> hard error.
//   2. A data.yaml entry with zero usages anywhere loaded -> low-severity hint.
//   3. A custom saved key read (keys:/bannedKeys:/type:key/<load_.../<clear_...)
//      with no matching <save_...> write anywhere loaded, or vice versa -> warning.
//      Best-effort by nature (ticket 04): a key can legitimately be written by
//      another mod or a console command outside the loaded batch. Matching is
//      "likely match", not exact: dynamic `<...>` parameters inside a saved key
//      name (e.g. `<save_captureblockercity<int_isRadarCity=0>_<time>>`) are
//      treated as wildcards, and only the key-name portion is compared — the
//      trailing value/parameter of a save or a `type: key` trigger is ignored.
import { isMap, isSeq, parseDocument, type YAMLMap } from "yaml";
import { collectRuleEntryDataReferences } from "./dataFieldValidation";
import { findPairRange, getPairValueNode, guessBranch, nodeRange, type Severity } from "./structuralPrecheck";

export interface FileProblem {
  fileId: string;
  severity: Severity;
  message: string;
  kind: "data-reference" | "custom-key" | "legacy-object-data" | "template-function" | "poke-parameter";
  range: [start: number, end: number];
}

export interface FileInput {
  id: string;
  text: string;
}

interface Occurrence {
  fileId: string;
  range: [number, number];
}

function normalizeDataEntryName(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  const name = String(raw).trim();
  return name === "" ? null : name;
}

function recordOccurrence(map: Map<string, Occurrence[]>, name: string, occ: Occurrence) {
  const list = map.get(name);
  if (list) list.push(occ);
  else map.set(name, [occ]);
}

function parseKeysField(raw: string): string[] {
  // Format: "key1 value1, key2 value2; key3 value3 ..." — entries are seen
  // separated by comma OR semicolon in practice (a multi-line `keys: |` block
  // separates its entries with ";\n", not ","), and the first
  // whitespace-separated token of each segment is the key name. Splitting on
  // comma alone left a semicolon-separated segment as one blob, so its first
  // token came out with the next segment's leading key still glued on by a
  // stray trailing ";" — e.g. "currentking; kingpossible 1" mis-read as the
  // single key 'currentking;'.
  return raw
    .split(/[,;]/)
    .map((segment) => segment.trim().split(/\s+/)[0])
    .filter((k): k is string => !!k);
}

function parseTypeKeyParameter(raw: string): string | null {
  // `type: key, dataName value` — per scripting.md, `type:` takes parameters
  // (type, parameter1 parameter2). For a `key` trigger parameter1 is the custom
  // key name and parameter2 is a user-defined value; only parameter1 names the
  // key, so we ignore everything past the first whitespace token.
  const [head, ...rest] = raw.split(",");
  if (head.trim().toLowerCase() !== "key") return null;
  const param = rest.join(",").trim();
  if (!param) return null;
  return param.split(/\s+/)[0] ?? null;
}

// The live-code read sites (`keys:`/`bannedKeys:`/`type: key`) come from the
// parsed YAML AST, which never sees comments — so a read that exists *only* as a
// commented-out `# bannedKeys: X` line is invisible to both the AST walk and the
// `<save/load/clear>` template scan. Recover those key names from raw comment
// text so the write-orphan check can say "the read is commented out" instead of
// the generic "never read". Whole-line comments only (a `#` preceded by nothing
// but indentation), matching stripLineComments' rule so we read the same lines
// it blanks. Best-effort text parsing, not a YAML parse: one field per line is
// the shape these toggles take.
const COMMENTED_READ_FIELD_RE = /(?:^|[\s-])(bannedKeys|keys|type)\s*:\s*(.*)$/;
function scanCommentedReadKeys(text: string): string[] {
  const names: string[] = [];
  for (const line of text.split("\n")) {
    const comment = /^\s*#(.*)$/.exec(line);
    if (!comment) continue;
    const match = COMMENTED_READ_FIELD_RE.exec(comment[1]);
    if (!match) continue;
    const [, field, rest] = match;
    if (field === "type") {
      const keyName = parseTypeKeyParameter(rest);
      if (keyName && hasLiteral(keyName)) names.push(keyName);
    } else {
      for (const k of parseKeysField(rest)) if (hasLiteral(k)) names.push(k);
    }
  }
  return names;
}

// Saved keys nest one or more balanced `<...>` dynamic parameters. Every scan
// below (token extraction, top-level splitting, wildcard matching) needs the
// same primitive: from the `<` at `start`, find the index just past its matching
// `>`. Returns -1 if the brackets never balance.
function findGroupEnd(text: string, start: number): number {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "<") depth++;
    else if (text[i] === ">") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

// Walk a key name, calling `onGroup` once per balanced `<...>` parameter and
// `onLiteral` for every character outside a group. Trailing unbalanced text is
// treated as literal. This is the one place the group/literal split is decided;
// keyToPattern, keyToSubject, and hasLiteral all defer to it.
function walkKeySegments(key: string, onLiteral: (ch: string) => void, onGroup: () => void): void {
  let i = 0;
  while (i < key.length) {
    if (key[i] === "<") {
      const end = findGroupEnd(key, i);
      if (end === -1) {
        for (; i < key.length; i++) onLiteral(key[i]);
        return;
      }
      onGroup();
      i = end;
    } else {
      onLiteral(key[i]);
      i++;
    }
  }
}

// Split `s` on occurrences of `sep` that are not nested inside a `<...>` group.
function splitTopLevel(s: string, sep: string): string[] {
  const parts: string[] = [];
  let cur = "";
  let i = 0;
  while (i < s.length) {
    if (s[i] === "<") {
      const end = findGroupEnd(s, i);
      if (end === -1) {
        cur += s.slice(i);
        break;
      }
      cur += s.slice(i, end); // keep the group intact, seps inside it don't count
      i = end;
    } else if (s[i] === sep) {
      parts.push(cur);
      cur = "";
      i++;
    } else {
      cur += s[i];
      i++;
    }
  }
  parts.push(cur);
  return parts;
}

interface RawKeyOccurrence {
  key: string;
  range: [number, number];
}

const KEY_HEAD_RE = /^<(save\+\+|save--|save|load|clear)_/;

// scanKeyOccurrences is a raw text scan with no comment awareness of its own,
// so a save/load/clear template written inside a commented-out line would
// otherwise still be picked up as live. Blank out whole-line comments only —
// a line whose only content before `#` is indentation — preserving
// length/offsets so ranges stay valid. Deliberately narrower than YAML's full
// comment rule (which also allows a trailing `# comment` after real content):
// a `#` following real content on the same line is left untouched, because
// that's exactly the shape of a block scalar's literal content (`exec: |` /
// in-game chat commands like `s Say #hello`), which must never be blanked.
function stripLineComments(text: string): string {
  const out = text.split("");
  let lineStart = 0;
  let i = 0;
  while (i < text.length) {
    if (text[i] === "\n") {
      lineStart = i + 1;
      i++;
      continue;
    }
    if (text[i] === "#" && /^\s*$/.test(text.slice(lineStart, i))) {
      while (i < text.length && text[i] !== "\n") {
        out[i] = " ";
        i++;
      }
      continue;
    }
    i++;
  }
  return out.join("");
}

// A saved-key template can nest `<...>` inside its name (dynamic parameters) and
// its name can contain `/`, so a flat character-class regex can't extract it.
// Scan the whole document, balance the outer `<...>`, then keep only the
// key-name portion. Per EWP's actual source (Functions.cs's GetFunction/
// SetValue — see .scratch/validator-round2/research/07-custom-key-source-
// verification.md §1): `save++`/`save--`/`load`/`clear` all use their entire
// remainder as the key, unsplit — `_` characters inside are literal, part of
// the name. Only plain `save` splits its remainder a second time, and only on
// the FIRST top-level `_`: everything before it is the key, everything from
// it onward (which can itself contain more `_`) is the value being stored.
// Getting this wrong either truncates a real key with literal underscores
// (`save++`/`save--`) or mis-splits a multi-segment `save` key on the wrong
// `_`, which is exactly the false-positive/false-negative pattern this
// rework was commissioned to fix.
function scanKeyOccurrences(text: string): { writes: RawKeyOccurrence[]; reads: RawKeyOccurrence[] } {
  const writes: RawKeyOccurrence[] = [];
  const reads: RawKeyOccurrence[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "<") continue;
    const head = KEY_HEAD_RE.exec(text.slice(i));
    if (!head) continue;

    const end = findGroupEnd(text, i);
    if (end === -1) continue; // unbalanced, leave for the structural pre-check

    const inner = text.slice(i + head[0].length, end - 1); // between "<head_" and ">"
    const range: [number, number] = [i, end];

    let key: string;
    if (head[1] === "save") {
      key = splitTopLevel(inner, "_")[0] ?? "";
      if (key && hasLiteral(key)) writes.push({ key, range });
    } else if (head[1] === "save++" || head[1] === "save--") {
      key = inner; // whole remainder, unsplit — no second split for these
      if (key && hasLiteral(key)) writes.push({ key, range });
    } else if (head[1] === "load") {
      key = splitTopLevel(inner, "=")[0] ?? inner;
      if (key && hasLiteral(key)) reads.push({ key, range });
    } else {
      key = inner;
      if (key && hasLiteral(key)) reads.push({ key, range });
    }
    // Deliberately no `i = end - 1` jump past the whole matched group here: a
    // save/load/clear template can nest another one inside its own value
    // (e.g. `<save_onlineplayer_<max_0_<add_-1_<load_onlineplayer=0>>>>`), and
    // jumping past the outer match's range used to skip right over that
    // nested occurrence, so its read/write was never recorded at all. Letting
    // the loop's own `i++` continue char-by-char instead means the nested
    // `<load_..>` gets its own pass through this same branch once the scan
    // reaches it.
  }
  return { writes, reads };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// A neutral placeholder standing in for a dynamic `<...>` parameter in a literal
// subject string — a control char no real key contains, that a `.*` can span.
const GROUP_SENTINEL = "\x01";

// Turn a key name into a matcher where each dynamic `<...>` parameter is a
// wildcard, and into a literal subject where those parameters become the
// sentinel a wildcard can span. Case-insensitive (the `i` flag): every
// DataStorage call site in EWP's own source lowercases a key before touching
// its dictionary (research/07-custom-key-source-verification.md §3), so
// `Foo`/`foo`/`FOO` are the same stored key at runtime and must never be
// reported as reciprocally orphaned here. A literal `*` outside any `<...>`
// group is EWP's own documented bulk-match wildcard (functions.md: "Wildcard
// * in the key name can be used to remove multiple keys at once"), so it's
// treated the same as a `<...>` group — a `.*` in the pattern, the sentinel
// in the subject — rather than requiring an exact `*` match on the other side.
function keyToPattern(key: string): RegExp {
  let out = "";
  walkKeySegments(
    key,
    (ch) => (out += ch === "*" ? ".*" : escapeRegex(ch)),
    () => (out += ".*"),
  );
  return new RegExp("^" + out + "$", "i");
}

function keyToSubject(key: string): string {
  let out = "";
  walkKeySegments(
    key,
    (ch) => (out += ch === "*" ? GROUP_SENTINEL : ch),
    () => (out += GROUP_SENTINEL),
  );
  return out;
}

// Does the key have any character outside a `<...>` group and outside a
// literal `*`? A key that is purely dynamic/wildcard (e.g. `<pid>`, `<par_1>`,
// or a bare `*`) compiles to the `^.*$` matcher, which would match every other
// key — so such a key is never allowed to drive a wildcard match
// (keysCompatible), and is skipped entirely at occurrence-recording time: its
// real name is only known at runtime (a passed parameter, function result, or
// EWP's own bulk-match resolution), so there is nothing concrete here to check
// a read/write against.
function hasLiteral(key: string): boolean {
  let found = false;
  walkKeySegments(
    key,
    (ch) => {
      if (ch !== "*") found = true;
    },
    () => {},
  );
  return found;
}

// "Likely match": a case-insensitive exact name match, or either key's
// dynamic-parameter/wildcard skeleton matching the other. This lets a read of
// `captureblockercity1` resolve against a
// `<save_captureblockercity<int_isRadarCity=0>_..>` write, and a
// `<pid>/teamlead` read against a `<save_<pid>/teamlead_<par_1>>` write. A
// wildcard match only counts from the side that has at least one literal anchor,
// so a purely-dynamic key can't silently suppress unrelated read/write flags.
//
// Static-analysis limit, not a bug: EWP resolves any `<...>` parameter nested
// inside a key inside-out, *then* splits the resulting flat string into
// key/value (research/07-custom-key-source-verification.md §2). If a dynamic
// group straddles that real split point — e.g. `<save_foo<x>_bar>`, where
// `<x>` might resolve to text containing its own `_` — this scanner can't know
// at analysis time whether the resolved text lands before or after the split,
// so the wildcard placement here is necessarily a best-effort approximation.
function keysCompatible(a: string, b: string): boolean {
  if (a.toLowerCase() === b.toLowerCase()) return true;
  const aMatchesB = hasLiteral(a) && keyToPattern(a).test(keyToSubject(b));
  const bMatchesA = hasLiteral(b) && keyToPattern(b).test(keyToSubject(a));
  return aMatchesB || bMatchesA;
}

// The read-orphan and write-orphan messages below are mirror images of each
// other (same shape, "read"/"write" swapped), and used to drift apart exactly
// because they were two independently hand-written template strings: a wording
// fix applied to one (e.g. the ewp_data.yaml path) silently didn't reach the
// other. Single-sourcing the shared path here, and building both messages
// from one function keyed by direction, makes that class of drift impossible
// instead of just easy to remember to avoid.
const CUSTOM_KEY_DATA_PATH_HINT = "expand_prefabs*/ewp_data.yaml";

type KeyDirection = "read" | "write";

function orphanKeyMessage(direction: KeyDirection, name: string, counterpartOnlyCommented: boolean): string {
  const counterpart: KeyDirection = direction === "read" ? "write" : "read";
  if (counterpartOnlyCommented) {
    // "is read here, but its only <save_..> is commented out — uncomment the write, or remove this read."
    // "is written (<save_..>), but its only read is commented out — uncomment the read, or remove this write."
    const selfPhrase = direction === "read" ? "is read here" : "is written (<save_..>)";
    const counterpartLabel = direction === "read" ? "<save_..>" : "read";
    return (
      `Custom saved key '${name}' ${selfPhrase}, but its only ${counterpartLabel} is commented out — ` +
      `uncomment the ${counterpart}, or remove this ${direction}.`
    );
  }
  if (direction === "read") {
    return `Custom saved key '${name}' with no <save_..> found in the loaded files — Verify in ${CUSTOM_KEY_DATA_PATH_HINT}.`;
  }
  return `Custom saved key '${name}' written (<save_..>) but never read in the loaded files — check ${CUSTOM_KEY_DATA_PATH_HINT} before treating this as a bug.`;
}

// Ticket 06 — EWP string-template function name typo detection. Source-verified
// catalog (.scratch/validator-round4/research/05-string-template-function-source
// -audit.md, EWP's Functions.cs/ObjectFunctions.cs fetched and read in full,
// 2026-08-22): every `<...>` group is resolved by first trying the *entire*
// bracket contents against a no-argument name table, and only if that fails,
// splitting on the first top-level `_` and trying the head against an
// argument-taking name table. Both tables are checked here in that same order,
// so a name that's only valid in one arity (e.g. `par` bare vs. `par_X`) is
// never wrongly flagged just because it also happens to appear split.
//
// `GetGeneralFunction`, Functions.cs:126-153.
const NO_ARG_FUNCTION_NAMES = new Set([
  "prefab", "safeprefab", "par",
  "par0", "par1", "par2", "par3", "par4", "par5", "par6", "par7", "par8", "par9",
  "day", "ticks", "x", "y", "z", "snap", "amount", "time", "realtime",
]);
// `ObjectFunctions.GetGeneralParameter`, ObjectFunctions.cs:34-55 — only reachable
// with an object/ZDO context, but that context can't be told apart from plain
// text at static-analysis time, so it's folded into the same recognized set
// rather than risk a false positive.
const NO_ARG_OBJECT_FUNCTION_NAMES = new Set([
  "zdo", "pos", "i", "j", "a", "rad", "deg", "rot", "pid", "cid", "platform",
  "pname", "pchar", "pvisible", "owner", "connected", "biome", "joints",
  // `<none>`: documented (docs/functions.md, "Empty or lack of value when using
  // filters") but not found in Functions.cs/ObjectFunctions.cs's own dispatch
  // switches during ticket 05's research — likely resolved by filter-comparison
  // code elsewhere in the mod, not the general `<...>` template engine. Included
  // here on the strength of the docs rather than a pinned source line, since
  // treating a documented, scripter-facing keyword as a "typo" would be a
  // needless false positive either way.
  "none",
]);
// `GetValueFunction`, Functions.cs:155-251 (68 names, argument-taking).
const ARG_FUNCTION_HEADS = new Set([
  "sqrt", "round", "ceil", "floor", "abs", "sin", "cos", "tan", "asin", "acos",
  "rad2deg", "deg2rad", "rad2vec", "deg2vec", "vec2deg", "vec2rad",
  "angle", "distance", "dot", "cross", "project", "reflect",
  "normalize", "magnitude", "sqrmagnitude", "vecx", "vecy", "vecz",
  "lerp", "atan", "pow", "log", "exp", "min", "max",
  "add", "sub", "mul", "div", "mod", "iter", "iter2",
  "addlong", "sublong", "mullong", "divlong", "modlong",
  "randf", "randomfloat", "randi", "randomint", "random",
  "hashof", "textof", "len", "lower", "upper", "trim",
  "left", "right", "mid", "proper", "search",
  "calcf", "calcfloat", "calci", "calcint", "calclong",
  "par", "rest", "load", "save", "save++", "save--", "clear", "key",
  "rank", "small", "large", "eq", "ne", "gt", "ge", "lt", "le",
  "even", "odd", "findupper", "findlower", "time", "realtime", "globalkey",
]);
// `ObjectFunctions.GetValueFunction`, ObjectFunctions.cs:60-80 (11 names, object
// context — same "can't tell context apart statically" call as the no-arg set).
const ARG_OBJECT_FUNCTION_HEADS = new Set([
  "string", "float", "int", "long", "bool", "vec", "quat",
  "hash", "byte", "zdo", "amount", "quality", "durability", "item", "pos", "pdata",
]);

const KNOWN_NO_ARG_NAMES = new Set([...NO_ARG_FUNCTION_NAMES, ...NO_ARG_OBJECT_FUNCTION_NAMES]);
const KNOWN_ARG_HEADS = new Set([...ARG_FUNCTION_HEADS, ...ARG_OBJECT_FUNCTION_HEADS]);
const ALL_KNOWN_FUNCTION_NAMES = [...new Set([...KNOWN_NO_ARG_NAMES, ...KNOWN_ARG_HEADS])];
// Case-insensitive lookup, keyed by lowercase, back to the real (correctly-cased)
// spelling(s) — used only to recognize "right name, wrong case" as a distinct,
// high-confidence case from a genuine spelling typo (dispatch itself is
// case-sensitive per source, §1c of the research above: no `.ToLowerInvariant()`/
// `OrdinalIgnoreCase` anywhere in the four switch bodies).
const LOWERCASE_TO_KNOWN_NAMES = new Map<string, string[]>();
for (const name of ALL_KNOWN_FUNCTION_NAMES) {
  const lower = name.toLowerCase();
  const list = LOWERCASE_TO_KNOWN_NAMES.get(lower);
  if (list) list.push(name);
  else LOWERCASE_TO_KNOWN_NAMES.set(lower, [name]);
}

// DataLoading.cs's `LoadDefaultValueGroups` hardcodes these four group names
// (aliased onto live component/material scans) regardless of what's loaded —
// unlike `material_*`/`itemtype_*`/arbitrary component-type-name groups, which
// are built from a live `ZNetScene` prefab scan and have no fixed, enumerable
// name list this validator's static file-scan could ever produce (same class
// of runtime-only dependency the ticket 05 research ruled "not statically
// checkable" for function *arguments* — it applies here too, to *value group*
// names). Always-recognized regardless of what's loaded in the batch.
const DEFAULT_VALUE_GROUP_NAMES = new Set(["wearntear", "humanoid", "creature", "structure"]);

function isRecognizedFunctionGroup(inner: string): boolean {
  if (KNOWN_NO_ARG_NAMES.has(inner)) return true;
  const head = splitTopLevel(inner, "_")[0] ?? inner;
  return KNOWN_ARG_HEADS.has(head);
}

// Small, unweighted Levenshtein distance — good enough for short function-name
// heads (longest known name is 11 chars); no need for a fancier metric.
function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

interface FunctionNameSuggestion {
  name: string;
  caseOnly: boolean;
}

// Best-effort "did you mean X" for an unrecognized function head. Case-only
// mismatch (same spelling, wrong case) is reported with certainty since it's a
// known, source-confirmed failure mode, not a guess. Otherwise, only suggest a
// close spelling when exactly one known name is within edit-distance 2 — a tie
// or a distant match says nothing useful, so no suggestion is offered rather
// than a misleading one.
function suggestFunctionName(head: string): FunctionNameSuggestion | null {
  const lower = head.toLowerCase();
  const caseMatches = LOWERCASE_TO_KNOWN_NAMES.get(lower);
  if (caseMatches && caseMatches.length === 1) return { name: caseMatches[0], caseOnly: true };

  let best: string | null = null;
  let bestDist = Infinity;
  let tie = false;
  for (const name of ALL_KNOWN_FUNCTION_NAMES) {
    const dist = levenshtein(lower, name.toLowerCase());
    if (dist < bestDist) {
      best = name;
      bestDist = dist;
      tie = false;
    } else if (dist === bestDist) {
      tie = true;
    }
  }
  if (best && !tie && bestDist > 0 && bestDist <= 2) return { name: best, caseOnly: false };
  return null;
}

function templateFunctionMessage(head: string, suggestion: FunctionNameSuggestion | null): string {
  const base = `'<${head}...>' doesn't match any known EWP function name`;
  const runtime = "left as literal text at runtime — no error, and no function actually runs";
  if (!suggestion) return `${base}. It's ${runtime}.`;
  if (suggestion.caseOnly) {
    return (
      `${base} — EWP function names are case-sensitive, and this only differs from ` +
      `'<${suggestion.name}...>' by case. It's ${runtime}.`
    );
  }
  return `${base} — probably a typo of '<${suggestion.name}...>'. It's ${runtime}.`;
}

// Scan the whole document for balanced `<...>` groups whose head isn't any
// known function name, skipping (a) unbalanced brackets — same "leave for
// structural pre-check" rule scanKeyOccurrences follows — and (b) a head built
// entirely from a nested `<...>` group, which has no literal spelling to check
// (the real name only exists at runtime, same reasoning as hasLiteral above).
// Deliberately no jump-past-match on a hit, matching scanKeyOccurrences: a
// nested group inside an unrecognized outer one (or vice versa) still gets its
// own pass through this loop.
interface UnrecognizedFunctionOccurrence {
  head: string;
  range: [number, number];
}

function scanUnrecognizedFunctionHeads(text: string): UnrecognizedFunctionOccurrence[] {
  const out: UnrecognizedFunctionOccurrence[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "<") continue;
    const end = findGroupEnd(text, i);
    if (end === -1) continue;
    const inner = text.slice(i + 1, end - 1);
    if (isRecognizedFunctionGroup(inner)) continue;
    const head = splitTopLevel(inner, "_")[0] ?? inner;
    if (!head || head.includes("<")) continue; // purely dynamic head, nothing to check
    out.push({ head, range: [i, end] });
  }
  return out;
}

// Ticket 07 — poke parameter declaration/usage matching. Source-verified rules
// (round3 research/11-poke-parameter-naming-rules.md, treated as settled ground
// truth per this ticket's own framing — not re-derived here):
//   - `poke[].parameter` / legacy `pokeParameter` split on SPACES into args.
//   - `poke[].pars` splits on COMMAS into args; when a poke item sets `pars`,
//     EWP uses it INSTEAD of `parameter` (PrefabData.cs's `GetArgs`: `if
//     (Parameters != null) ... else ...`) — so `pars` wins over `parameter` on
//     the same item, not merged with it.
//   - `type: poke, X Y` splits its comma-suffix on spaces into filter tokens
//     (`Info.Args`); `InfoSelector.CheckArgs` matches positionally,
//     `info.Args[i]` against the incoming `args[i]`, via `Helper.CheckWild`
//     (comma-separated alternatives, `*` wildcard, numeric `min;max` range,
//     else case-insensitive exact match).
//
// Scope decision: this only tracks each side's FIRST token (the "poke name"),
// matching every worked example in the ticket and in round3's research — full
// positional multi-arg-list matching would mean statically resolving arbitrary
// `<...>` values at arbitrary argument positions, which is the same kind of
// runtime-state dependency ticket 04's research already ruled out of scope
// elsewhere in this file.
function firstPokeToken(raw: string, sep: "," | " "): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const token = (sep === "," ? splitTopLevel(trimmed, ",") : trimmed.split(/\s+/))[0]?.trim();
  if (!token) return null;
  return hasLiteral(token) ? token : null; // purely dynamic — nothing concrete to check
}

// `type: poke, X` / `types: [poke, X]` — mirrors parseTypeKeyParameter's shape
// for the "poke" trigger instead of "key". Match on the type keyword is
// case-insensitive per source (`Enum.TryParse(..., true, ...)`).
function parseTypePokeParameter(raw: string): string | null {
  const [head, ...rest] = raw.split(",");
  if (head.trim().toLowerCase() !== "poke") return null;
  return firstPokeToken(rest.join(","), " ");
}

// `Helper.CheckWild`'s comma-separated-alternatives step, applied to one filter
// token before per-alternative matching. `splitTopLevel` keeps a `<...>`
// group's own commas intact, matching how every other comma-split in this file
// treats dynamic groups as opaque.
function pokeTriggerAlternatives(token: string): string[] {
  return splitTopLevel(token, ",")
    .map((s) => s.trim())
    .filter((s) => s !== "");
}

// Reuses `keysCompatible` (case-insensitive, `<...>`/`*` as wildcards) for the
// per-alternative comparison — the wildcard-skeleton approach built for custom
// saved keys transfers directly to poke names, confirmed by re-reading round3
// research 11 §2b: both are "case-insensitive string, `*`/dynamic segments as
// wildcards" comparisons at the core. The one real addition `CheckWild` has
// that custom-key matching doesn't — comma-separated alternatives on the
// trigger side — is layered on top here rather than folded into
// `keysCompatible` itself, since custom keys never have that shape.
// Deliberately NOT reused: `CheckWild`'s numeric `min;max` range branch — a
// poke *name* comparison has no numeric-range use case, so implementing it
// would only add surface area no real script needs.
function pokeNameCompatible(declaredName: string, triggerToken: string): boolean {
  return pokeTriggerAlternatives(triggerToken).some((alt) => keysCompatible(declaredName, alt));
}

interface PokeTokenOccurrence {
  token: string;
  occ: Occurrence;
}

// Walks one EWP rule entry for both halves of the ticket 07 feature: declared
// poke parameters (`poke[].parameter`/`pars`, legacy top-level `pokeParameter`)
// and `type: poke, X` / `types:` trigger filter tokens.
function collectPokeSignals(
  itemNode: YAMLMap,
  value: Record<string, unknown>,
  fileId: string,
): { declarations: PokeTokenOccurrence[]; triggers: PokeTokenOccurrence[] } {
  const declarations: PokeTokenOccurrence[] = [];
  const triggers: PokeTokenOccurrence[] = [];

  if (typeof value.pokeParameter === "string") {
    const name = firstPokeToken(value.pokeParameter, " ");
    if (name) {
      const range = findPairRange(itemNode, "pokeParameter") ?? nodeRange(itemNode as any);
      declarations.push({ token: name, occ: { fileId, range } });
    }
  }

  const pokeSeq = getPairValueNode(itemNode, "poke");
  if (pokeSeq && isSeq(pokeSeq as any)) {
    for (const nested of (pokeSeq as any).items) {
      if (!isMap(nested)) continue;
      const nestedMap = nested as YAMLMap;
      const nestedValue = nestedMap.toJSON() as Record<string, unknown>;
      // `pars` wins over `parameter` on the same item (source-verified above).
      const field = typeof nestedValue.pars === "string" ? "pars" : typeof nestedValue.parameter === "string" ? "parameter" : null;
      if (!field) continue;
      const name = firstPokeToken(nestedValue[field] as string, field === "pars" ? "," : " ");
      if (!name) continue;
      const range = findPairRange(nestedMap, field) ?? nodeRange(nestedMap as any);
      declarations.push({ token: name, occ: { fileId, range } });
    }
  }

  const typeStrings: { raw: string; range: [number, number] }[] = [];
  if (typeof value.type === "string") {
    typeStrings.push({ raw: value.type, range: findPairRange(itemNode, "type") ?? nodeRange(itemNode as any) });
  }
  const typesSeq = getPairValueNode(itemNode, "types");
  if (typesSeq && isSeq(typesSeq as any)) {
    for (const item of (typesSeq as any).items) {
      if (typeof item !== "string" && !(item && "value" in item)) continue;
      const raw = typeof item === "string" ? item : String((item as { value: unknown }).value);
      const range: [number, number] = (item as { range?: [number, number] }).range ?? nodeRange(itemNode as any);
      typeStrings.push({ raw, range });
    }
  }
  for (const { raw, range } of typeStrings) {
    const token = parseTypePokeParameter(raw);
    if (token) triggers.push({ token, occ: { fileId, range } });
  }

  return { declarations, triggers };
}

export function runReferenceValidation(files: FileInput[]): FileProblem[] {
  const problems: FileProblem[] = [];
  const definitions = new Map<string, Occurrence[]>();
  const dataUsages: { name: string; occ: Occurrence; suppressUndefinedError?: boolean }[] = [];
  const keyWrites = new Map<string, Occurrence[]>();
  const keyReads = new Map<string, Occurrence[]>();
  // Key names that appear as a `<save_..>` write / `<load_..>`/`<clear_..>` read
  // *inside a comment*. A commented-out template is not a live occurrence (round
  // 2: it must not be flagged on its own, nor count as a live write/read), but
  // it is still visible proof the scripter knows the key. Tracking it lets the
  // orphan check tell "the counterpart is only commented out" (e.g. a `truceday`
  // save toggled off at the bottom of the file) apart from "there is no
  // counterpart anywhere" — the two get different messages below.
  const commentedWriteNames = new Set<string>();
  const commentedReadNames = new Set<string>();
  // Names of value/valueGroup entries defined anywhere in the loaded batch
  // (case-insensitive, matching DataLoading.cs's own
  // `group.ToLowerInvariant().GetStableHashCode()` lookup — research/05 §1c).
  // A `<...>` group whose head matches one of these resolves as a value-group
  // reference instead of a function call — a real, if unusual, EWP feature —
  // so it must not be flagged as an unrecognized/typo'd function name.
  const valueGroupNames = new Set<string>();
  const templateFunctionOccurrences: { fileId: string; head: string; range: [number, number] }[] = [];
  const pokeDeclarations: PokeTokenOccurrence[] = [];
  const pokeTriggers: PokeTokenOccurrence[] = [];

  for (const file of files) {
    const doc = parseDocument(file.text);
    if (doc.errors.length > 0) continue; // structural pre-check already reports this file's syntax errors

    // Custom-saved-key templates can appear inside any string field, so this
    // one part is a whole-document text scan rather than a node walk.
    const { writes, reads } = scanKeyOccurrences(stripLineComments(file.text));
    for (const w of writes) recordOccurrence(keyWrites, w.key, { fileId: file.id, range: w.range });
    for (const r of reads) recordOccurrence(keyReads, r.key, { fileId: file.id, range: r.range });

    // Re-scan the raw text (comments intact). stripLineComments preserves
    // offsets, so any raw occurrence whose start offset the live scan did not
    // also yield is one that sits inside a comment. Those feed only the
    // commented-name sets, never the flaggable maps above.
    const liveWriteStarts = new Set(writes.map((w) => w.range[0]));
    const liveReadStarts = new Set(reads.map((r) => r.range[0]));
    const rawScan = scanKeyOccurrences(file.text);
    for (const w of rawScan.writes) if (!liveWriteStarts.has(w.range[0])) commentedWriteNames.add(w.key);
    for (const r of rawScan.reads) if (!liveReadStarts.has(r.range[0])) commentedReadNames.add(r.key);
    // Reads only present as a commented-out AST field (`# bannedKeys: X`), which
    // neither scan above reaches. Writes have no AST form, so there's no
    // matching commented-write pass.
    for (const name of scanCommentedReadKeys(file.text)) commentedReadNames.add(name);

    // Same comment-blindness rule as the custom-key scan above: a template
    // written only inside a commented-out line isn't live code.
    for (const occ of scanUnrecognizedFunctionHeads(stripLineComments(file.text))) {
      templateFunctionOccurrences.push({ fileId: file.id, head: occ.head, range: occ.range });
    }

    const root = doc.contents;
    if (!root || !isSeq(root)) continue;

    const addDataUsage = (
      name: string,
      range: [number, number],
      suppressUndefinedError?: boolean,
    ) => dataUsages.push({ name, occ: { fileId: file.id, range }, suppressUndefinedError });

    for (const itemNode of root.items) {
      if (!isMap(itemNode)) continue;
      const value = itemNode.toJSON() as Record<string, unknown>;
      const { branch } = guessBranch(value);

      const defName = branch === "wecDataEntry" ? normalizeDataEntryName(value.name) : null;
      if (defName) {
        const range = findPairRange(itemNode, "name") ?? nodeRange(itemNode);
        recordOccurrence(definitions, defName, { fileId: file.id, range });
      }

      // `value: groupName, someValue` (Parse.Kvp's default comma separator —
      // Parse.cs:187) or `valueGroup: groupName` — either names a value group.
      if (branch === "valueEntry" && typeof value.value === "string") {
        const groupName = value.value.split(",")[0]?.trim();
        if (groupName) valueGroupNames.add(groupName.toLowerCase());
      }
      if (branch === "valueGroup" && typeof value.valueGroup === "string") {
        const groupName = value.valueGroup.trim();
        if (groupName) valueGroupNames.add(groupName.toLowerCase());
      }

      if (branch !== "ewpRuleEntry") continue;

      const { usages, legacyNotices } = collectRuleEntryDataReferences(itemNode, value);
      for (const u of usages) {
        addDataUsage(u.name, u.range, u.suppressUndefinedError);
      }
      for (const { arrKey, range } of legacyNotices) {
        problems.push({
          fileId: file.id,
          severity: "info",
          kind: "legacy-object-data",
          message:
            `Legacy format: \`data:\` under \`${arrKey}:\` is an old alias for \`filter:\`. It still works, ` +
            `but we recommend renaming it to \`filter:\`.`,
          range,
        });
      }

      if (typeof value.keys === "string") {
        const range = findPairRange(itemNode, "keys") ?? nodeRange(itemNode);
        for (const k of parseKeysField(value.keys)) {
          if (hasLiteral(k)) recordOccurrence(keyReads, k, { fileId: file.id, range });
        }
      }
      if (typeof value.bannedKeys === "string") {
        const range = findPairRange(itemNode, "bannedKeys") ?? nodeRange(itemNode);
        for (const k of parseKeysField(value.bannedKeys)) {
          if (hasLiteral(k)) recordOccurrence(keyReads, k, { fileId: file.id, range });
        }
      }
      if (typeof value.type === "string") {
        const keyName = parseTypeKeyParameter(value.type);
        if (keyName && hasLiteral(keyName)) {
          const range = findPairRange(itemNode, "type") ?? nodeRange(itemNode);
          recordOccurrence(keyReads, keyName, { fileId: file.id, range });
        }
      }

      const pokeSignals = collectPokeSignals(itemNode, value, file.id);
      pokeDeclarations.push(...pokeSignals.declarations);
      pokeTriggers.push(...pokeSignals.triggers);
    }
  }

  const usedNames = new Set<string>();
  for (const { name, occ, suppressUndefinedError } of dataUsages) {
    if (/[<>]/.test(name)) {
      // Dynamic reference (a literal prefix/skeleton wrapped around a
      // `<...>` parameter, e.g. `newDeerDropLevel<par_1>`): best-effort fuzzy
      // match, the same wildcard idea as keysCompatible below. Ambiguous by
      // nature — which concrete entry it resolves to depends on a runtime
      // value — so it's never flagged undefined, but any definition its
      // skeleton matches counts as used, so a real entry doesn't get a false
      // "unused" hint just because every reference to it is dynamic.
      const pattern = keyToPattern(name);
      for (const defName of definitions.keys()) {
        if (pattern.test(defName)) usedNames.add(defName);
      }
      continue;
    }
    usedNames.add(name);
    if (!definitions.has(name) && !suppressUndefinedError) {
      problems.push({
        fileId: occ.fileId,
        severity: "error",
        kind: "data-reference",
        message: `Undefined data entry reference '${name}'. Add a \`name: ${name}\` entry, or correct the invalid entry.`,
        range: occ.range,
      });
    }
  }

  for (const [name, occs] of definitions) {
    if (usedNames.has(name)) continue;
    for (const occ of occs) {
      problems.push({
        fileId: occ.fileId,
        severity: "info",
        kind: "data-reference",
        message: `Data entry '${name}' is not used in the loaded files. A file outside this batch can still use it.`,
        range: occ.range,
      });
    }
  }

  // Duplicate `name:` (WEC data entry) definitions — source-verified against
  // EWP's own DataLoading.cs (`LoadEntry`, .scratch/validator-round4/issues/
  // 04-duplicate-name-entry-detection.md's ## Answer): entries load in file-list
  // order, and each subsequent `name:` with an already-seen hash overwrites
  // `Data[hash]` unconditionally while logging `Log.Warning("Duplicate data
  // entry: ...")`. So the runtime behavior really is "last loaded silently wins,
  // with a warning" — matching the scripter's own "warning" severity ask exactly,
  // not just a guess. Load order across files isn't something this static scan
  // can know, so the message doesn't claim to know which occurrence wins.
  for (const [name, occs] of definitions) {
    if (occs.length <= 1) continue;
    for (const occ of occs) {
      problems.push({
        fileId: occ.fileId,
        severity: "warning",
        kind: "data-reference",
        message:
          `Data entry name '${name}' is defined ${occs.length} times in the loaded batch. EWP keeps only ` +
          `the last one loaded and logs a "Duplicate data entry" warning at runtime — the others are silently ` +
          `discarded. Rename one, or delete the duplicate if it's leftover.`,
        range: occ.range,
      });
    }
  }

  const writeKeyNames = [...keyWrites.keys()];
  const readKeyNames = [...keyReads.keys()];
  const commentedWrites = [...commentedWriteNames];
  const commentedReads = [...commentedReadNames];

  for (const [name, occs] of keyReads) {
    if (writeKeyNames.some((w) => keysCompatible(name, w))) continue;
    // A compatible <save_..> exists but only inside a comment: point at that
    // rather than sending the scripter off to check ewp_data.yaml.
    const message = orphanKeyMessage("read", name, commentedWrites.some((w) => keysCompatible(name, w)));
    for (const occ of occs) {
      problems.push({
        fileId: occ.fileId,
        severity: "info",
        kind: "custom-key",
        message,
        range: occ.range,
      });
    }
  }
  for (const [name, occs] of keyWrites) {
    if (readKeyNames.some((r) => keysCompatible(name, r))) continue;
    const message = orphanKeyMessage("write", name, commentedReads.some((r) => keysCompatible(name, r)));
    for (const occ of occs) {
      problems.push({
        fileId: occ.fileId,
        severity: "info",
        kind: "custom-key",
        message,
        range: occ.range,
      });
    }
  }

  for (const { fileId, head, range } of templateFunctionOccurrences) {
    const lowerHead = head.toLowerCase();
    if (valueGroupNames.has(lowerHead) || DEFAULT_VALUE_GROUP_NAMES.has(lowerHead)) continue;
    problems.push({
      fileId,
      severity: "warning",
      kind: "template-function",
      message: templateFunctionMessage(head, suggestFunctionName(head)),
      range,
    });
  }

  // Ticket 07 — stray declared poke parameters: no `type: poke, X` (or `types:`
  // entry) anywhere in the loaded batch matches this declaration. Info, not
  // warning, per the same "another mod/console command outside the batch" carve
  // -out custom-key orphans already use — a poke can legitimately be caught by
  // a rule that isn't loaded here.
  for (const { token, occ } of pokeDeclarations) {
    if (pokeTriggers.some((t) => pokeNameCompatible(token, t.token))) continue;
    problems.push({
      fileId: occ.fileId,
      severity: "info",
      kind: "poke-parameter",
      message:
        `Poke parameter '${token}' has no matching \`type: poke, ${token}\` trigger anywhere in the loaded ` +
        `files. This still works if a rule outside this batch (or another mod) listens for it — otherwise it's dead.`,
      range: occ.range,
    });
  }

  // Ticket 07 — likely-typo triggers: a `type: poke, X` with no exact/wildcard
  // match, but a close (edit-distance <= 2, unambiguous) declared poke name
  // exists in the batch. Warning, not info — unlike the stray case above, this
  // has a concrete, high-confidence fix sitting right there in the same batch,
  // not just an "elsewhere" possibility. Suggestion is only offered between
  // fully-literal tokens (no `<...>`) on both sides — comparing edit distance
  // against a dynamic skeleton doesn't mean anything.
  for (const { token, occ } of pokeTriggers) {
    if (token.includes("<")) continue;
    if (pokeDeclarations.some((d) => pokeNameCompatible(token, d.token))) continue;
    let best: string | null = null;
    let bestDist = Infinity;
    let tie = false;
    for (const { token: declared } of pokeDeclarations) {
      if (declared.includes("<")) continue;
      const dist = levenshtein(token.toLowerCase(), declared.toLowerCase());
      if (dist < bestDist) {
        best = declared;
        bestDist = dist;
        tie = false;
      } else if (dist === bestDist && declared.toLowerCase() !== best?.toLowerCase()) {
        tie = true;
      }
    }
    if (!best || tie || bestDist === 0 || bestDist > 2) continue;
    problems.push({
      fileId: occ.fileId,
      severity: "warning",
      kind: "poke-parameter",
      message:
        `\`type: poke, ${token}\` has no matching declared poke parameter, but '${best}' is declared in this ` +
        `batch and is a close match — probably a typo of '${best}'.`,
      range: occ.range,
    });
  }

  return problems;
}
