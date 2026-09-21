// One small bad input per diagnosis id (test data). Used by diagnosisAlive.test.ts (each id must
// fire) and messageLength.test.ts (soft length report). Kept out of the app bundle: only tests import it.
import type { DiagnosisId } from "./diagnosisKinds";

const P = "expand_prefabs_a.yaml";
const D = "expand_data_a.yaml";
export type SampleCase = { files: Array<{ name: string; text: string; exempt?: boolean }> };
const one = (name: string, text: string): SampleCase => ({ files: [{ name, text }] });
const rule = (body: string) => one(P, `- prefab: Boar\n  type: create\n${body}`);

export const DIAGNOSIS_SAMPLES: Partial<Record<DiagnosisId, SampleCase>> = {
  "filename-invalid": one("simple.yaml", "- a: 1\n"),
  "filename-legacy": one("expand_data.yaml", "- name: a\n  ints:\n  - health, 5\n"),
  "yaml-syntax-error": one(P, "- prefab: [Boar\n"),
  "yaml-warning": one(P, "- prefab: !!foo Boar\n  type: create\n"),
  "yaml-no-active-content": one(P, "# - prefab: Boar\n"),
  "yaml-top-level-not-list": one(P, "prefab: Boar\n"),
  "yaml-entry-not-map": one(P, "- Boar\n"),
  "format-bad-key": rule("  filter:: a, b\n"),
  "wec-data-key-name-typo": one(D, "- data: strongBoar\n  ints:\n  - health, 5\n"),
  "prefab-requiredness": one(P, "- type: create\n"),
  "shape-scalar-field-as-list": rule("  data:\n  - a\n  - b\n"),
  "shape-list-field-as-inline-triple": rule("  filters: int, health, 5\n"),
  "shape-filter-as-list": rule("  objects:\n  - prefab: Boar\n    filter:\n    - int, health, 5\n"),
  "rpc-orphan-sibling-param": one(P, "- prefab: Fireplace\n  type: state, fuel\n  objectRpc:\n  - name: RPC_AddFuelAmount\n  - 1: float, 5\n"),
  "rpc-missing-name": one(P, "- prefab: Player\n  type: state, step\n  objectRpc:\n  - 1: int, 5\n    2: string, hello\n"),
  "rpc-param-mismatch": one(P, "- prefab: Player\n  type: state, step\n  objectRpc:\n  - name: Message\n    1: enum_message, 2\n    2: string, \"hello\"\n    3: int, 0\n    4: true\n    overwrite: true\n"),
  "rpc-unrecognized-key": rule("  objectRpc:\n  - name: SetHealth\n    remove: true\n"),
  "practice-legacy-delay": rule("  delay: 5\n"),
  "practice-legacy-spawn": rule("  spawn: Boar\n"),
  "ajv-scalar-field-type": rule("  weight: 1\n  data: 5\n"),
  "ajv-commented-out-list": rule("  objects:\n  #  - prefab: Boar\n"),
  "ajv-type-value-enum": one(P, "- prefab: Boar\n  type: notatype\n"),
  "ajv-unknown-key": rule("  bogusKey: 1\n"),
  "ajv-required": one(P, "- valueGroup: biome_pool\n"),
  "ajv-value": rule("  objects: 5\n"),
  "data-reference": rule("  data: undefinedThing\n"),
  "custom-key": rule("  command: <save_orphanFlag_1>\n"),
  "template-function": rule("  set: <notafunction>\n"),
  "poke-parameter": one(P, "- prefab: Player\n  type: create\n  poke:\n  - self: true\n    parameter: helloWorld2 <pname>\n"),
  "malformed-reference": rule("  command: <save_bossKillCount__<int_bossKills=0>>\n"),
  "legacy-object-data": rule("  objects:\n  - prefab: Boar\n    data: someData\n"),
  "ignored-data-with-filter": rule("  objects:\n  - prefab: Boar\n    data: someData\n    filter: int, health, 5\n"),
  "silent-condition-operator": rule("  condition: <int_level> == 3\n"),
  "silent-change-needs-trigger-rules": one(P, "- prefab: Boar\n  type: destroy\n  data: int, level, 3\n\n- prefab: Boar\n  type: change, level\n"),
  "silent-poke-world-centre": one(P, "- type: globalkey, raidCooldown\n  poke:\n  - prefab: piece_workbench\n    parameter: x\n"),
  "silent-filter-weight-part": rule("  filter: int, level, 2,3\n"),
  "silent-key-store-mix": one(P, "- prefab: Player\n  type: say, ack\n  exec: <save_raidRank_3>\n\n- type: globalkey, raidRank\n"),
  "silent-terrain-paint-name": rule("  terrain:\n  - paint: Dirtt\n"),
  "silent-owner-dropped": rule("  owner: 5\n  addItems: Wood, 1\n"),
  "silent-iter-operation": rule("  exec: <iter_ad_0_3_<par_i>>\n"),
  "filter-both-forms": rule("  objects:\n  - prefab: Boar\n    filter: int, health, 5\n    filters:\n    - int, x, 1\n"),
};

// Ids whose bad input needs a fuller setup than one small file. Keep this empty if you can;
// each entry needs a reason.
export const DIAGNOSIS_NOT_COVERED: Partial<Record<DiagnosisId, string>> = {
  "check-crashed": "needs a check that throws; proven with mocks in pipelineRobustness.test.ts",
};
