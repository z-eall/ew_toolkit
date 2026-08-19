import { describe, expect, it } from "vitest";
import {
  collectRuleEntryDataReferences,
  isBarewordDataReference,
  normalizeDataReferenceValue,
  scalarDataFieldTypeMessage,
} from "./dataFieldValidation";
import { parseDocument } from "yaml";
import { isMap, isSeq } from "yaml";

function firstRuleEntry(yaml: string) {
  const doc = parseDocument(yaml);
  const root = doc.contents;
  if (!root || !isSeq(root)) throw new Error("expected seq root");
  const item = root.items[0];
  if (!isMap(item)) throw new Error("expected map item");
  return { itemNode: item, value: item.toJSON() as Record<string, unknown> };
}

describe("dataFieldValidation", () => {
  it("treats comma and pure-dynamic values as non-references", () => {
    expect(isBarewordDataReference("int, isCustom, 1")).toBe(false);
    expect(isBarewordDataReference("<string_foo>")).toBe(false);
    expect(isBarewordDataReference("myEntry")).toBe(true);
    expect(isBarewordDataReference("prefix<par_1>")).toBe(true);
    expect(isBarewordDataReference(333)).toBe(true);
    expect(normalizeDataReferenceValue(333)).toBe("333");
  });

  it("collects top-level data/filter refs and skips inline triples", () => {
    const yaml = "- prefab: P\n  type: create\n  data: missing\n  filter: alsoMissing\n  filters:\n  - int, x, 1\n  - namedFilter\n";
    const { itemNode, value } = firstRuleEntry(yaml);
    const { usages } = collectRuleEntryDataReferences(itemNode, value);
    expect(usages.map((u) => u.name).sort()).toEqual(["alsoMissing", "missing", "namedFilter"]);
  });

  it("collects nested legacy data: as usage with suppressUndefinedError", () => {
    const yaml =
      "- prefab: P\n  type: create\n  objects:\n  - prefab: Chest\n    data: legacyName\n";
    const { itemNode, value } = firstRuleEntry(yaml);
    const { usages, legacyNotices } = collectRuleEntryDataReferences(itemNode, value);
    expect(legacyNotices).toHaveLength(1);
    expect(usages).toEqual([{ name: "legacyName", range: expect.any(Array), suppressUndefinedError: true }]);
  });

  it("provides clearer scalar-field type messages", () => {
    expect(scalarDataFieldTypeMessage("data")).toContain("filters:");
    expect(scalarDataFieldTypeMessage("filter")).toContain("filters:");
    expect(scalarDataFieldTypeMessage("bannedFilter")).toContain("bannedFilters:");
    expect(scalarDataFieldTypeMessage("unknown")).toBeNull();
  });
});
