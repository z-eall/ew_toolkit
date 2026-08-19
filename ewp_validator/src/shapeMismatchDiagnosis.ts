// Diagnosis arbitration — intent-specific messages that replace generic ajv errors
// when the scripter's mistake is a known *shape confusion*, not an abstract
// schema type mismatch.
//
// OWNERSHIP: This module owns the confusion catalog. Do not add parallel
// shape-mismatch checks in structuralPrecheck or domain modules — register a
// rule here instead. Domain modules export detectors only (e.g.
// `looksLikeTypedValueLine` in dataFieldValidation.ts); this module decides
// messages and which ajv instancePaths to suppress.
//
// CALL SITE: structuralPrecheck calls `diagnoseEntryShapeIssues()` per list
// item (before ajv), merges `suppressAjvPaths` with rpcSuppressPaths, and
// uses scalarDataFieldTypeMessage() only as a fallback when no rule claimed
// the path. WEC `data:`/`name:` typo uses `skipEntryAjv` so ajv never runs.
//
// See `.scratch/diagnosis-arbitration/map.md` for the full arbitration stack
// and rules against duplication with RPC / legacy / format-lint layers.

import { isMap, isSeq, type YAMLMap } from "yaml";
import {
  looksLikeTypedValueLine,
  NESTED_LEGACY_FILTER_DATA_FIELD,
  NESTED_SCALAR_REF_FIELDS,
  SPAWN_SCALAR_REF_FIELDS,
  TOP_LEVEL_LIST_REF_FIELDS,
  TOP_LEVEL_SCALAR_REF_FIELDS,
} from "./dataFieldValidation";
import { STRUCTURE_PROBLEM_CATEGORY, VALUE_PROBLEM_CATEGORY } from "./diagnosisCategories";
import { findPairRange, getPairValueNode, nodeRange, type Severity } from "./structuralPrecheck";

export interface ShapeMismatchDiagnosis {
  severity: Severity;
  message: string;
  branch: string;
  entryType: string;
  range: [number, number];
  /** ajv instancePath to suppress when this diagnosis wins (e.g. "/data"). */
  suppressAjvPath: string;
}

export interface ShapeMismatchResult {
  diagnoses: ShapeMismatchDiagnosis[];
  suppressAjvPaths: Set<string>;
  /** When true, ajv must not run on this entry (catalog row fully covers it). */
  skipEntryAjv?: boolean;
}

export const WEC_NAME_TYPO_RULE_ID = "wec-data-key-name-typo";
export const RPC_ORPHAN_SIBLING_PARAM_RULE_ID = "ewp-rpc-orphan-sibling-param";
export const RPC_MISSING_NAME_RULE_ID = "ewp-rpc-missing-name";
export const MALFORMED_TYPED_LINE_LIST_RULE_ID = "ewp-malformed-typed-line-list";

const RPC_LIST_FIELDS = ["objectRpc", "clientRpc"] as const;

const ORPHAN_SIBLING_PARAM_MESSAGE =
  "This numbered parameter line looks like it belongs to the previous RPC entry — indent it under that entry, not as a new list item.";

const MISSING_RPC_NAME_MESSAGE =
  "This RPC list item has numbered parameters but no `name:` — add `name: YourRpcName`.";

function hasNumberedRpcParamKeys(entry: Record<string, unknown>): boolean {
  return Object.keys(entry).some((k) => /^[1-9][0-9]*$/.test(k));
}

function numberedParamKeys(entry: Record<string, unknown>): string[] {
  return Object.keys(entry).filter((k) => /^[1-9][0-9]*$/.test(k));
}

function isNameOnlyRpcEntry(entry: Record<string, unknown>): boolean {
  return typeof entry.name === "string" && !hasNumberedRpcParamKeys(entry);
}

function orphanEntrySuppressPaths(
  field: string,
  entryIdx: number,
  entry: Record<string, unknown>,
): string[] {
  const paths = [`/${field}/${entryIdx}`];
  for (const key of numberedParamKeys(entry)) {
    paths.push(`/${field}/${entryIdx}/${key}`);
  }
  return paths;
}

export interface RpcOrphanListItemResult {
  diagnoses: ShapeMismatchDiagnosis[];
  suppressAjvPaths: Set<string>;
  /** Per RPC field, list indices where checkRpcParams must not run. */
  skipRpcParamCheck: Map<string, Set<number>>;
}

const WEC_NAME_TYPO_MESSAGE =
  "Use `name:`, not `data:`, to name a data entry. This entry will not register (a known WEC README typo).";

type RuleContext = {
  itemNode: YAMLMap;
  value: Record<string, unknown>;
  entryType: string;
};

