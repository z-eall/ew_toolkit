// The plain name of each diagnosis kind, as shown in the Problems-panel filter menu and on folded
// rows (hub ticket 29, approved 2026-09-20). Each name says what the scripter wrote wrong, in the
// words of the messages. A kind that can carry more than one severity has one name per severity.
// `Record<DiagnosisId, ...>` makes TypeScript reject a new id without a name; problemFilter.test.ts
// checks the severities.
import type { DiagnosisId, DiagnosisSeverity } from "./diagnosisKinds";

export type KindLabel = string | Partial<Record<DiagnosisSeverity, string>>;

export const KIND_LABELS: Record<DiagnosisId, KindLabel> = {
  "filename-invalid": "File name EWP will not load",
  "filename-legacy": "Legacy data file name",

  "yaml-syntax-error": "File cannot be read (YAML mistake)",
  "yaml-warning": "YAML warning",
  "yaml-no-active-content": "File is empty or all commented out",
  "yaml-top-level-not-list": "Script is not a list of entries",
  "yaml-entry-not-map": "Entry is not written as `key: value`",

  "check-crashed": "A check failed on this file",

  "format-bad-key": "Extra colon in a key name",
  "wec-data-key-name-typo": "`data:` written where `name:` belongs",
  "prefab-requiredness": "Entry with no prefab",

  "shape-scalar-field-as-list": "List written where one value goes",
  "shape-list-field-as-inline-triple": "Single line written where a list goes",
  "shape-filter-as-list": "`filter:` used for a list",
  "rpc-orphan-sibling-param": "RPC parameter on its own line",
  "rpc-missing-name": "RPC call has no name",
  "rpc-param-mismatch": "RPC parameter not in the docs",
  "rpc-unrecognized-key": "Misplaced key inside an RPC call",

  "practice-legacy-delay": "Legacy `delay:`",
  "practice-legacy-spawn": "Legacy `spawn:` or `swap:`",

  "ajv-scalar-field-type": "Value is the wrong type",
  "ajv-commented-out-list": "List with every item commented out",
  "ajv-type-value-enum": "Unknown `type:` word",
  "ajv-unknown-key": "Misspelled or unknown key",
  "ajv-required": "Required key missing",
  "ajv-value": "Value not allowed here",

  "silent-condition-operator": "Condition never passes (`==` or `<>`)",
  "silent-change-needs-trigger-rules": "Change trigger will not fire",
  "silent-poke-world-centre": "Poke with no place set",
  "silent-filter-weight-part": "Comma in a filter value",
  "silent-key-store-mix": "Key saved in one place, read in another",

  "data-reference": { error: "Data name not defined anywhere", info: "Data entry never used", warning: "Data name defined twice" },
  "custom-key": "Custom key never saved or never read",
  "template-function": "Unknown `<function>`",
  "poke-parameter": { info: "Poke with no listener", warning: "Poke name looks misspelled" },
  "malformed-reference": "Broken `<...>` reference",
  "legacy-object-data": "Legacy `data:` inside an object",
  "ignored-data-with-filter": "`data:` ignored because a filter is present",
  "filter-both-forms": "`filter:` and `filters:` both used",
};
