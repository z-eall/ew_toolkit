// Shared rules for EWP `data:` / `filter:` / `filters:` / `bannedFilter(s):` validation.
// Cross-checked against PrefabData.cs (Data.data: string; filters/bannedFilters: string[]?),
// ObjectData/PokeData (same filter fields; nested `data:` is legacy alias for `filter:`),
// and docs/scripting.md — scalar fields hold one entry name or one `type, key, value`
// triple; list fields hold multiple typed filter lines.

import { isMap, isSeq, type YAMLMap } from "yaml";
import { findPairRange, getPairValueNode, nodeRange } from "./structuralPrecheck";

/** Top-level rule fields whose string value names a data.yaml entry or inline triple. */
export const TOP_LEVEL_SCALAR_REF_FIELDS = [
  "data",
  "addItems",
  "removeItems",
  "drops",
  "filter",
  "bannedFilter",
] as const;

/** Top-level list fields — each item is a typed filter line or entry name. */
export const TOP_LEVEL_LIST_REF_FIELDS = ["filters", "bannedFilters"] as const;

/** Nested object/poke/bannedObjects fields — same namespace as top-level. */
export const NESTED_SCALAR_REF_FIELDS = ["filter", "bannedFilter"] as const;
export const NESTED_LIST_REF_FIELDS = ["filters", "bannedFilters"] as const;

/** Legacy nested alias for singular `filter:` (ObjectData.data in C#). */
export const NESTED_LEGACY_FILTER_DATA_FIELD = "data";

/** spawn[]/swap[] nested `data:` — same scalar semantics as top-level action `data:`. */
export const SPAWN_SCALAR_REF_FIELDS = ["data"] as const;

const SCALAR_DATA_VALUE_FIELDS = new Set<string>([
  ...TOP_LEVEL_SCALAR_REF_FIELDS,
  ...NESTED_SCALAR_REF_FIELDS,
  ...SPAWN_SCALAR_REF_FIELDS,
  NESTED_LEGACY_FILTER_DATA_FIELD,
]);

export function normalizeDataReferenceValue(raw: unknown): string | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (trimmed.includes(",")) return null;
  if (/[<>]/.test(trimmed) && !hasLiteralAnchor(trimmed)) return null;
  return trimmed;
}

export function isBarewordDataReference(raw: unknown): raw is string {
  return normalizeDataReferenceValue(raw) !== null;
}

export function isDropsReference(raw: unknown): raw is string {
  return isBarewordDataReference(raw) && !/^(true|false)$/i.test(raw as string);
}

/** EWP typed filter / data shorthand line: `type, key, value` (optional weight). */
export function looksLikeTypedValueLine(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (trimmed.includes("<")) return false;
  return /^\w+\s*,\s*\w+\s*,\s*.+/.test(trimmed);
}

function scalarRefPredicate(field: string): (raw: unknown) => raw is string {
  return field === "drops" ? isDropsReference : isBarewordDataReference;
}

export interface DataReferenceUsage {
  name: string;
  range: [number, number];
  /** When true, undefined-name errors are suppressed (legacy nested `data:`). */
  suppressUndefinedError?: boolean;
}

export interface LegacyFormatNotice {
  arrKey: string;
  range: [number, number];
}

function collectListRefs(
  parentNode: YAMLMap,
  field: string,
  add: (name: string, range: [number, number]) => void,
): void {
  const seqNode = getPairValueNode(parentNode, field);
  if (!seqNode || !isSeq(seqNode as any)) return;
  for (const itemScalar of (seqNode as any).items) {
    const raw = (itemScalar as { value?: unknown })?.value;
    if (!isBarewordDataReference(raw)) continue;
    const name = normalizeDataReferenceValue(raw);
    if (!name) continue;
    const itemHasRange = !!(itemScalar as any).range;
    const range = itemHasRange
      ? nodeRange(itemScalar as any)
      : (findPairRange(parentNode, field) ?? nodeRange(parentNode as any));
    add(name, range);
  }
}

