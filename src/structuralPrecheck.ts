// Ticket 10's structural pre-check: guess which of the four discriminator-less
// array shapes (EWP rule entry / WEC data entry / value entry / value group) an
// item is clearly attempting by which distinguishing keys are present, then
// validate against only that one schema. This is what actually produces
// user-facing errors — the schema's top-level `oneOf` stays only as the
// acceptance mechanism (see schema/generate.mjs), because naive `oneOf` error
// output was confirmed unusable (13-15 raw errors per typo) in the
// prototype/oneof-union-error-quality branch.
import Ajv, { type ErrorObject } from "ajv";
import { isMap, isSeq, parseDocument, type Pair, type YAMLMap } from "yaml";
import schemaJson from "./schema.generated.json";

export type Severity = "error" | "warning" | "info";

export interface Problem {
  severity: Severity;
  message: string;
  branch: string;
  /** Character offsets into the source text, for mapping to editor positions. */
  range: [start: number, end: number];
}

export type BranchName = "ewpRuleEntry" | "wecDataEntry" | "valueEntry" | "valueGroup";

const TYPED_LIST_KEYS = [
  "ints",
  "floats",
  "strings",
  "bools",
  "longs",
  "vecs",
  "quats",
  "bytes",
  "hashes",
  "items",
];

const BRANCH_TITLES: Record<BranchName, string> = {
  ewpRuleEntry: "EWP rule entry",
  wecDataEntry: "WEC data entry",
  valueEntry: "Value entry",
  valueGroup: "Value group",
};

const ajv = new Ajv({ allErrors: true, strict: false });
const validators: Partial<Record<BranchName, ReturnType<Ajv["compile"]>>> = {};
function getValidator(branch: BranchName) {
  let v = validators[branch];
  if (!v) {
    v = ajv.compile((schemaJson as any).definitions[branch]);
    validators[branch] = v;
  }
  return v;
}

export interface Guess {
  branch: BranchName;
  /** true when the item has `data:` where `name:` was clearly meant (ticket 07). */
  likelyDataNameTypo: boolean;
}

export function guessBranch(item: unknown): Guess {
  if (item && typeof item === "object" && !Array.isArray(item)) {
    const obj = item as Record<string, unknown>;
    if ("valueGroup" in obj) return { branch: "valueGroup", likelyDataNameTypo: false };
    if ("value" in obj) return { branch: "valueEntry", likelyDataNameTypo: false };

    const hasTypedList = TYPED_LIST_KEYS.some((k) => k in obj);
    const looksLikeWecShape = hasTypedList && !("prefab" in obj) && !("type" in obj);

    if ("name" in obj && looksLikeWecShape) {
      return { branch: "wecDataEntry", likelyDataNameTypo: false };
    }
    // WEC's own README_data.md writes the entry-name key as `data:` in one
    // section (a confirmed copy-paste typo, not a real alias — ticket 07).
    // Still guess WEC data entry here so the diagnostic names the real
    // problem instead of falling through to an unrelated EWP-rule mismatch.
    if ("data" in obj && !("name" in obj) && looksLikeWecShape) {
      return { branch: "wecDataEntry", likelyDataNameTypo: true };
    }
  }
  return { branch: "ewpRuleEntry", likelyDataNameTypo: false }; // default guess
}

// EWP only warns (never errors) when `prefab` is empty and `type` isn't one of
// the prefab-less types — mirrored here as a warning, not a hard error
// (ticket 09). Scoped to just this one conditional-requiredness case, not a
// full per-type field-relevance matrix.
const TYPES_WITHOUT_PREFAB = new Set(["globalkey", "key", "custom", "event", "time", "realtime"]);

function checkPrefabRequiredness(item: Record<string, unknown>): string | null {
  const typeValue = typeof item.type === "string" ? item.type.split(",")[0].trim() : "";
  if (TYPES_WITHOUT_PREFAB.has(typeValue)) return null;
  if (typeof item.prefab === "string" && item.prefab.trim() !== "") return null;
  if ("prefab" in item && typeof item.prefab !== "string") return null; // malformed prefab is ajv's job to report
  return `type '${typeValue || "(none)"}' expects a non-empty 'prefab' (only globalkey/key/custom/event/time/realtime can omit it).`;
}

export function nodeRange(node: { range?: readonly [number, number, number] | null }): [number, number] {
  if (!node.range) return [0, 0];
  return [node.range[0], node.range[2] ?? node.range[1]];
}