/** One catalog row: detect a confusion class and emit a specific diagnosis. */
type ShapeMismatchRule = {
  id: string;
  run: (ctx: RuleContext) => ShapeMismatchDiagnosis[];
};

function stringListItems(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const items = raw.map((item) => (typeof item === "string" ? item.trim() : "")).filter((s) => s !== "");
  return items.length > 0 ? items : null;
}

function rangeForScalarListField(parentNode: YAMLMap, field: string): [number, number] {
  const seqNode = getPairValueNode(parentNode, field);
  if (seqNode && isSeq(seqNode as any) && (seqNode as any).items.length > 0) {
    const first = (seqNode as any).items[0];
    const last = (seqNode as any).items[(seqNode as any).items.length - 1];
    if (first?.range && last?.range) {
      return [first.range[0], last.range[1]];
    }
  }
  return findPairRange(parentNode, field) ?? nodeRange(parentNode as any);
}

function messageScalarFieldAsTypedLineList(field: string, lines: string[]): string {
  const plural =
    field === "filter" ? "filters" : field === "bannedFilter" ? "bannedFilters" : "filters";
  const example = lines[0];
  if (lines.length === 1) {
    return (
      `Invalid \`${field}:\` format — this looks like a filter line written as a YAML list. ` +
      `Use \`${field}: ${example}\` on one line, or move it under \`${plural}:\` if you need multiple lines.`
    );
  }
  return (
    `Invalid \`${field}:\` format — typed filter lines belong under \`${plural}:\`, not \`${field}:\`. ` +
    `\`${field}:\` accepts only one \`type, key, value\` triple or a \`data.yaml\` entry name.`
  );
}

function messageScalarFieldAsEntryNameList(field: string, lines: string[]): string {
  const plural =
    field === "filter" ? "filters" : field === "bannedFilter" ? "bannedFilters" : "filters";
  if (lines.length === 1) {
    return (
      `Invalid \`${field}:\` format — \`${field}:\` holds one \`data.yaml\` entry name or one inline triple. ` +
      `Use \`${field}: ${lines[0]}\` on one line, or \`${plural}:\` for a list of names/lines.`
    );
  }
  return (
    `Invalid \`${field}:\` format — multiple entry names belong under \`${plural}:\`, not \`${field}:\`.`
  );
}

const MALFORMED_TYPED_LINE_FIELDS = new Set(["data", "filter", "bannedFilter"]);

function messageMalformedTypedLineList(field: string, lines: string[]): string {
  const plural =
    field === "filter" ? "filters" : field === "bannedFilter" ? "bannedFilters" : "filters";
  if (lines.length === 1) {
    return (
      `Invalid \`${field}:\` format — this looks like an incomplete \`type, key, value\` line written as a YAML list. ` +
      `Use \`${field}: type, key, value\` on one line (three comma-separated parts).`
    );
  }
  return (
    `Invalid \`${field}:\` format — lines with commas must be full \`type, key, value\` triples. ` +
    `Put complete lines under \`${plural}:\`, or one triple on \`${field}:\`.`
  );
}

function isMalformedTypedLineList(field: string, lines: string[]): boolean {
  if (!MALFORMED_TYPED_LINE_FIELDS.has(field)) return false;
  const allBareword = lines.every((line) => !line.includes(","));
  if (allBareword) return false;
  if (lines.some(looksLikeTypedValueLine)) return false;
  return lines.some((line) => line.includes(","));
}

function diagnoseScalarFieldAsList(
  parentNode: YAMLMap,
  field: string,
  raw: unknown,
  suppressAjvPath: string,
  entryType: string,
): ShapeMismatchDiagnosis | null {
  const lines = stringListItems(raw);
  if (!lines) return null;

  const allTyped = lines.every(looksLikeTypedValueLine);
  const allBareword = lines.every((line) => !line.includes(","));

  let message: string;
  if (allTyped) {
    message = messageScalarFieldAsTypedLineList(field, lines);
  } else if (allBareword && MALFORMED_TYPED_LINE_FIELDS.has(field)) {
    message = messageScalarFieldAsEntryNameList(field, lines);
  } else if (isMalformedTypedLineList(field, lines)) {
    message = messageMalformedTypedLineList(field, lines);
  } else {
    message =
      `Invalid \`${field}:\` format — \`${field}:\` must be a single string, not a YAML list. ` +
      (field === "data"
        ? "Use one full `type, key, value` triple, one entry name, or move complete typed lines to `filters:`."
        : `Use one value on the same line, or the plural \`${field === "filter" ? "filters" : "bannedFilters"}:\` list field.`);
  }

  return {
    severity: "error",
    message,
    branch: VALUE_PROBLEM_CATEGORY,
    entryType,
    range: rangeForScalarListField(parentNode, field),
    suppressAjvPath,
  };
}

