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

/** error > warning > info — the fixed severity order the Problems panel and editor markers sort by. */
export const SEVERITY_RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

/**
 * The highest-priority item in `items` (lowest {@link SEVERITY_RANK}), with an
 * optional tie-break comparator for items of equal severity (negative return
 * means `a` wins). Returns null for an empty list.
 */
export function pickHighestPriority<T extends { severity: Severity }>(
  items: readonly T[],
  tieBreak?: (a: T, b: T) => number,
): T | null {
  let top: T | null = null;
  for (const item of items) {
    if (!top) {
      top = item;
      continue;
    }
    const rankDiff = SEVERITY_RANK[item.severity] - SEVERITY_RANK[top.severity];
    if (rankDiff < 0 || (rankDiff === 0 && tieBreak && tieBreak(item, top) < 0)) top = item;
  }
  return top;
}

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

    // A data entry names itself with `name:` and never carries an EWP rule's
    // trigger keys (prefab/type). This covers both typed-list data entries and
    // raw-data entries (name + bare ZDO fields like position/rotation — ticket 13),
    // which have no typed-list key to recognize them by.
    if ("name" in obj && !("prefab" in obj) && !("type" in obj)) {
      return { branch: "wecDataEntry", likelyDataNameTypo: false };
    }

    const hasTypedList = TYPED_LIST_KEYS.some((k) => k in obj);
    const looksLikeWecShape = hasTypedList && !("prefab" in obj) && !("type" in obj);
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

// Undocumented/legacy constructs on an EWP rule entry that are live-tested to
// work but aren't in the schema (ticket 13). Surfaced as blue "flag" (info)
// notices and stripped before ajv so they don't also raise a hard error. They
// carry their own "Legacy format entry" category (not the EWP-rule-entry one)
// so the Problems panel can filter them apart — the wording follows Jere's
// docs, which call these "Legacy format" rather than "Old format".
export const LEGACY_FORMAT_CATEGORY = "Legacy format entry";
const LEGACY_DELAY_MESSAGE =
  "Legacy format: a top-level `delay:`. It still works, but we recommend using the latest format.";
const legacySpawnMessage = (key: string) =>
  `Legacy format: a single-line \`${key}:\`. It still works, but we recommend using the latest format.`;

function checkPrefabRequiredness(item: Record<string, unknown>): string | null {
  const typeValue = typeof item.type === "string" ? item.type.split(",")[0].trim() : "";
  if (TYPES_WITHOUT_PREFAB.has(typeValue)) return null;
  if (typeof item.prefab === "string" && item.prefab.trim() !== "") return null;
  if ("prefab" in item && typeof item.prefab !== "string") return null; // malformed prefab is ajv's job to report
  return `type '${typeValue || "(none)"}' needs a 'prefab'. Only globalkey/key/custom/event/time/realtime can omit it.`;
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
      message: "The top level must be a YAML list. Start each entry with `- `.",
      branch: "(root)",
      range: root && (root as any).range ? nodeRange(root as any) : [0, text.length],
    });
    return problems;
  }

  for (const itemNode of root.items) {
    if (!isMap(itemNode)) {
      problems.push({
        severity: "error",
        message: "Each entry must be `key: value` pairs, not a single value or a list.",
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
        message: "Use `name:`, not `data:`, to name a data entry. This entry will not register (a known WEC README typo).",
        branch: BRANCH_TITLES.wecDataEntry,
        range: r,
      });
      continue; // skip ajv validation against wecDataEntry: it would just repeat "required: name"
    }

    // Peel off legacy-but-working constructs before ajv: flag each in blue and
    // validate the remainder, so a legacy `delay:`/`spawn:` doesn't also error.
    let toValidate: Record<string, unknown> = value;
    if (branch === "ewpRuleEntry") {
      const strip: string[] = [];
      if ("delay" in value) {
        strip.push("delay");
        problems.push({
          severity: "info",
          message: LEGACY_DELAY_MESSAGE,
          branch: LEGACY_FORMAT_CATEGORY,
          range: findPairRange(itemNode, "delay") ?? itemRange,
        });
      }
      for (const key of ["spawn", "swap"] as const) {
        if (typeof value[key] === "string") {
          strip.push(key);
          problems.push({
            severity: "info",
            message: legacySpawnMessage(key),
            branch: LEGACY_FORMAT_CATEGORY,
            range: findPairRange(itemNode, key) ?? itemRange,
          });
        }
      }
      if (strip.length > 0) {
        toValidate = { ...value };
        for (const k of strip) delete toValidate[k];
      }
    }

    const validate = getValidator(branch);
    const valid = validate(toValidate);
    if (!valid && validate.errors) {
      for (const error of validate.errors) {
        // additionalProperties errors carry the bad key in params — use that
        // to build a message naming the key, instead of ajv's generic one.
        const message = error.params && "additionalProperty" in error.params
          ? `'${(error.params as { additionalProperty: string }).additionalProperty}' is not a valid key in a ${BRANCH_TITLES[branch]}.`
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
