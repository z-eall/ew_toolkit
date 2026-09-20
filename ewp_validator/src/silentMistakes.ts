// Detectors for "silent mistakes": scripts EWP accepts and loads, where part of what was written
// quietly does nothing (round 6 ticket 18, decided in ticket 14). Pure predicates, no message
// text: the wording lives in practiceRecommendations.ts. Each rule was read against the mod's C#
// first; the provenance entries in diagnosisProvenance.ts name the files.
//
//   silent-condition-operator     `==` or `<>` in a condition (Conditions.cs reads a single `=`; a
//                                 condition that does not parse becomes "always false").
//   silent-poke-world-centre      a `poke:` under a prefab-less globalkey/key/time/realtime rule with
//                                 no maxDistance/position/offset (those triggers run at 0,0,0; the
//                                 default reach is 100 m).
//   silent-filter-weight-part     a 4th comma part in a filter value, read as a weight.
//   silent-change-needs-trigger-rules   a rule writes `data:` on its own object while a `type: change`
//                                 rule for the same key waits (writes made by a rule are ignored by
//                                 the change handler unless triggerRules is true).
//   silent-key-store-mix          EWP keys (`<save_X>`, `type: key`) and Valheim global keys
//                                 (`setkey`, `type: globalkey`, `globalKeys:`) are two separate stores.
import { isMap, isSeq, parseDocument, type YAMLMap } from "yaml";
import { stripLineComments } from "./referenceValidation";
import { findPairRange, getPairValueNode, nodeRange } from "./structuralPrecheck";

export type SilentFinding =
  | { id: "silent-condition-operator"; op: "==" | "<>"; range: [number, number] }
  | { id: "silent-poke-world-centre"; range: [number, number] }
  | { id: "silent-filter-weight-part"; shown: string; range: [number, number] }
  | { id: "silent-change-needs-trigger-rules"; key: string; range: [number, number] }
  | { id: "silent-key-store-mix"; key: string; watcher: "globalkey" | "globalKeys" | "key"; range: [number, number] };

// ---------------------------------------------------------------------------------------------
// Rule 1: `==` and `<>` in a condition

/**
 * Finds a comparison the mod does not know. Mirrors Conditions.cs's tokenizer: a `<...>` group is a
 * function value, quoted text is a value, `<=` `>=` `!=` `=` are the comparisons. `==` becomes two
 * `=` tokens and `<>` becomes `<` then `>` (a `<` followed by `>` is not a function value), and
 * neither parses.
 */