function diagnoseListFieldAsInlineTriple(
  parentNode: YAMLMap,
  field: string,
  raw: unknown,
  suppressAjvPath: string,
  entryType: string,
): ShapeMismatchDiagnosis | null {
  if (typeof raw !== "string" || !looksLikeTypedValueLine(raw)) return null;
  const singular = field === "filters" ? "filter" : "bannedFilter";
  return {
    severity: "error",
    message:
      `Invalid \`${field}:\` format — this looks like one filter line written as a scalar. ` +
      `Use \`${singular}: ${raw}\`, or a YAML list under \`${field}:\`:\n` +
      `  ${field}:\n  - ${raw}`,
    branch: VALUE_PROBLEM_CATEGORY,
    entryType,
    range: findPairRange(parentNode, field) ?? nodeRange(parentNode as any),
    suppressAjvPath,
  };
}

const RULES: ShapeMismatchRule[] = [
  {
    id: "ewp-top-level-scalar-data-filter-list",
    run({ itemNode, value, entryType }) {
      const out: ShapeMismatchDiagnosis[] = [];
      for (const field of TOP_LEVEL_SCALAR_REF_FIELDS) {
        const d = diagnoseScalarFieldAsList(itemNode, field, value[field], `/${field}`, entryType);
        if (d) out.push(d);
      }
      return out;
    },
  },
  {
    id: "ewp-top-level-list-field-inline-triple",
    run({ itemNode, value, entryType }) {
      const out: ShapeMismatchDiagnosis[] = [];
      for (const field of TOP_LEVEL_LIST_REF_FIELDS) {
        const d = diagnoseListFieldAsInlineTriple(itemNode, field, value[field], `/${field}`, entryType);
        if (d) out.push(d);
      }
      return out;
    },
  },
  {
    id: "ewp-nested-scalar-data-filter-list",
    run({ itemNode, value, entryType }) {
      const out: ShapeMismatchDiagnosis[] = [];
      for (const arrKey of ["objects", "bannedObjects", "poke"] as const) {
        const arrNode = getPairValueNode(itemNode, arrKey);
        if (!arrNode || !isSeq(arrNode as any)) continue;
        (arrNode as any).items.forEach((nested: unknown, index: number) => {
          if (!isMap(nested)) return;
          const nestedValue = (nested as YAMLMap).toJSON() as Record<string, unknown>;
          for (const field of [...NESTED_SCALAR_REF_FIELDS, NESTED_LEGACY_FILTER_DATA_FIELD]) {
            const path = `/${arrKey}/${index}/${field}`;
            const d = diagnoseScalarFieldAsList(
              nested as YAMLMap,
              field,
              nestedValue[field],
              path,
              entryType,
            );
            if (d) out.push(d);
          }
          for (const field of ["filters", "bannedFilters"] as const) {
            const d = diagnoseListFieldAsInlineTriple(
              nested as YAMLMap,
              field,
              nestedValue[field],
              `/${arrKey}/${index}/${field}`,
              entryType,
            );
            if (d) out.push(d);
          }
        });
      }
      return out;
    },
  },
  {
    id: "ewp-spawn-scalar-data-list",
    run({ itemNode, value, entryType }) {
      const out: ShapeMismatchDiagnosis[] = [];
      for (const arrKey of ["spawn", "swap"] as const) {
        const arrNode = getPairValueNode(itemNode, arrKey);
        if (!arrNode || !isSeq(arrNode as any)) continue;
        (arrNode as any).items.forEach((nested: unknown, index: number) => {
          if (!isMap(nested)) return;
          const nestedValue = (nested as YAMLMap).toJSON() as Record<string, unknown>;
          for (const field of SPAWN_SCALAR_REF_FIELDS) {
            const d = diagnoseScalarFieldAsList(
              nested as YAMLMap,
              field,
              nestedValue[field],
              `/${arrKey}/${index}/${field}`,
              entryType,
            );
            if (d) out.push(d);
          }
        });
      }
      return out;
    },
  },
];

/** Run all registered EWP rule-entry shape-mismatch rules. Dedupes by suppressAjvPath. */
export function diagnoseShapeMismatches(
  itemNode: YAMLMap,
  value: Record<string, unknown>,
  entryType: string,
): ShapeMismatchResult {
  const ctx: RuleContext = { itemNode, value, entryType };
  const byPath = new Map<string, ShapeMismatchDiagnosis>();

  for (const rule of RULES) {
    for (const d of rule.run(ctx)) {
      if (!byPath.has(d.suppressAjvPath)) byPath.set(d.suppressAjvPath, d);
    }
  }

  const diagnoses = [...byPath.values()];
  return {
    diagnoses,
    suppressAjvPaths: new Set(diagnoses.map((d) => d.suppressAjvPath)),
  };
}

