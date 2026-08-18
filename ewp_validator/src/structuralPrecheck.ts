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
import { runFormatLint } from "./formatLint";
import { checkRpcParams, CLIENT_RPC_PARAMS, OBJECT_RPC_PARAMS } from "./rpcValidation";
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

export const BRANCH_TITLES: Record<BranchName, string> = {
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

// The six trigger types that carry no prefab/position, so the prefab requirement
// doesn't apply to them (docs/scripting.md: "There is no prefab or position for
// this type, so most fields won't work"). Every other type needs a prefab.
// Ticket 09 originally surfaced a missing prefab as a *warning* (EWP itself only
// warns); ticket 13 round 7 promotes it to a hard error at the scripter's
// request — a rule with a prefab-requiring type but no prefab never matches, so
// it's treated as a real mistake rather than an advisory. This is the one
// conditional-requiredness case, not a full per-type field-relevance matrix.
const TYPES_WITHOUT_PREFAB = new Set(["globalkey", "key", "custom", "event", "time", "realtime"]);

// Undocumented/legacy constructs on an EWP rule entry that are live-tested to
// work but aren't in the schema (ticket 13). Surfaced as blue "flag" (info)
// notices and stripped before ajv so they don't also raise a hard error. They
// carry their own "Legacy format entry" category (not the EWP-rule-entry one)
// so the Problems panel can filter them apart — the wording follows Jere's
// docs, which call these "Legacy format" rather than "Old format".
export const LEGACY_FORMAT_CATEGORY = "Legacy format entry";
// objectRpc:/clientRpc: parameter mismatches against Jere's RPCs.md docs
// (see rpcValidation.ts) — always a warning, never a hard error, since an
// undocumented or mistyped numbered parameter still works in-game.
export const RPC_RULE_CATEGORY = "RPC rule entry";
const RPC_FIELDS = [
  ["objectRpc", OBJECT_RPC_PARAMS],
  ["clientRpc", CLIENT_RPC_PARAMS],
] as const;
const LEGACY_DELAY_MESSAGE =
  "Legacy format: a top-level `delay:`. It still works, but we recommend using the latest format.";
const legacySpawnMessage = (key: string) =>
  `Legacy format: a single-line \`${key}:\`. It still works, but we recommend using the latest format.`;

// Collect the trigger-type words this entry declares — a `type:` string and/or
// each item of a `types:` list — taking each type's leading word (before any
// `, param` shorthand). One merged rule covers both forms (ticket 13 round 7):
// `types:` used to be invisible here, so a `- types: [key, ...]` entry with no
// prefab was wrongly told it needed one.
function collectTypeWords(item: Record<string, unknown>): string[] {
  const words: string[] = [];
  if (typeof item.type === "string") words.push(item.type.split(",")[0].trim());
  if (Array.isArray(item.types)) {
    for (const t of item.types) if (typeof t === "string") words.push(t.split(",")[0].trim());
  }
  return words;
}

interface PrefabHint {
  message: string;
  /** Field to anchor the diagnostic on when no prefab exists to point at. */
  field: "types" | "type" | null;
}

function checkPrefabRequiredness(item: Record<string, unknown>): PrefabHint | null {
  if (typeof item.prefab === "string" && item.prefab.trim() !== "") return null; // a prefab satisfies every type
  if ("prefab" in item && typeof item.prefab !== "string") return null; // malformed prefab is ajv's job to report

  const typeWords = collectTypeWords(item);
  const field: PrefabHint["field"] = Array.isArray(item.types)
    ? "types"
    : typeof item.type === "string"
      ? "type"
      : null;
  const tail = "Only globalkey/key/custom/event/time/realtime can omit it.";

  if (typeWords.length === 0) {
    return { message: `type '(none)' needs a 'prefab'. ${tail}`, field };
  }
  const requiring = [...new Set(typeWords.filter((t) => t !== "" && !TYPES_WITHOUT_PREFAB.has(t)))];
  if (requiring.length === 0) return null; // every declared type is prefab-less — fine

  const label =
    requiring.length === 1
      ? `type '${requiring[0]}' needs`
      : `types ${requiring.map((t) => `'${t}'`).join(", ")} need`;
  return { message: `${label} a 'prefab'. ${tail}`, field };
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

// Loosely-stringified comparison (not strict ===): a YAML key written bare,
// like `1:`, parses to the number 1, not the string "1" — matching it against
// a lookup name of "1" needs this to find e.g. an rpc entry's numbered
// parameter keys, not just its word keys (which were already strings).
function isScalarKey(key: unknown, name: string): boolean {
  if (!key || typeof key !== "object") return false;
  const v = (key as { value?: unknown }).value;
  return v !== undefined && String(v) === name;
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

// A field whose only content is commented out (`floats:` followed by
// `#  - fireMineStamp, ...`) parses to null, so ajv reports the unhelpful
// "must be array" at the key. Scan the source from just past the key: if the
// next non-blank line is a whole-line comment shaped like a list item
// (`#  - ...`), the field's data was disabled on purpose — return that line's
// range so the diagnosis can point at it instead. Whole-line comments only,
// matching how the rest of the toolkit treats commented-out content.
function commentedOutListItemRange(text: string, keyStart: number): [number, number] | null {
  let i = keyStart;
  while (i < text.length && text[i] !== "\n") i++; // to end of the key's line
  while (i < text.length) {
    const lineStart = i + 1;
    let lineEnd = lineStart;
    while (lineEnd < text.length && text[lineEnd] !== "\n") lineEnd++;
    const line = text.slice(lineStart, lineEnd);
    if (line.trim() === "") {
      i = lineEnd;
      continue; // skip blank lines between the key and its commented content
    }
    return /^\s*#\s*-\s*\S/.test(line) ? [lineStart, lineEnd] : null;
  }
  return null;
}

// True when the file has *some* non-blank content but every bit of it is a
// comment line — not a truly empty/blank file (that stays the existing hard
// error; a brand-new file with nothing typed yet isn't "disabled on purpose").
function isCommentOnly(text: string): boolean {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l !== "");
  return lines.length > 0 && lines.every((l) => l.startsWith("#"));
}

export function runStructuralPrecheck(text: string): Problem[] {
  const problems: Problem[] = [];

  // Punctuation/format lint runs first and independently of schema validation:
  // it catches typos that are legal YAML but clearly wrong (e.g. a `::` double
  // colon), pointing at the exact key. Its findings also let us suppress the
  // misleading ajv message the same typo would otherwise produce (below).
  problems.push(...runFormatLint(text));

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
    // A file whose every non-blank line is commented out parses to no
    // content at all, which would otherwise hit the same "must be a YAML
    // list" wording a genuine syntax mistake gets — misleading for content
    // that's disabled on purpose. Downgrade to a warning instead.
    if (isCommentOnly(text)) {
      problems.push({
        severity: "warning",
        message: "This file has no active content — every line is commented out. Uncomment what you want validated, or remove the file if it's no longer needed.",
        branch: "(root)",
        range: [0, text.length],
      });
      return problems;
    }
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

    // objectRpc:/clientRpc: numbered parameters get their own doc-aware check
    // (rpcValidation.ts) instead of ajv's generic "must be string" — a
    // mismatch there is a warning, not an error, so a `not-a-string` issue's
    // ajv error (same instancePath) is suppressed below rather than doubled up.
    const rpcSuppressPaths = new Set<string>();
    if (branch === "ewpRuleEntry") {
      for (const [field, table] of RPC_FIELDS) {
        const seqNode = getPairValueNode(itemNode, field);
        if (!isSeq(seqNode)) continue;
        seqNode.items.forEach((entryNode: unknown, entryIdx: number) => {
          if (!isMap(entryNode)) return;
          const entryValue = (entryNode as YAMLMap).toJSON() as Record<string, unknown>;
          if (typeof entryValue.name !== "string") return;
          for (const issue of checkRpcParams(table, entryValue.name, entryValue)) {
            problems.push({
              severity: "warning",
              message: issue.message,
              branch: RPC_RULE_CATEGORY,
              range: findPairRange(entryNode as YAMLMap, issue.key) ?? itemRange,
            });
            // Any issue at all (including "extra" — out of documented range)
            // already covers whatever ajv would say about this same key, so
            // suppress it regardless of kind rather than only for "not-a-string".
            rpcSuppressPaths.add(`/${field}/${entryIdx}/${issue.key}`);
          }
        });
      }
    }

    const validate = getValidator(branch);
    const valid = validate(toValidate);
    if (!valid && validate.errors) {
      for (const error of validate.errors) {
        // Already covered by a clearer RPC-specific warning above.
        if (rpcSuppressPaths.has(error.instancePath)) continue;
        // A `::` double colon makes YAML fold the extra colon into the key
        // (`filter::` → key `filter:`), which ajv then reports as an unknown
        // property with a misleading message and a wrong (fallback) range. The
        // format lint already flags that typo precisely, so drop ajv's version
        // here — a real EWP/WEC key never contains a colon.
        const badKey = (error.params as { additionalProperty?: string })?.additionalProperty;
        if (badKey?.includes(":")) continue;
        // A `field:` whose value is null because its only list item is commented
        // out (`#  - ...`) trips ajv's "must be array". Replace that with an
        // actionable note pointed at the disabled line, and drop the raw error.
        if (error.keyword === "type" && (error.params as { type?: string })?.type === "array") {
          const field = error.instancePath.split("/").filter(Boolean);
          const keyRange = field.length === 1 ? findPairRange(itemNode, field[0]) : null;
          // Scan from the key's start (on the `field:` line); its end offset can
          // run past the comment when the value is an implicit null.
          const commentRange = keyRange ? commentedOutListItemRange(text, keyRange[0]) : null;
          if (commentRange) {
            problems.push({
              severity: "warning",
              message: `\`${field[0]}:\` has no entries — its only item is commented out. Uncomment it, or remove the empty \`${field[0]}:\`.`,
              branch: BRANCH_TITLES[branch],
              range: commentRange,
            });
            continue;
          }
        }
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
        const r =
          (hint.field ? findPairRange(itemNode, hint.field) : null) ?? findPairRange(itemNode, "prefab") ?? itemRange;
        problems.push({ severity: "error", message: hint.message, branch: BRANCH_TITLES.ewpRuleEntry, range: r });
      }
    }
  }

  return problems;
}
