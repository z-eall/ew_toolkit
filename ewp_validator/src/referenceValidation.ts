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
  kind: "data-reference" | "custom-key";
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
const TOP_LEVEL_DATA_REF_FIELDS = ["data", "addItems", "removeItems", "drops"];

function isBarewordReference(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (trimmed === "") return false;
  if (trimmed.includes(",")) return false; // "type, key, value" / "itemid, amount" shorthand
  if (trimmed.includes("<") || trimmed.includes(">")) return false; // a <function> value reads from ZDO data (functions.md), not a data.yaml name
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
  // Format: "key1 value1, key2 value2, ..." — first whitespace-separated
  // token of each comma segment is the key name.
  return raw
    .split(",")
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

// A saved-key template can nest `<...>` inside its name (dynamic parameters) and
// its name can contain `/`, so a flat character-class regex can't extract it.
// Scan the whole document, balance the outer `<...>`, then keep only the
// key-name portion: a `<save_..>` value is its last top-level `_` segment and a
// `<load_..>` default is everything after the first top-level `=`.
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
    if (head[1].startsWith("save")) {
      const segs = splitTopLevel(inner, "_");
      key = segs.length > 1 ? segs.slice(0, -1).join("_") : (segs[0] ?? "");
      if (key) writes.push({ key, range });
    } else if (head[1] === "load") {
      key = splitTopLevel(inner, "=")[0] ?? inner;
      if (key) reads.push({ key, range });
    } else {
      key = inner;
      if (key) reads.push({ key, range });
    }
    i = end - 1;
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
// sentinel a wildcard can span.
function keyToPattern(key: string): RegExp {
  let out = "";
  walkKeySegments(
    key,
    (ch) => (out += escapeRegex(ch)),
    () => (out += ".*"),
  );
  return new RegExp("^" + out + "$");
}

function keyToSubject(key: string): string {
  let out = "";
  walkKeySegments(
    key,
    (ch) => (out += ch),
    () => (out += GROUP_SENTINEL),
  );
  return out;
}

// Does the key have any character outside a `<...>` group? A key that is purely
// dynamic (e.g. `<pid>`) compiles to the `^.*$` matcher, which would match every
// other key — so such a key is never allowed to drive a wildcard match.
function hasLiteral(key: string): boolean {
  let found = false;
  walkKeySegments(
    key,
    () => (found = true),
    () => {},
  );
  return found;
}

// "Likely match": an exact name match, or either key's dynamic-parameter
// skeleton matching the other. This lets a read of `captureblockercity1` resolve
// against a `<save_captureblockercity<int_isRadarCity=0>_..>` write, and a
// `<pid>/teamlead` read against a `<save_<pid>/teamlead_<par_1>>` write. A
// wildcard match only counts from the side that has at least one literal anchor,
// so a purely-dynamic key can't silently suppress unrelated read/write flags.
function keysCompatible(a: string, b: string): boolean {
  if (a === b) return true;
  const aMatchesB = hasLiteral(a) && keyToPattern(a).test(keyToSubject(b));
  const bMatchesA = hasLiteral(b) && keyToPattern(b).test(keyToSubject(a));
  return aMatchesB || bMatchesA;
}

export function runReferenceValidation(files: FileInput[]): FileProblem[] {
  const definitions = new Map<string, Occurrence[]>();
  const dataUsages: { name: string; occ: Occurrence }[] = [];
  const keyWrites = new Map<string, Occurrence[]>();
  const keyReads = new Map<string, Occurrence[]>();

  for (const file of files) {
    const doc = parseDocument(file.text);
    if (doc.errors.length > 0) continue; // structural pre-check already reports this file's syntax errors

    // Custom-saved-key templates can appear inside any string field, so this
    // one part is a whole-document text scan rather than a node walk.
    const { writes, reads } = scanKeyOccurrences(file.text);
    for (const w of writes) recordOccurrence(keyWrites, w.key, { fileId: file.id, range: w.range });
    for (const r of reads) recordOccurrence(keyReads, r.key, { fileId: file.id, range: r.range });

    const root = doc.contents;
    if (!root || !isSeq(root)) continue;

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
        const range = findPairRange(itemNode, field) ?? nodeRange(itemNode);
        dataUsages.push({ name: (raw as string).trim(), occ: { fileId: file.id, range } });
      }

      if (typeof value.keys === "string") {
        const range = findPairRange(itemNode, "keys") ?? nodeRange(itemNode);
        for (const k of parseKeysField(value.keys)) recordOccurrence(keyReads, k, { fileId: file.id, range });
      }
      if (typeof value.bannedKeys === "string") {
        const range = findPairRange(itemNode, "bannedKeys") ?? nodeRange(itemNode);
        for (const k of parseKeysField(value.bannedKeys)) recordOccurrence(keyReads, k, { fileId: file.id, range });
      }
      if (typeof value.type === "string") {
        const keyName = parseTypeKeyParameter(value.type);
        if (keyName) {
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
          const range = findPairRange(nested as YAMLMap, "data") ?? nodeRange(nested as any);
          dataUsages.push({ name: (nestedValue.data as string).trim(), occ: { fileId: file.id, range } });
        }
      }
    }
  }

  const problems: FileProblem[] = [];

  for (const { name, occ } of dataUsages) {
    if (!definitions.has(name)) {
      problems.push({
        fileId: occ.fileId,
        severity: "error",
        kind: "data-reference",
        message: `Undefined data entry reference '${name}'. Add a \`name: ${name}\` entry, or correct the invalid entry.`,
        range: occ.range,
      });
    }
  }

  const usedNames = new Set(dataUsages.map((u) => u.name));
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

  for (const [name, occs] of keyReads) {
    if (writeKeyNames.some((w) => keysCompatible(name, w))) continue;
    for (const occ of occs) {
      problems.push({
        fileId: occ.fileId,
        severity: "info",
        kind: "custom-key",
        message: `Custom saved key '${name}' with no <save_..> found in the loaded files — check expand_world/ewp_data.yaml before treating this as a bug.`,
        range: occ.range,
      });
    }
  }
  for (const [name, occs] of keyWrites) {
    if (readKeyNames.some((r) => keysCompatible(name, r))) continue;
    for (const occ of occs) {
      problems.push({
        fileId: occ.fileId,
        severity: "info",
        kind: "custom-key",
        message: `Custom saved key '${name}' written (<save_..>) but never read in the loaded files — check expand_world/ewp_data.yaml before treating this as a bug.`,
        range: occ.range,
      });
    }
  }

  return problems;
}
