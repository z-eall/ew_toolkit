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
// item (before ajv), merges `suppressAjvPaths` with rpcSuppressPaths. WEC
// `data:`/`name:` typo uses `skipEntryAjv` so ajv never runs. Ajv-fallback
// text (fired only when no rule here claimed the path) lives in
// ajvMessages.ts, a separate catalog module — see diagnosis-arbitration
// ticket 08.
//
// See `.scratch/diagnosis-arbitration/map.md` for the full arbitration stack
// and rules against duplication with RPC / legacy / format-lint layers.

import { isMap, isSeq, type YAMLMap } from "yaml";
import {
  isMalformedTypedLineList,
  looksLikeTypedValueLine,
  MALFORMED_TYPED_LINE_FIELDS,
  NESTED_LEGACY_FILTER_DATA_FIELD,
  NESTED_SCALAR_REF_FIELDS,
  SPAWN_SCALAR_REF_FIELDS,
  stringListItems,
  TOP_LEVEL_LIST_REF_FIELDS,
  TOP_LEVEL_SCALAR_REF_FIELDS,
} from "./dataFieldValidation";
import { STRUCTURE_PROBLEM_CATEGORY, VALUE_PROBLEM_CATEGORY } from "./diagnosisCategories";
import { findOrphanRpcListItems, numberedRpcParamKeys, type RpcActualType, type RpcKeyOwner, type RpcParamIssue } from "./rpcValidation";
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

function orphanEntrySuppressPaths(
  field: string,
  entryIdx: number,
  entry: Record<string, unknown>,
): string[] {
  const paths = [`/${field}/${entryIdx}`];
  for (const key of numberedRpcParamKeys(entry)) {
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
  } else if (field === "filter" || field === "bannedFilter") {
    const plural = field === "filter" ? "filters" : "bannedFilters";
    message =
      `Invalid \`${field}:\` format — \`${field}:\` must be a single string, not a YAML list. ` +
      `Use one value on the same line, or the plural \`${plural}:\` list field.`;
  } else if (field === "data") {
    message =
      "Invalid `data:` format — `data:` must be a single string, not a YAML list. " +
      "Use one full `type, key, value` triple, one entry name, or move complete typed lines to `filters:`.";
  } else {
    // drops/addItems/removeItems: no plural sibling list field to point at.
    message = `\`${field}:\` must be a single string value, not a YAML list.`;
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
    const entries = items.map((entryNode) =>
      isMap(entryNode) ? ((entryNode as YAMLMap).toJSON() as Record<string, unknown>) : {},
    );
    const orphans = findOrphanRpcListItems(entries);
    if (orphans.length === 0) continue;

    const skipSet = new Set<number>();
    for (const { index: entryIdx, previousIsNameOnly } of orphans) {
      const entryNode = items[entryIdx];
      if (!isMap(entryNode)) continue;
      const entryMap = entryNode as YAMLMap;
      const entryValue = entries[entryIdx]!;

      const firstKey = numberedRpcParamKeys(entryValue).sort((a, b) => Number(a) - Number(b))[0]!;
      const range = findPairRange(entryMap, firstKey) ?? nodeRange(entryMap as any);
      const message = previousIsNameOnly ? ORPHAN_SIBLING_PARAM_MESSAGE : MISSING_RPC_NAME_MESSAGE;

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

function describeActualType(kind: RpcActualType | undefined): string {
  switch (kind) {
    case "boolean":
      return "a boolean";
    case "number":
      return "a number";
    case "list":
      return "a list";
    case "mapping":
      return "a mapping";
    default:
      return "a different value";
  }
}

function unrecognizedRpcKeyMessage(key: string, belongsTo: RpcKeyOwner): string {
  if (belongsTo) {
    const where =
      belongsTo === "both"
        ? "the rule entry itself or a spawn:/swap: entry"
        : belongsTo === "rule-entry"
          ? "the rule entry itself"
          : "a spawn:/swap: entry";
    return (
      `RPC entries don't recognize '${key}:' — it does nothing here, even once its value is written ` +
      `correctly (it's a field on ${where}, not on an objectRpc:/clientRpc: entry). Move it there, or remove it.`
    );
  }
  return (
    `RPC entries don't recognize '${key}:' — it does nothing here, even once its value is written ` +
    `correctly. If this is meant as a numbered call parameter, use "1", "2", etc. instead.`
  );
}

/** Phrases one {@link checkRpcParams}/{@link checkRpcUnrecognizedKeys} detector result. */
export function rpcParamIssueMessage(rpcName: string, issue: RpcParamIssue): string {
  switch (issue.kind) {
    case "extra": {
      const count = issue.docParamCount ?? 0;
      const countDesc = count === 0 ? "no parameters" : `${count} parameter${count === 1 ? "" : "s"}`;
      return `RPC '${rpcName}' doesn't document a parameter '${issue.key}' (it defines ${countDesc}) — this still works, but worth double-checking it's intentional.`;
    }
    case "not-a-string":
      return (
        `RPC '${rpcName}' parameter '${issue.key}' should be written as "${issue.docParam!.type}, <value>" (a string), ` +
        `got ${describeActualType(issue.actualType)} instead. This may still work, but is worth writing out explicitly.`
      );
    case "type-mismatch":
      return issue.caseOnlyMismatch
        ? `RPC '${rpcName}' parameter '${issue.key}' uses type prefix '${issue.declaredType}', but EWP matches types case-sensitively — use '${issue.docParam!.type}' (${issue.docParam!.desc}).`
        : `RPC '${rpcName}' parameter '${issue.key}' is declared as '${issue.declaredType}', but the documented type is '${issue.docParam!.type}' (${issue.docParam!.desc}).`;
    case "missing":
      return (
        `RPC '${rpcName}' is missing documented parameter '${issue.key}' (${issue.docParam!.type}: ${issue.docParam!.desc}) — ` +
        `EWP will still send the RPC with fewer args, but this is worth checking.`
      );
    case "unrecognized-key":
      return unrecognizedRpcKeyMessage(issue.key, issue.belongsTo ?? null);
  }
}

/** Exported for tests and future catalog rows. */
export const SHAPE_MISMATCH_RULE_IDS = [
  ...RULES.map((r) => r.id),
  WEC_NAME_TYPO_RULE_ID,
  RPC_ORPHAN_SIBLING_PARAM_RULE_ID,
  RPC_MISSING_NAME_RULE_ID,
  MALFORMED_TYPED_LINE_LIST_RULE_ID,
];
