import { describe, expect, it } from "vitest";
import { parseDocument } from "yaml";
import { isMap, isSeq } from "yaml";
import { looksLikeTypedValueLine } from "./dataFieldValidation";
import { diagnoseEntryShapeIssues, diagnoseRpcOrphanListItems, diagnoseShapeMismatches, rpcParamIssueMessage, scalarDataFieldTypeMessage, SHAPE_MISMATCH_RULE_IDS, WEC_NAME_TYPO_RULE_ID } from "./shapeMismatchDiagnosis";
import { runStructuralPrecheck } from "./structuralPrecheck";
import { STRUCTURE_PROBLEM_CATEGORY, VALUE_PROBLEM_CATEGORY } from "./diagnosisCategories";

function firstEwpEntry(yaml: string) {
  const doc = parseDocument(yaml);
  const root = doc.contents;
  if (!root || !isSeq(root)) throw new Error("expected list root");
  const item = root.items[0];
  if (!isMap(item)) throw new Error("expected map entry");
  return { itemNode: item, value: item.toJSON() as Record<string, unknown> };
}

describe("looksLikeTypedValueLine", () => {
  it("matches EWP filter/data shorthand lines", () => {
    expect(looksLikeTypedValueLine("int, isCustom, 1")).toBe(true);
    expect(looksLikeTypedValueLine("hash, HelmetItem, HelmetBronze, 2")).toBe(true);
    expect(looksLikeTypedValueLine("myEntry")).toBe(false);
    expect(looksLikeTypedValueLine("int, onlyTwo")).toBe(false);
  });
});

describe("diagnoseShapeMismatches", () => {
  it("detects typed filter line written as YAML list under data:", () => {
    const yaml = "- prefab: Player\n  type: create\n  data:\n  - int, isCustom, 1\n";
    const { itemNode, value } = firstEwpEntry(yaml);
    const { diagnoses, suppressAjvPaths } = diagnoseShapeMismatches(itemNode, value, "EWP rule entry");
    expect(diagnoses).toHaveLength(1);
    expect(diagnoses[0].message).toContain("filter line written as a YAML list");
    expect(diagnoses[0].message).toContain("data: int, isCustom, 1");
    expect(suppressAjvPaths).toEqual(new Set(["/data"]));
  });

  it("detects filters: given as inline triple scalar", () => {
    const yaml = "- prefab: P\n  type: create\n  filters: int, isCustom, 1\n";
    const { itemNode, value } = firstEwpEntry(yaml);
    const { diagnoses } = diagnoseShapeMismatches(itemNode, value, "EWP rule entry");
    expect(diagnoses.some((d) => d.message.includes("one filter line written as a scalar"))).toBe(true);
  });

  it("dedupes by suppress path when multiple rules could fire", () => {
    const yaml = "- prefab: P\n  type: create\n  data:\n  - int, isCustom, 1\n";
    const { itemNode, value } = firstEwpEntry(yaml);
    const { diagnoses } = diagnoseShapeMismatches(itemNode, value, "EWP rule entry");
    expect(diagnoses.filter((d) => d.suppressAjvPath === "/data")).toHaveLength(1);
  });

  it("detects incomplete typed line written as YAML list under data:", () => {
    const yaml = "- prefab: P\n  type: create\n  data:\n  - foo, bar\n";
    const { itemNode, value } = firstEwpEntry(yaml);
    const { diagnoses } = diagnoseShapeMismatches(itemNode, value, "EWP rule entry");
    expect(diagnoses).toHaveLength(1);
    expect(diagnoses[0].message).toContain("incomplete `type, key, value` line");
    expect(diagnoses[0].severity).toBe("error");
  });

  it("points multiple malformed comma lines at filters:", () => {
    const yaml =
      "- prefab: P\n  type: create\n  data:\n  - foo, bar\n  - int, isCustom\n";
    const { itemNode, value } = firstEwpEntry(yaml);
    const { diagnoses } = diagnoseShapeMismatches(itemNode, value, "EWP rule entry");
    expect(diagnoses[0].message).toContain("filters:");
  });

  it("exports stable rule ids for the arbitration map", () => {
    expect(SHAPE_MISMATCH_RULE_IDS).toContain("ewp-top-level-scalar-data-filter-list");
    expect(SHAPE_MISMATCH_RULE_IDS).toContain(WEC_NAME_TYPO_RULE_ID);
    expect(SHAPE_MISMATCH_RULE_IDS).toContain("ewp-rpc-orphan-sibling-param");
    expect(SHAPE_MISMATCH_RULE_IDS).toContain("ewp-rpc-missing-name");
    expect(SHAPE_MISMATCH_RULE_IDS).toContain("ewp-malformed-typed-line-list");
  });
});