export function findPairRange(map: YAMLMap, keyName: string): [number, number] | null {
  const pair = map.items.find((p: Pair) => isScalarKey(p.key, keyName));
  if (!pair) return null;
  const keyRange = (pair.key as any)?.range;
  const valueRange = (pair.value as any)?.range;
  const start = keyRange ? keyRange[0] : null;
  const end = valueRange ? valueRange[2] ?? valueRange[1] : keyRange ? keyRange[2] : null;
  if (start == null || end == null) return null;
  return [start, end];
}

/** The raw value node for `keyName` on `map`, e.g. to walk into a nested seq/map. */
export function getPairValueNode(map: YAMLMap, keyName: string): unknown {
  const pair = map.items.find((p: Pair) => isScalarKey(p.key, keyName));
  return pair ? pair.value : null;
}

function isScalarKey(key: unknown, name: string): boolean {
  return !!key && typeof key === "object" && (key as { value?: unknown }).value === name;
}

/** Range for an ajv error: prefer pointing at the specific offending key, fall back to the whole item. */
function ajvErrorRange(itemNode: YAMLMap, itemRange: [number, number], error: ErrorObject): [number, number] {
  if (error.keyword === "additionalProperties") {
    const badKey = (error.params as { additionalProperty?: string }).additionalProperty;
    if (badKey) {
      const r = findPairRange(itemNode, badKey);
      if (r) return r;
    }
  } else if (error.instancePath) {
    const firstSegment = error.instancePath.split("/").filter(Boolean)[0];
    if (firstSegment) {
      const r = findPairRange(itemNode, firstSegment);
      if (r) return r;
    }
  }
  return itemRange;
}

export function runStructuralPrecheck(text: string): Problem[] {
  const problems: Problem[] = [];
  const doc = parseDocument(text, { keepSourceTokens: false });

  for (const err of doc.errors) {
    const [start, end] = err.pos ?? [0, 0];
    problems.push({ severity: "error", message: `YAML syntax error: ${err.message}`, branch: "(parse)", range: [start, end] });
  }
  for (const warn of doc.warnings) {
    const [start, end] = warn.pos ?? [0, 0];
    problems.push({ severity: "warning", message: warn.message, branch: "(parse)", range: [start, end] });
  }
  if (doc.errors.length > 0) return problems; // downstream checks need a parseable document

  const root = doc.contents;
  if (!root || !isSeq(root)) {
    problems.push({
      severity: "error",
      message: "Script files must be a YAML array (a list of `- ...` entries) at the top level.",
      branch: "(root)",
      range: root && (root as any).range ? nodeRange(root as any) : [0, text.length],
    });
    return problems;
  }

  for (const itemNode of root.items) {
    if (!isMap(itemNode)) {
      problems.push({
        severity: "error",
        message: "Each array entry must be a mapping (key: value pairs), not a bare scalar or list.",
        branch: "(item)",
        range: nodeRange(itemNode as any),
      });
      continue;
    }

    const itemRange = nodeRange(itemNode);
    const value = itemNode.toJSON() as Record<string, unknown>;
    const { branch, likelyDataNameTypo } = guessBranch(value);

    if (likelyDataNameTypo) {
      const r = findPairRange(itemNode, "data") ?? itemRange;
      problems.push({
        severity: "warning",
        message: "WEC data entries use `name:` for the entry's name — `data:` here is a documented typo in WEC's own README, not a real alias, and this entry won't register.",
        branch: BRANCH_TITLES.wecDataEntry,
        range: r,
      });
      continue; // skip ajv validation against wecDataEntry: it would just repeat "required: name"
    }

    const validate = getValidator(branch);
    const valid = validate(value);
    if (!valid && validate.errors) {
      for (const error of validate.errors) {
        // additionalProperties errors carry the bad key in params — use that
        // to build a message naming the key, instead of ajv's generic one.
        const message = error.params && "additionalProperty" in error.params
          ? `Unknown key '${(error.params as { additionalProperty: string }).additionalProperty}' for a ${BRANCH_TITLES[branch]} — ${error.message}.`
          : `${error.instancePath || "(entry)"} ${error.message}`;
        problems.push({
          severity: "error",
          message,
          branch: BRANCH_TITLES[branch],
          range: ajvErrorRange(itemNode, itemRange, error),
        });
      }
    }

    if (branch === "ewpRuleEntry") {
      const hint = checkPrefabRequiredness(value);
      if (hint) {
        const r = findPairRange(itemNode, "prefab") ?? itemRange;
        problems.push({ severity: "warning", message: hint, branch: BRANCH_TITLES.ewpRuleEntry, range: r });
      }
    }
  }

  return problems;
}
