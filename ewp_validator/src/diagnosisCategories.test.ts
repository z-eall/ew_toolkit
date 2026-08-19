import { describe, expect, it } from "vitest";
import { DIAGNOSIS_CATEGORIES, presentSortedCategories } from "./diagnosisCategories";

describe("presentSortedCategories", () => {
  it("returns only the categories present among the given branches", () => {
    const branches = ["Structure problem", "Reference problem", "Structure problem"];
    expect(presentSortedCategories(branches)).toEqual(["Reference problem", "Structure problem"]);
  });

  it("sorts ascending alphabetical, case-insensitive", () => {
    const branches = ["Value problem", "Legacy but working", "Structure problem", "Invalid file"];
    expect(presentSortedCategories(branches)).toEqual([
      "Invalid file",
      "Legacy but working",
      "Structure problem",
      "Value problem",
    ]);
  });

  it("drops synthetic/unknown branches that aren't part of the vocabulary", () => {
    const branches = ["(parse)", "(root)", "(item)", "Invalid file"];
    expect(presentSortedCategories(branches)).toEqual(["Invalid file"]);
  });

  it("returns an empty list when nothing categorised is present", () => {
    expect(presentSortedCategories(["(parse)"])).toEqual([]);
    expect(presentSortedCategories([])).toEqual([]);
  });

  it("has exactly the 5 kind-based categories from the category-grouping redesign", () => {
    expect(DIAGNOSIS_CATEGORIES).toEqual([
      "Structure problem",
      "Value problem",
      "Reference problem",
      "Invalid file",
      "Legacy but working",
    ]);
  });

  it("keeps every vocabulary label in sentence/abbreviation case (no stray lowercase)", () => {
    for (const c of DIAGNOSIS_CATEGORIES) {
      expect(c[0]).toBe(c[0].toUpperCase());
    }
  });
});