function collectScalarRefs(
  parentNode: YAMLMap,
  fields: readonly string[],
  value: Record<string, unknown>,
  add: (name: string, range: [number, number]) => void,
): void {
  for (const field of fields) {
    const raw = value[field];
    if (!scalarRefPredicate(field)(raw)) continue;
    const name = normalizeDataReferenceValue(raw);
    if (!name) continue;
    add(name, findPairRange(parentNode, field) ?? nodeRange(parentNode as any));
  }
}

/** Walk one EWP rule entry for data.yaml reference usages (top-level + nested). */
export function collectRuleEntryDataReferences(
  itemNode: YAMLMap,
  value: Record<string, unknown>,
): { usages: DataReferenceUsage[]; legacyNotices: LegacyFormatNotice[] } {
  const usages: DataReferenceUsage[] = [];
  const legacyNotices: LegacyFormatNotice[] = [];

  const addUsage = (name: string, range: [number, number], suppressUndefinedError?: boolean) =>
    usages.push({ name: name.trim(), range, suppressUndefinedError });

  collectScalarRefs(itemNode, TOP_LEVEL_SCALAR_REF_FIELDS, value, addUsage);
  for (const field of TOP_LEVEL_LIST_REF_FIELDS) {
    collectListRefs(itemNode, field, addUsage);
  }

  for (const arrKey of ["spawn", "swap"] as const) {
    const arrNode = getPairValueNode(itemNode, arrKey);
    if (!arrNode || !isSeq(arrNode as any)) continue;
    for (const nested of (arrNode as any).items) {
      if (!isMap(nested)) continue;
      const nestedValue = (nested as YAMLMap).toJSON() as Record<string, unknown>;
      collectScalarRefs(nested as YAMLMap, SPAWN_SCALAR_REF_FIELDS, nestedValue, addUsage);
    }
  }

  for (const arrKey of ["objects", "bannedObjects", "poke"] as const) {
    const arrNode = getPairValueNode(itemNode, arrKey);
    if (!arrNode || !isSeq(arrNode as any)) continue;
    for (const nested of (arrNode as any).items) {
      if (!isMap(nested)) continue;
      const nestedValue = (nested as YAMLMap).toJSON() as Record<string, unknown>;
      const nestedMap = nested as YAMLMap;

      collectScalarRefs(nestedMap, NESTED_SCALAR_REF_FIELDS, nestedValue, addUsage);
      for (const field of NESTED_LIST_REF_FIELDS) {
        collectListRefs(nestedMap, field, addUsage);
      }

      const legacyRaw = nestedValue[NESTED_LEGACY_FILTER_DATA_FIELD];
      const legacyName = normalizeDataReferenceValue(legacyRaw);
      if (legacyName) {
        const range =
          findPairRange(nestedMap, NESTED_LEGACY_FILTER_DATA_FIELD) ?? nodeRange(nestedMap as any);
        addUsage(legacyName, range, true);
        legacyNotices.push({ arrKey, range });
      }
    }
  }

  return { usages, legacyNotices };
}

/** Clearer ajv substitute when a scalar data/filter field receives a YAML list. */
export function scalarDataFieldTypeMessage(field: string): string | null {
  if (!SCALAR_DATA_VALUE_FIELDS.has(field)) return null;
  if (field === "data") {
    return (
      "`data:` must be a single value (`entryName` or `type, key, value`). " +
      "For multiple typed lines use `filters:`, or reference a `data.yaml` entry."
    );
  }
  if (field === "filter" || field === "bannedFilter") {
    const plural = field === "filter" ? "filters" : "bannedFilters";
    return `\`${field}:\` must be a single value (\`entryName\` or \`type, key, value\`). For multiple lines use \`${plural}:\`.`;
  }
  if (field === "drops" || field === "addItems" || field === "removeItems") {
    return `\`${field}:\` must be a single string value, not a YAML list.`;
  }
  return `\`${field}:\` must be a single string value.`;
}

function hasLiteralAnchor(key: string): boolean {
  let found = false;
  let i = 0;
  while (i < key.length) {
    if (key[i] === "<") {
      const end = findGroupEnd(key, i);
      if (end === -1) {
        for (; i < key.length; i++) if (key[i] !== "*") found = true;
        return found;
      }
      i = end;
    } else {
      if (key[i] !== "*") found = true;
      i++;
    }
  }
  return found;
}

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