describe("diagnoseRpcOrphanListItems", () => {
  it("warns when a param line is a sibling list item after a name-only RPC entry", () => {
    const yaml =
      "- prefab: Fireplace\n" +
      "  type: state, fuel\n" +
      "  objectRpc:\n" +
      "  - name: RPC_AddFuelAmount\n" +
      "  - 1: float, 5\n";
    const { itemNode } = firstEwpEntry(yaml);
    const { diagnoses } = diagnoseRpcOrphanListItems(itemNode, "EWP rule entry");
    expect(diagnoses).toHaveLength(1);
    expect(diagnoses[0].severity).toBe("warning");
    expect(diagnoses[0].message).toContain("previous RPC entry");
    expect(diagnoses[0].branch).toBe(VALUE_PROBLEM_CATEGORY);
  });

  it("warns when numbered params have no name and no name-only predecessor", () => {
    const yaml =
      "- prefab: Player\n" +
      "  type: state, step\n" +
      "  objectRpc:\n" +
      "  - 1: int, 5\n" +
      "    2: string, hello\n";
    const { itemNode } = firstEwpEntry(yaml);
    const { diagnoses } = diagnoseRpcOrphanListItems(itemNode, "EWP rule entry");
    expect(diagnoses).toHaveLength(1);
    expect(diagnoses[0].message).toContain("no `name:`");
  });

  it("covers clientRpc the same way as objectRpc", () => {
    const yaml =
      "- prefab: Player\n" +
      "  type: state, step\n" +
      "  clientRpc:\n" +
      "  - name: ShowMessage\n" +
      "  - 1: string, hi\n";
    const { itemNode } = firstEwpEntry(yaml);
    const { diagnoses } = diagnoseRpcOrphanListItems(itemNode, "EWP rule entry");
    expect(diagnoses).toHaveLength(1);
    expect(diagnoses[0].message).toContain("previous RPC entry");
  });
});

describe("diagnoseEntryShapeIssues", () => {
  it("returns WEC name typo catalog row and skipEntryAjv when guessBranch would flag typo", () => {
    const yaml = "- data: leveler\n  ints:\n  - level, 1\n";
    const { itemNode, value } = firstEwpEntry(yaml);
    const result = diagnoseEntryShapeIssues(itemNode, value, "wecDataEntry", "WEC data entry", true);
    expect(result.skipEntryAjv).toBe(true);
    expect(result.diagnoses).toHaveLength(1);
    expect(result.diagnoses[0].message).toContain("Use `name:`, not `data:`");
    expect(result.diagnoses[0].branch).toBe(STRUCTURE_PROBLEM_CATEGORY);
    expect(result.suppressAjvPaths).toEqual(new Set(["/name"]));
  });
});

describe("shape mismatch integration", () => {
  it("surfaces intent-specific data: list message via structural precheck, not ajv must be string", () => {
    const yaml = "- prefab: Player\n  type: create\n  data:\n  - int, isCustom, 1\n";
    const problems = runStructuralPrecheck(yaml);
    expect(problems).toHaveLength(1);
    expect(problems[0].branch).toBe(VALUE_PROBLEM_CATEGORY);
    expect(problems[0].message).toContain("data: int, isCustom, 1");
    expect(problems[0].message).not.toContain("must be string");
  });

  it("gives drops: as a YAML list its own message, not the filter/bannedFilter plural text", () => {
    const yaml = "- prefab: Player\n  type: create\n  drops:\n  - a\n  - b\n";
    const { itemNode, value } = firstEwpEntry(yaml);
    const { diagnoses } = diagnoseShapeMismatches(itemNode, value, "EWP rule entry");
    expect(diagnoses).toHaveLength(1);
    expect(diagnoses[0].message).toBe("`drops:` must be a single string value, not a YAML list.");
  });
});

describe("scalarDataFieldTypeMessage", () => {
  it("provides clearer scalar-field type messages", () => {
    expect(scalarDataFieldTypeMessage("data")).toContain("filters:");
    expect(scalarDataFieldTypeMessage("filter")).toContain("filters:");
    expect(scalarDataFieldTypeMessage("bannedFilter")).toContain("bannedFilters:");
    expect(scalarDataFieldTypeMessage("unknown")).toBeNull();
  });
});

describe("rpcParamIssueMessage", () => {
  it("phrases a not-a-string issue with the actual type", () => {
    const msg = rpcParamIssueMessage("Message", {
      key: "3",
      kind: "not-a-string",
      docParam: { type: "int", desc: "count" },
      actualType: "boolean",
    });
    expect(msg).toContain("should be written as");
    expect(msg).toContain("a boolean");
  });

  it("phrases a case-only type mismatch distinctly from an incompatible one", () => {
    const caseOnly = rpcParamIssueMessage("RPC_SetPose", {
      key: "1",
      kind: "type-mismatch",
      docParam: { type: "int", desc: "pose id" },
      declaredType: "Int",
      caseOnlyMismatch: true,
    });
    expect(caseOnly).toContain("case-sensitively");

    const incompatible = rpcParamIssueMessage("Message", {
      key: "1",
      kind: "type-mismatch",
      docParam: { type: "enum_message", desc: "kind" },
      declaredType: "string",
      caseOnlyMismatch: false,
    });
    expect(incompatible).not.toContain("case-sensitively");
    expect(incompatible).toContain("documented type is");
  });

  it("names the rule entry, both, or neither for an unrecognized RPC key", () => {
    expect(rpcParamIssueMessage("RPC_Damage", { key: "remove", kind: "unrecognized-key", belongsTo: "rule-entry" })).toContain(
      "rule entry itself",
    );
    expect(
      rpcParamIssueMessage("RPC_Damage", { key: "triggerRules", kind: "unrecognized-key", belongsTo: "both" }),
    ).toContain("rule entry itself or a spawn:/swap: entry");
    expect(
      rpcParamIssueMessage("RPC_Damage", { key: "totallyMadeUp", kind: "unrecognized-key", belongsTo: null }),
    ).toContain("numbered call parameter");
  });
});