export function findBadConditionOperator(condition: string): "==" | "<>" | null {
  let i = 0;
  while (i < condition.length) {
    const c = condition[i]!;
    if (c === "'" || c === '"') {
      const close = condition.indexOf(c, i + 1);
      if (close < 0) return null; // unterminated quote: the mod reports that itself
      i = close + 1;
      continue;
    }
    if (c === "<") {
      const next = condition[i + 1];
      if (next === ">") return "<>";
      if (next !== undefined && next !== "=" && !/\s/.test(next)) {
        // A function value: skip to its matching `>`.
        let depth = 0;
        let j = i;
        for (; j < condition.length; j++) {
          if (condition[j] === "<") depth++;
          else if (condition[j] === ">" && --depth === 0) break;
        }
        if (j < condition.length) {
          i = j + 1;
          continue;
        }
      }
      i += next === "=" ? 2 : 1;
      continue;
    }
    if (c === ">" && condition[i + 1] === "=") {
      i += 2;
      continue;
    }
    if (c === "!" && condition[i + 1] === "=") {
      i += 2;
      continue;
    }
    if (c === "=" && condition[i + 1] === "=") return "==";
    i++;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Walking one rule entry: the entry itself and the nested item maps that carry the same fields

const NESTED_LISTS = ["objects", "bannedObjects", "poke", "spawn", "swap", "spawns", "swaps"] as const;
const FILTER_SECTIONS = new Set(["objects", "bannedObjects", "poke"]);

interface MapInSection {
  map: YAMLMap;
  section: string | null;
  json: Record<string, unknown>;
}

function mapsOf(itemNode: YAMLMap): MapInSection[] {
  const out: MapInSection[] = [{ map: itemNode, section: null, json: itemNode.toJSON() as Record<string, unknown> }];
  for (const key of NESTED_LISTS) {
    const seq = getPairValueNode(itemNode, key);
    if (!isSeq(seq)) continue;
    for (const nested of seq.items) {
      if (isMap(nested)) out.push({ map: nested as YAMLMap, section: key, json: (nested as YAMLMap).toJSON() as Record<string, unknown> });
    }
  }
  return out;
}

const isNumber = (s: string) => /^-?\d+(\.\d+)?$/.test(s);

/** Rule 3 and 4 help: the trigger words of an entry, lowercased ("change, level" gives "change"). */
export function typeWordsOf(value: Record<string, unknown>): string[] {
  const raw = Array.isArray(value.types) ? value.types : typeof value.type === "string" ? [value.type] : [];
  return raw.filter((t): t is string => typeof t === "string").map((t) => t.split(",")[0]!.trim().toLowerCase());
}

/** The first argument after the trigger word: "change, level" gives "level". */
function firstTypeArgument(typeText: string): string | null {
  const comma = typeText.indexOf(",");
  if (comma < 0) return null;
  const arg = typeText.slice(comma + 1).trim().split(/[,\s]+/)[0];
  return arg ? arg : null;
}

function typeTexts(value: Record<string, unknown>): string[] {
  const raw = Array.isArray(value.types) ? value.types : typeof value.type === "string" ? [value.type] : [];
  return raw.filter((t): t is string => typeof t === "string");
}

// ---------------------------------------------------------------------------------------------
// Rules 1, 3, 4: found inside one entry

export function findSilentEntryMistakes(itemNode: YAMLMap, value: Record<string, unknown>): SilentFinding[] {
  const found: SilentFinding[] = [];
  for (const { map, section, json } of mapsOf(itemNode)) {
    // Rule 1
    if (typeof json.condition === "string") {
      const op = findBadConditionOperator(json.condition);
      if (op) found.push({ id: "silent-condition-operator", op, range: findPairRange(map, "condition") ?? nodeRange(map) });
    }
    // Rule 4: a filter written "type, key, value, extra" where both value and extra are plain numbers
    if (json.filterLimit === undefined) {
      const fields: string[] = ["filter", "bannedFilter", "filters", "bannedFilters"];
      if (section !== null && FILTER_SECTIONS.has(section)) fields.push("data");
      for (const field of fields) {
        const raw = json[field];
        const texts = typeof raw === "string" ? [raw] : Array.isArray(raw) ? raw.filter((r): r is string => typeof r === "string") : [];
        for (const text of texts) {
          if (text.includes("<")) continue;
          const parts = text.split(",").map((p) => p.trim());
          if (parts.length === 4 && isNumber(parts[2]!) && isNumber(parts[3]!)) {
            found.push({ id: "silent-filter-weight-part", shown: text.trim().slice(0, 40), range: findPairRange(map, field) ?? nodeRange(map) });
          }
        }
      }
    }
  }
  // Rule 3
  const prefab = typeof value.prefab === "string" ? value.prefab.trim() : "";
  if (prefab === "" && !("prefab" in value && typeof value.prefab !== "string" && value.prefab !== null)) {
    const atWorldCentre = typeWordsOf(value).some((t) => t === "globalkey" || t === "key" || t === "time" || t === "realtime");
    const pokes = getPairValueNode(itemNode, "poke");
    if (atWorldCentre && isSeq(pokes)) {
      for (const pokeNode of pokes.items) {
        if (!isMap(pokeNode)) continue;
        const json = (pokeNode as YAMLMap).toJSON() as Record<string, unknown>;
        if (json.maxDistance === undefined && json.position === undefined && json.offset === undefined) {
          found.push({ id: "silent-poke-world-centre", range: nodeRange(pokeNode as YAMLMap) });
        }
      }
    }
  }
  return found;
}

// ---------------------------------------------------------------------------------------------
// Rules 2 and 5: found across the loaded files

interface FileFacts {
  /** `data:` writes on a rule's own object: prefab (lowercase), the keys written, where. */
  writers: Array<{ prefab: string; dataName: string | null; keys: string[]; range: [number, number] }>;
  /** Named data entries in this file: lowercase name to the keys they write. */
  dataEntries: Array<{ name: string; keys: string[] }>;
  /** `type: change, KEY` rules: prefab (lowercase) and key (exact text). */
  changeWatchers: Array<{ prefab: string; key: string }>;
  /** `<save_KEY...>` writes to EWP's own key store (lowercase keys). */
  ewpWrites: Set<string>;
  /** `setkey KEY` in a command (lowercase keys). */
  setKeys: Set<string>;
  /** Watchers of Valheim global keys: `type: globalkey, KEY` and `globalKeys:` entries. */
  globalWatchers: Array<{ key: string; shown: string; via: "globalkey" | "globalKeys"; range: [number, number] }>;
  /** `type: key, KEY` watchers of EWP keys. `shown` keeps the spelling written in the script. */
  keyWatchers: Array<{ key: string; shown: string; range: [number, number] }>;
}

const TYPED_LISTS = ["ints", "floats", "strings", "bools", "longs", "vecs", "quats", "bytes", "hashes"];
const DATA_TYPE_WORDS = new Set(["int", "float", "string", "bool", "long", "vec", "quat", "byte", "hash", "hashcode", "zdoid", "bytearray"]);
const SAVE_WRITE = /<save(?:\+\+|--)?_([^_<>=\s]+)(?=[_>])/gi;
const SET_KEY = /\bsetkey\s+([A-Za-z0-9_.\-]+)/gi;

const factsCache = new Map<string, FileFacts>();
const FACTS_CACHE_LIMIT = 2000;

function collectFacts(text: string): FileFacts {
  const cached = factsCache.get(text);
  if (cached) return cached;
  const facts: FileFacts = { writers: [], dataEntries: [], changeWatchers: [], ewpWrites: new Set(), setKeys: new Set(), globalWatchers: [], keyWatchers: [] };
  const bare = stripLineComments(text);
  for (const m of bare.matchAll(SAVE_WRITE)) facts.ewpWrites.add(m[1]!.toLowerCase());
  for (const m of bare.matchAll(SET_KEY)) facts.setKeys.add(m[1]!.toLowerCase());

  const doc = parseDocument(text);
  if (doc.errors.length === 0 && isSeq(doc.contents)) {
    for (const node of doc.contents.items) {
      if (!isMap(node)) continue;
      const item = node as YAMLMap;
      const value = item.toJSON() as Record<string, unknown>;

      if (typeof value.name === "string") {
        const keys: string[] = [];
        for (const list of TYPED_LISTS) {
          const arr = value[list];
          if (Array.isArray(arr)) for (const entry of arr) if (typeof entry === "string") keys.push(entry.split(",")[0]!.trim());
        }
        facts.dataEntries.push({ name: value.name.trim().toLowerCase(), keys });
      }

      const prefab = typeof value.prefab === "string" ? value.prefab.trim().toLowerCase() : "";
      const typeRange = findPairRange(item, Array.isArray(value.types) ? "types" : "type") ?? nodeRange(item);

      for (const text of typeTexts(value)) {
        const word = text.split(",")[0]!.trim().toLowerCase();
        const arg = firstTypeArgument(text);
        if (!arg) continue;
        if (word === "change" && prefab !== "") facts.changeWatchers.push({ prefab, key: arg });
        if (word === "globalkey") facts.globalWatchers.push({ key: arg.toLowerCase(), shown: arg, via: "globalkey", range: typeRange });
        if (word === "key") facts.keyWatchers.push({ key: arg.toLowerCase(), shown: arg, range: typeRange });
      }

      for (const field of ["globalKeys", "bannedGlobalKeys"]) {
        const raw = value[field];
        if (typeof raw !== "string") continue;
        for (const part of raw.split(/[,;]/)) {
          const shown = part.trim().split("=")[0]!.trim();
          if (shown) facts.globalWatchers.push({ key: shown.toLowerCase(), shown, via: "globalKeys", range: findPairRange(item, field) ?? nodeRange(item) });
        }
      }

      // A rule's own `data:` write (not a removal, not a spawn): inline triple or a named entry.
      if (prefab !== "" && typeof value.data === "string" && value.remove !== true && value.remove !== "true") {
        const rawData = value.data.trim();
        const parts = rawData.split(",").map((p) => p.trim());
        const range = findPairRange(item, "data") ?? nodeRange(item);
        const triggerRules = value.triggerRules;
        const noTrigger = triggerRules === undefined || triggerRules === false || triggerRules === "false";
        if (noTrigger) {
          if (parts.length >= 3 && DATA_TYPE_WORDS.has(parts[0]!.toLowerCase())) facts.writers.push({ prefab, dataName: null, keys: [parts[1]!], range });
          else if (parts.length === 1 && rawData !== "") facts.writers.push({ prefab, dataName: rawData.toLowerCase(), keys: [], range });
        }
      }
    }
  }
  if (factsCache.size >= FACTS_CACHE_LIMIT) factsCache.delete(factsCache.keys().next().value as string);
  factsCache.set(text, facts);
  return facts;
}

/** Rules 2 and 5 over a whole batch of files. Each finding names the file it points into. */
export function findSilentCrossFileMistakes(files: Array<{ id: string; text: string }>): Array<{ fileId: string; finding: SilentFinding }> {
  // One file that cannot be read for these checks is skipped; the others still run.
  const perFile = files.map((f) => {
    try {
      return { id: f.id, facts: collectFacts(f.text) };
    } catch {
      return { id: f.id, facts: { writers: [], dataEntries: [], changeWatchers: [], ewpWrites: new Set<string>(), setKeys: new Set<string>(), globalWatchers: [], keyWatchers: [] } as FileFacts };
    }
  });
  const out: Array<{ fileId: string; finding: SilentFinding }> = [];

  const dataEntryKeys = new Map<string, string[]>();
  const changeKeys = new Set<string>(); // "prefab\0key"
  const ewpWrites = new Set<string>();
  const setKeys = new Set<string>();
  for (const { facts } of perFile) {
    for (const e of facts.dataEntries) dataEntryKeys.set(e.name, e.keys);
    for (const w of facts.changeWatchers) changeKeys.add(`${w.prefab}\0${w.key}`);
    facts.ewpWrites.forEach((k) => ewpWrites.add(k));
    facts.setKeys.forEach((k) => setKeys.add(k));
  }

  for (const { id, facts } of perFile) {
    // Rule 2
    for (const w of facts.writers) {
      const keys = w.dataName !== null ? (dataEntryKeys.get(w.dataName) ?? []) : w.keys;
      const hit = keys.find((k) => changeKeys.has(`${w.prefab}\0${k}`));
      if (hit) out.push({ fileId: id, finding: { id: "silent-change-needs-trigger-rules", key: hit, range: w.range } });
    }
    // Rule 5, EWP key read as a global key
    for (const g of facts.globalWatchers) {
      if (ewpWrites.has(g.key) && !setKeys.has(g.key)) out.push({ fileId: id, finding: { id: "silent-key-store-mix", key: g.shown, watcher: g.via, range: g.range } });
    }
    // Rule 5, global key read as an EWP key
    for (const k of facts.keyWatchers) {
      if (setKeys.has(k.key) && !ewpWrites.has(k.key)) out.push({ fileId: id, finding: { id: "silent-key-store-mix", key: k.shown, watcher: "key", range: k.range } });
    }
  }
  return out;
}
