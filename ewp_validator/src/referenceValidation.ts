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
import { findPairRange, getPairValueNode, guessBranch, nodeRange, type Severity } from "./structuralPrecheck";

export interface FileProblem {
  fileId: string;
  severity: Severity;
  message: string;
  kind: "data-reference" | "custom-key" | "legacy-object-data";
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

// Fields documented as taking either a bareword data.yaml entry name or an
// inline shorthand (a comma means "this is the shorthand, not a reference") —
// see docs/scripting.md's Actions and Spawns sections. Object/poke filter
// `data:` fields are deliberately excluded: per PrefabData.cs, that field is
// a single-filter shorthand (`Filters([data.data], ...)`), a different
// semantic despite the same field name, and not scoped by ticket 06.
// `filter` names a data entry used as an object-data filter (docs/scripting.md):
// same namespace as `data:`, and a comma value is the inline `type, key, value`
// shorthand (isBarewordReference already excludes it). Its list sibling
// `filters` is handled separately below, item by item.
const TOP_LEVEL_DATA_REF_FIELDS = ["data", "addItems", "removeItems", "drops", "filter", "bannedFilter"];
const TOP_LEVEL_DATA_REF_LIST_FIELDS = ["filters", "bannedFilters"];

// Nested object/poke filter fields (PrefabData.cs's ObjectData/PokeData, shared
// by objects:/bannedObjects:/poke: array items): `filter`/`filters`/
// `bannedFilter`/`bannedFilters` name a data.yaml entry the same way the
// top-level fields do. `data` on these nested items is a different story — a
// live-tested legacy alias for the singular `filter` (same underlying
// property, not the top-level rule's own action `data:` field despite the
// shared name) — so it's tracked separately below, alongside a "flag legacy
// format, don't misreport it as unused" notice.
const NESTED_FILTER_SCALAR_FIELDS = ["filter", "bannedFilter"];
const NESTED_FILTER_LIST_FIELDS = ["filters", "bannedFilters"];
const NESTED_LEGACY_DATA_FIELD = "data";

function isBarewordReference(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (trimmed === "") return false;
  if (trimmed.includes(",")) return false; // "type, key, value" / "itemid, amount" shorthand
  // A value built purely from `<...>` parameters (e.g. `<string_isSpawningPrefabData>`)
  // reads from the object's own ZDO data at runtime (functions.md) — nothing to
  // check here. But a value that *mixes* literal text with a dynamic parameter
  // (e.g. `newDeerDropLevel<par_1>`) names a family of data.yaml entries by a
  // literal prefix/skeleton, the same best-effort wildcard idea already used
  // for custom saved keys below (see keyToPattern) — worth a fuzzy-match check,
  // not a silent skip.
  if (/[<>]/.test(trimmed) && !hasLiteral(trimmed)) return false;
  return true;
}

function isDropsReference(raw: unknown): raw is string {
  return isBarewordReference(raw) && !/^(true|false)$/i.test(raw as string);
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

    const root = doc.contents;
    if (!root || !isSeq(root)) continue;

    const addDataUsage = (name: string, range: [number, number], suppressUndefinedError?: boolean) =>
      dataUsages.push({ name: name.trim(), occ: { fileId: file.id, range }, suppressUndefinedError });

    for (const itemNode of root.items) {
      if (!isMap(itemNode)) continue;
      const value = itemNode.toJSON() as Record<string, unknown>;
      const { branch } = guessBranch(value);

      if (branch === "wecDataEntry" && typeof value.name === "string" && value.name.trim() !== "") {
        const range = findPairRange(itemNode, "name") ?? nodeRange(itemNode);
        recordOccurrence(definitions, value.name.trim(), { fileId: file.id, range });
      }

      if (branch !== "ewpRuleEntry") continue;

      for (const field of TOP_LEVEL_DATA_REF_FIELDS) {
        const raw = value[field];
        // A `data:` value carrying commas is the "type, key, value" injection
        // shorthand (scripting.md), and a `<...>` value reads from the object's
        // own ZDO data (functions.md) — neither names a data.yaml entry, and
        // neither is verifiable here, so both fall through unflagged.
        const isRef = field === "drops" ? isDropsReference(raw) : isBarewordReference(raw);
        if (!isRef) continue;
        addDataUsage(raw as string, findPairRange(itemNode, field) ?? nodeRange(itemNode));
      }

      // List-valued reference fields (`filters:`): every bareword item names a
      // data entry. Walk the AST seq so each undefined name points at its own
      // line rather than at the whole field.
      for (const field of TOP_LEVEL_DATA_REF_LIST_FIELDS) {
        const seqNode = getPairValueNode(itemNode, field);
        if (!seqNode || !isSeq(seqNode as any)) continue;
        for (const itemScalar of (seqNode as any).items) {
          const raw = (itemScalar as { value?: unknown })?.value;
          if (!isBarewordReference(raw)) continue;
          const itemHasRange = !!(itemScalar as any).range;
          const range = itemHasRange ? nodeRange(itemScalar as any) : findPairRange(itemNode, field) ?? nodeRange(itemNode);
          addDataUsage(raw, range);
        }
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

      // spawn[]/swap[] entries support the same bareword-or-shorthand `data:` field.
      for (const arrKey of ["spawn", "swap"]) {
        const arrNode = getPairValueNode(itemNode, arrKey);
        if (!arrNode || !isSeq(arrNode as any)) continue;
        for (const nested of (arrNode as any).items) {
          if (!isMap(nested)) continue;
          const nestedValue = (nested as YAMLMap).toJSON() as Record<string, unknown>;
          if (!isBarewordReference(nestedValue.data)) continue;
          addDataUsage(nestedValue.data as string, findPairRange(nested as YAMLMap, "data") ?? nodeRange(nested as any));
        }
      }

      // objects:/bannedObjects:/poke: array items (ObjectData/PokeData in
      // PrefabData.cs) carry their own filter fields, same data.yaml
      // namespace as the top-level ones above. A string item is the legacy
      // single-line object format (`Object(string line)`) — nothing
      // structured to read a data-entry name out of, so it's skipped.
      for (const arrKey of ["objects", "bannedObjects", "poke"]) {
        const arrNode = getPairValueNode(itemNode, arrKey);
        if (!arrNode || !isSeq(arrNode as any)) continue;
        for (const nested of (arrNode as any).items) {
          if (!isMap(nested)) continue;
          const nestedValue = (nested as YAMLMap).toJSON() as Record<string, unknown>;

          for (const field of NESTED_FILTER_SCALAR_FIELDS) {
            const raw = nestedValue[field];
            if (!isBarewordReference(raw)) continue;
            addDataUsage(raw as string, findPairRange(nested as YAMLMap, field) ?? nodeRange(nested as any));
          }
          for (const field of NESTED_FILTER_LIST_FIELDS) {
            const seqNode = getPairValueNode(nested as YAMLMap, field);
            if (!seqNode || !isSeq(seqNode as any)) continue;
            for (const itemScalar of (seqNode as any).items) {
              const raw = (itemScalar as { value?: unknown })?.value;
              if (!isBarewordReference(raw)) continue;
              const itemHasRange = !!(itemScalar as any).range;
              const range = itemHasRange
                ? nodeRange(itemScalar as any)
                : findPairRange(nested as YAMLMap, field) ?? nodeRange(nested as any);
              addDataUsage(raw, range);
            }
          }

          // `data:` here is the legacy alias for the singular `filter:`
          // (still works — same underlying property, ticket 08) — counts as
          // a real usage like `filter:` does (so a real entry it points at
          // isn't wrongly flagged unused), but never as an "undefined
          // reference" error of its own: the ask is to flag the legacy
          // *format*, not raise a data-reference error on top of it, and this
          // field's real-world value shapes are less battle-tested here than
          // the modern `filter:` fields, so an unresolved name is left to the
          // legacy-format notice alone rather than also getting a hard error.
          const legacyRaw = nestedValue[NESTED_LEGACY_DATA_FIELD];
          if (isBarewordReference(legacyRaw)) {
            const range = findPairRange(nested as YAMLMap, NESTED_LEGACY_DATA_FIELD) ?? nodeRange(nested as any);
            addDataUsage(legacyRaw as string, range, true);
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
        }
      }
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

  return problems;
}
