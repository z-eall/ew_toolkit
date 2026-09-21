// The one registry of every diagnosis this validator can emit. Each kind has a stable id, its
// filter category, its default severity, and (rarely) other severities it may also use.
// Emitters spell a diagnosis as `...kindFields("some-id")`, so the category and severity are
// never typed by hand at the emit site. `Problem.id` is required in the type: TypeScript rejects
// an emitter that has no id. Ids are stable names (other tickets and tests point at them), so
// rename with care. Import-free apart from types, so no checker can create a cycle with it.
import {
  INVALID_FILE_CATEGORY,
  PRACTICE_CATEGORY,
  REFERENCE_PROBLEM_CATEGORY,
  STRUCTURE_PROBLEM_CATEGORY,
  VALUE_PROBLEM_CATEGORY,
  YAML_PROBLEM_CATEGORY,
} from "./diagnosisCategories";

export type DiagnosisSeverity = "error" | "warning" | "info";

export interface DiagnosisKind {
  category: string;
  /** Severity used unless the emitter passes another one from `alsoSeverity`. */
  severity: DiagnosisSeverity;
  alsoSeverity?: readonly DiagnosisSeverity[];
  /** One line: what this kind means (for maintainers; not shown to users). */
  what: string;
}

const kinds = {
  // --- File name ---
  "filename-invalid": { category: INVALID_FILE_CATEGORY, severity: "error", what: "file name is not an EWP structural name" },
  "filename-legacy": { category: PRACTICE_CATEGORY, severity: "info", what: "old file name form EWP still loads" },

  // --- YAML ---
  "yaml-syntax-error": { category: YAML_PROBLEM_CATEGORY, severity: "error", what: "YAML parse error" },
  "yaml-warning": { category: YAML_PROBLEM_CATEGORY, severity: "warning", what: "YAML parse warning" },
  "yaml-no-active-content": { category: YAML_PROBLEM_CATEGORY, severity: "warning", what: "everything is commented out" },
  "yaml-top-level-not-list": { category: YAML_PROBLEM_CATEGORY, severity: "error", what: "top level is not a list" },
  "yaml-entry-not-map": { category: YAML_PROBLEM_CATEGORY, severity: "error", what: "list item is not key: value pairs" },

  // --- The checker itself ---
  "check-crashed": { category: STRUCTURE_PROBLEM_CATEGORY, severity: "warning", what: "a check threw on this file; it was skipped, other files still run" },

  // --- Format lint / structure ---
  "format-bad-key": { category: STRUCTURE_PROBLEM_CATEGORY, severity: "error", what: "key has a typo such as a double colon" },
  "wec-data-key-name-typo": { category: STRUCTURE_PROBLEM_CATEGORY, severity: "warning", what: "WEC data entry uses data: instead of name:" },
  "prefab-requiredness": { category: STRUCTURE_PROBLEM_CATEGORY, severity: "warning", what: "rule has no prefab, so EWP loads it but it never matches anything" },

  // --- Shape mismatch (pre-ajv arbitration) ---
  "shape-scalar-field-as-list": { category: VALUE_PROBLEM_CATEGORY, severity: "error", what: "single-value field written as a YAML list" },
  "shape-list-field-as-inline-triple": { category: VALUE_PROBLEM_CATEGORY, severity: "error", what: "list field written as one inline filter line" },
  "shape-filter-as-list": { category: PRACTICE_CATEGORY, severity: "info", what: "filter written as a list (any level); EWP accepts it" },
  "rpc-orphan-sibling-param": { category: VALUE_PROBLEM_CATEGORY, severity: "warning", what: "RPC parameter split from its name entry" },
  "rpc-missing-name": { category: VALUE_PROBLEM_CATEGORY, severity: "warning", what: "RPC entry has parameters but no name" },
  "rpc-param-mismatch": { category: VALUE_PROBLEM_CATEGORY, severity: "warning", what: "RPC parameter differs from the documented table" },
  "rpc-unrecognized-key": { category: STRUCTURE_PROBLEM_CATEGORY, severity: "warning", what: "non-numeric key inside an RPC entry" },

  // --- Practice recommendations (structural) ---
  "practice-legacy-delay": { category: PRACTICE_CATEGORY, severity: "info", what: "old delay: field" },
  "practice-legacy-spawn": { category: PRACTICE_CATEGORY, severity: "info", what: "old spawn:/swap: string form" },

  // --- ajv fallback (after every earlier layer stayed silent) ---
  "ajv-scalar-field-type": { category: VALUE_PROBLEM_CATEGORY, severity: "error", what: "scalar field holds a non-string" },
  "ajv-commented-out-list": { category: STRUCTURE_PROBLEM_CATEGORY, severity: "warning", what: "list field whose only item is commented out" },
  "ajv-type-value-enum": { category: VALUE_PROBLEM_CATEGORY, severity: "error", what: "type:/types: value is not a known word" },
  "ajv-unknown-key": { category: STRUCTURE_PROBLEM_CATEGORY, severity: "error", what: "unknown or misspelled key" },
  "ajv-required": { category: STRUCTURE_PROBLEM_CATEGORY, severity: "error", what: "required field is missing" },
  "ajv-value": { category: VALUE_PROBLEM_CATEGORY, severity: "error", what: "known field holds a wrong value" },

  // --- Silent mistakes (EWP loads the script; part of it does nothing) ---
  "silent-condition-operator": { category: PRACTICE_CATEGORY, severity: "warning", what: "== or <> in a condition: it never parses, so the condition never passes" },
  "silent-change-needs-trigger-rules": { category: PRACTICE_CATEGORY, severity: "warning", what: "a rule writes data: on its own object without triggerRules: true, so a type: change rule for that key does not fire" },
  "silent-poke-world-centre": { category: PRACTICE_CATEGORY, severity: "warning", what: "a poke under a prefab-less globalkey/key/time/realtime rule measures from the world centre, 100 m by default" },
  "silent-filter-weight-part": { category: PRACTICE_CATEGORY, severity: "warning", what: "a 4th comma part in a filter is a weight, not a second accepted value" },
  "silent-key-store-mix": { category: PRACTICE_CATEGORY, severity: "warning", what: "EWP keys and Valheim global keys are separate stores; the watcher reads the other one" },
  "silent-terrain-paint-name": { category: PRACTICE_CATEGORY, severity: "warning", what: "a terrain paint: that is not a paint name or a number; EWP paints Reset instead" },
  "silent-owner-dropped": { category: PRACTICE_CATEGORY, severity: "warning", what: "owner: with addItems/removeItems and no injectData: true; the object is recreated and the owner is lost" },
  "silent-iter-operation": { category: PRACTICE_CATEGORY, severity: "warning", what: "<iter_OP_...> with an OP that is not a function EWP has; the expression never resolves" },

  // --- Cross-file references ---
  "data-reference": { category: REFERENCE_PROBLEM_CATEGORY, severity: "error", alsoSeverity: ["info", "warning"], what: "data entry undefined (error), unused (info) or defined twice (warning)" },
  "custom-key": { category: REFERENCE_PROBLEM_CATEGORY, severity: "info", what: "custom data key note" },
  "template-function": { category: REFERENCE_PROBLEM_CATEGORY, severity: "warning", what: "unknown <function> in a template string" },
  "poke-parameter": { category: REFERENCE_PROBLEM_CATEGORY, severity: "info", alsoSeverity: ["warning"], what: "poke parameter has no listener (info) or is a near miss (warning)" },
  "malformed-reference": { category: REFERENCE_PROBLEM_CATEGORY, severity: "warning", what: "doubled underscore or unclosed < in a reference" },
  "legacy-object-data": { category: PRACTICE_CATEGORY, severity: "info", what: "old data alias on an object" },
  "ignored-data-with-filter": { category: PRACTICE_CATEGORY, severity: "warning", what: "data: is ignored because a filter is present" },
  "filter-both-forms": { category: PRACTICE_CATEGORY, severity: "warning", what: "filter: and filters: both written" },
} as const satisfies Record<string, DiagnosisKind>;

export type DiagnosisId = keyof typeof kinds;

export const DIAGNOSIS_KINDS: Readonly<Record<DiagnosisId, DiagnosisKind>> = kinds;
export const DIAGNOSIS_IDS = Object.keys(kinds) as DiagnosisId[];

/** The `{ id, severity, branch }` part of a problem. Pass a severity only for an id with `alsoSeverity`. */
export function kindFields(id: DiagnosisId, severity?: DiagnosisSeverity): { id: DiagnosisId; severity: DiagnosisSeverity; branch: string } {
  const k: DiagnosisKind = kinds[id];
  return { id, severity: severity ?? k.severity, branch: k.category };
}
