// Ticket 06's data.yaml reference validation, scoped per ticket 04's research:
// this is the one identifier namespace (data.yaml named templates) with a
// clean, purely-structural definition/usage split that needs no external
// game-data index. Global keys and prefab names are explicitly out of scope
// (ticket 04, 2b-iii/2a) — too many legitimate definitions live outside any
// loaded file (vanilla game logic, other mods), which would make a
// structural check mostly false positives.
//
// Three checks, all cross-file (every expand_prefabs_*.yaml + data.yaml in
// the loaded batch is one merged namespace, per the README):
//   1. An undefined `data:`-shaped reference -> hard error.
//   2. A data.yaml entry with zero usages anywhere loaded -> low-severity hint.
//   3. A custom saved key read (keys:/bannedKeys:/type:key/<load_.../<clear_...)
//      with no matching <save_...> write anywhere loaded, or vice versa -> warning.
//      Best-effort by nature (ticket 04): a key can legitimately be written by
//      another mod or a console command outside the loaded batch.
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
  // `type: key, dataName` — the trigger's parameter is the custom key name.
  const [head, ...rest] = raw.split(",");
  if (head.trim().toLowerCase() !== "key") return null;
  const param = rest.join(",").trim();
  return param || null;
}

const SAVE_WRITE_RE = /<save(?:\+\+|--)?_([A-Za-z0-9]+)[^>]*>/g;
const LOAD_READ_RE = /<load_([A-Za-z0-9]+)[^>]*>/g;
const CLEAR_READ_RE = /<clear_([A-Za-z0-9]+)>/g;

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
    for (const m of file.text.matchAll(SAVE_WRITE_RE)) {
      recordOccurrence(keyWrites, m[1], { fileId: file.id, range: [m.index, m.index + m[0].length] });
    }
    for (const m of file.text.matchAll(LOAD_READ_RE)) {
      recordOccurrence(keyReads, m[1], { fileId: file.id, range: [m.index, m.index + m[0].length] });
    }
    for (const m of file.text.matchAll(CLEAR_READ_RE)) {
      recordOccurrence(keyReads, m[1], { fileId: file.id, range: [m.index, m.index + m[0].length] });
    }

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
        message: `Undefined data.yaml reference '${name}' — no entry with \`name: ${name}\` was found in the loaded files.`,
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
        message: `data.yaml entry '${name}' is defined but not used by any loaded file — may be unused, or referenced from a file outside this batch.`,
        range: occ.range,
      });
    }
  }

  for (const [name, occs] of keyReads) {
    if (keyWrites.has(name)) continue;
    for (const occ of occs) {
      problems.push({
        fileId: occ.fileId,
        severity: "warning",
        kind: "custom-key",
        message: `Custom saved key '${name}' is read here, but no <save_${name}_...> write for it was found in the loaded files — check expand_world/ewp_data.yaml to confirm its actual value before treating this as a bug (it may be set by another mod or a console command).`,
        range: occ.range,
      });
    }
  }
  for (const [name, occs] of keyWrites) {
    if (keyReads.has(name)) continue;
    for (const occ of occs) {
      problems.push({
        fileId: occ.fileId,
        severity: "warning",
        kind: "custom-key",
        message: `Custom saved key '${name}' is written here, but no keys:/bannedKeys:/type: key read for it was found in the loaded files — check expand_world/ewp_data.yaml to confirm its actual value before treating this as a bug.`,
        range: occ.range,
      });
    }
  }

  return problems;
}