/** WEC data entry with `data:` instead of `name:` — detector lives in guessBranch(). */
export function diagnoseWecNameTypo(itemNode: YAMLMap, entryType: string): ShapeMismatchDiagnosis {
  return {
    severity: "warning",
    message: WEC_NAME_TYPO_MESSAGE,
    branch: STRUCTURE_PROBLEM_CATEGORY,
    entryType,
    range: findPairRange(itemNode, "data") ?? nodeRange(itemNode as any),
    suppressAjvPath: "/name",
  };
}

/**
 * Per-entry arbitration entry point. `likelyDataNameTypo` comes from guessBranch()
 * only — this module owns the message and skip-ajv contract.
 */
export function diagnoseEntryShapeIssues(
  itemNode: YAMLMap,
  value: Record<string, unknown>,
  branch: string,
  entryType: string,
  likelyDataNameTypo: boolean,
): ShapeMismatchResult {
  if (likelyDataNameTypo) {
    const d = diagnoseWecNameTypo(itemNode, entryType);
    return {
      diagnoses: [d],
      suppressAjvPaths: new Set([d.suppressAjvPath]),
      skipEntryAjv: true,
    };
  }
  if (branch === "ewpRuleEntry") {
    return diagnoseShapeMismatches(itemNode, value, entryType);
  }
  return { diagnoses: [], suppressAjvPaths: new Set() };
}

/**
 * Detect orphan/mis-split RPC list items under objectRpc:/clientRpc:.
 * Runs before checkRpcParams — see diagnosis-arbitration ticket 03.
 */
export function diagnoseRpcOrphanListItems(
  itemNode: YAMLMap,
  entryType: string,
): RpcOrphanListItemResult {
  const diagnoses: ShapeMismatchDiagnosis[] = [];
  const suppressAjvPaths = new Set<string>();
  const skipRpcParamCheck = new Map<string, Set<number>>();

  for (const field of RPC_LIST_FIELDS) {
    const seqNode = getPairValueNode(itemNode, field);
    if (!seqNode || !isSeq(seqNode as any)) continue;
    const items = (seqNode as any).items as unknown[];
    const skipSet = new Set<number>();

    for (let entryIdx = 0; entryIdx < items.length; entryIdx++) {
      const entryNode = items[entryIdx];
      if (!isMap(entryNode)) continue;
      const entryMap = entryNode as YAMLMap;
      const entryValue = entryMap.toJSON() as Record<string, unknown>;

      if (typeof entryValue.name === "string" || !hasNumberedRpcParamKeys(entryValue)) continue;

      const firstKey = numberedParamKeys(entryValue).sort((a, b) => Number(a) - Number(b))[0]!;
      const range = findPairRange(entryMap, firstKey) ?? nodeRange(entryMap as any);

      let message: string;
      if (entryIdx > 0) {
        const prevNode = items[entryIdx - 1];
        const prevValue =
          prevNode && isMap(prevNode)
            ? ((prevNode as YAMLMap).toJSON() as Record<string, unknown>)
            : null;
        message =
          prevValue && isNameOnlyRpcEntry(prevValue)
            ? ORPHAN_SIBLING_PARAM_MESSAGE
            : MISSING_RPC_NAME_MESSAGE;
      } else {
        message = MISSING_RPC_NAME_MESSAGE;
      }

      diagnoses.push({
        severity: "warning",
        message,
        branch: VALUE_PROBLEM_CATEGORY,
        entryType,
        range,
        suppressAjvPath: `/${field}/${entryIdx}`,
      });
      for (const p of orphanEntrySuppressPaths(field, entryIdx, entryValue)) {
        suppressAjvPaths.add(p);
      }
      skipSet.add(entryIdx);
    }

    if (skipSet.size > 0) skipRpcParamCheck.set(field, skipSet);
  }

  return { diagnoses, suppressAjvPaths, skipRpcParamCheck };
}

/** Exported for tests and future catalog rows. */
export const SHAPE_MISMATCH_RULE_IDS = [
  ...RULES.map((r) => r.id),
  WEC_NAME_TYPO_RULE_ID,
  RPC_ORPHAN_SIBLING_PARAM_RULE_ID,
  RPC_MISSING_NAME_RULE_ID,
  MALFORMED_TYPED_LINE_LIST_RULE_ID,
];
