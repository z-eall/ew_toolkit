// Ajv error translation — turns ajv's own raw validation errors into
// scripter-readable text, for whichever instancePath shape arbitration
// (shapeMismatchDiagnosis.ts) did not already claim.
//
// Distinct job from shapeMismatchDiagnosis.ts: that module proactively
// detects known shape-confusion patterns *before* ajv runs; every function
// here only fires *after* ajv runs, translating whatever ajv itself reported.
// Kept as a separate catalog module rather than folded into
// shapeMismatchDiagnosis.ts so each module stays single-purpose — see
// diagnosis-arbitration ticket 08.
//
// CALL SITE: structuralPrecheck.ts's ajv-fallback loop, after shape-suppress
// and RPC-suppress paths are skipped. structuralPrecheck.ts keeps owning
// KNOWN_TYPES/isTypeValuePath (also used for branch-guessing, not just
// messaging) and range computation (ajvErrorRange, commentedOutListItemRange)
// — those aren't message text, they're orchestration/YAML-range concerns.

import type { ErrorObject } from "ajv";
import { isScalarDataValueField } from "./dataFieldValidation";

const ARRAY_INDEX_SEGMENT = /^\d+$/;

/** EWP-native field label from an ajv JSON Pointer — no leading `/`. */
export function fieldLabelFromInstancePath(instancePath: string): string {
  const segments = instancePath.split("/").filter(Boolean);
  if (segments.length === 0) return "This entry";

  if (ARRAY_INDEX_SEGMENT.test(segments[segments.length - 1]!)) {
    const parent = segments[segments.length - 2];
    return parent ? `\`${parent}:\` entry` : "This entry";
  }

  const field = segments[segments.length - 1]!;
  const fieldLabel = `\`${field}:\``;

  if (
    segments.length >= 3 &&
    ARRAY_INDEX_SEGMENT.test(segments[segments.length - 2]!) &&
    !ARRAY_INDEX_SEGMENT.test(segments[segments.length - 3]!)
  ) {
    const parent = segments[segments.length - 3]!;
    return `${fieldLabel} under \`${parent}:\``;
  }

  return fieldLabel;
}

/** Replace ajv's JSON-Pointer-prefixed fallthrough with field-native wording (ticket 14). */
export function formatAjvFallthroughMessage(error: ErrorObject): string {
  if (error.keyword === "required") {
    const missing = (error.params as { missingProperty?: string }).missingProperty;
    if (missing) return `\`${missing}:\` is required.`;
    return "A required field is missing.";
  }

  const label = fieldLabelFromInstancePath(error.instancePath);

  if (error.keyword === "type") {
    const expected = (error.params as { type?: string }).type;
    switch (expected) {
      case "string":
        return `${label} must be text (a string).`;
      case "number":
        return `${label} must be a number.`;
      case "array":
        return `${label} must be a YAML list.`;
      case "object":
        return `${label} must be \`key: value\` pairs, not a single value.`;
      case "boolean":
        return `${label} must be true or false.`;
      default:
        return `${label} has the wrong type.`;
    }
  }

  if (error.keyword === "oneOf" || error.keyword === "anyOf") {
    return `${label} has an invalid shape.`;
  }

  const raw = error.message ?? "is invalid";
  const simplified: Record<string, string> = {
    "must be string": "must be text (a string)",
    "must be array": "must be a YAML list",
    "must be object": "must be `key: value` pairs, not a single value",
    "must be number": "must be a number",
    "must be boolean": "must be true or false",
  };
  const tail = simplified[raw] ?? raw;
  return `${label} ${tail}${tail.endsWith(".") ? "" : "."}`;
}

/** A `field:` whose only list item is commented out, tripping ajv's "must be array". */
export function commentedOutListMessage(field: string): string {
  return `\`${field}:\` has no entries — all its items are commented out. Uncomment it, or remove the empty \`${field}:\`.`;
}

/**
 * A `type:`/`types:` value that fails the case-insensitive enum pattern —
 * ajv's raw message dumps the generated bracket-class regex verbatim.
 * `knownTypesList` is passed in rather than imported so this stays a pure
 * function of its inputs (structuralPrecheck.ts keeps owning the source set,
 * since it's also used there for unrelated branch-guessing).
 */
export function typeValueEnumMessage(instancePath: string, knownTypesList: string): string {
  return `${fieldLabelFromInstancePath(instancePath)} must be one of: ${knownTypesList} (any case), optionally followed by ", param1 param2".`;
}

/** additionalProperties error — names the bad key instead of ajv's generic message. */
export function unknownKeyMessage(key: string, entryTypeTitle: string): string {
  return `'${key}' is not a valid key in a ${entryTypeTitle}.`;
}

/**
 * Ajv fallback for a scalar data/filter field given a non-string, non-list
 * value (number, boolean, mapping) — the list-shaped case is already owned
 * by shapeMismatchDiagnosis.ts's diagnoseScalarFieldAsList and suppresses
 * ajv before this ever runs. Called from structuralPrecheck.ts only when no
 * shape-arbitration rule claimed the path.
 */
export function scalarDataFieldTypeMessage(field: string): string | null {
  if (!isScalarDataValueField(field)) return null;
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
  return `\`${field}:\` must be a single string value.`;
}
