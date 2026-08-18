import { describe, expect, it } from "vitest";
import { DIAGNOSIS_CATEGORIES, presentSortedCategories } from "./diagnosisCategories";

describe("presentSortedCategories", () => {
  it("returns only the categories present among the given branches", () => {
    const branches = ["EWP rule entry", "Data entry reference", "EWP rule entry"];
    expect(presentSortedCategories(branches)).toEqual(["Data entry reference", "EWP rule entry"]);
  });

  it("sorts ascending alphabetical, case-insensitive", () => {
    const branches = ["WEC data entry", "Value entry", "EWP rule entry", "Formatting"];
    expect(presentSortedCategories(branches)).toEqual([
      "EWP rule entry",
      "Formatting",
      "Value entry",
      "WEC data entry",
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

  it("keeps every vocabulary label in sentence/abbreviation case (no stray lowercase)", () => {
    for (const c of DIAGNOSIS_CATEGORIES) {
      expect(c[0]).toBe(c[0].toUpperCase());
    }
  });
});
