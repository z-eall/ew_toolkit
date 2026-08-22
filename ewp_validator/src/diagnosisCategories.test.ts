import { describe, expect, it } from "vitest";
import {
  DIAGNOSIS_CATEGORIES,
  formatProblemTag,
  presentSortedCategories,
  shouldShowTagSubline,
  YAML_PROBLEM_CATEGORY,
  YAML_SUBGROUP_PARSE,
} from "./diagnosisCategories";

describe("presentSortedCategories", () => {
  it("returns only the categories present among the given branches", () => {
    const branches = ["Structure problem", "Reference problem", "Structure problem"];
    expect(presentSortedCategories(branches)).toEqual(["Reference problem", "Structure problem"]);
  });

  it("sorts ascending alphabetical, case-insensitive", () => {
    const branches = ["Value problem", "Legacy but working", "Structure problem", "Invalid file", "YAML problem"];
    expect(presentSortedCategories(branches)).toEqual([
      "Invalid file",
      "Legacy but working",
      "Structure problem",
      "Value problem",
      "YAML problem",
    ]);
  });

  it("drops unknown branches that aren't part of the vocabulary", () => {
    const branches = ["(parse)", "(root)", "(item)", "Invalid file"];
    expect(presentSortedCategories(branches)).toEqual(["Invalid file"]);
  });

  it("returns an empty list when nothing categorised is present", () => {
    expect(presentSortedCategories(["(parse)"])).toEqual([]);
    expect(presentSortedCategories([])).toEqual([]);
  });

  it("has the six kind-based categories including YAML problem", () => {
    expect(DIAGNOSIS_CATEGORIES).toEqual([
      "Structure problem",
      "Value problem",
      "Reference problem",
      "YAML problem",
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

describe("formatProblemTag", () => {
  it("joins YAML problem with its sub-group for copy/report strings", () => {
    expect(formatProblemTag(YAML_PROBLEM_CATEGORY, YAML_SUBGROUP_PARSE)).toBe("YAML problem · (parse)");
  });

  it("returns branch only for kind-based categories even when entryType is set", () => {
    expect(formatProblemTag("Structure problem", "EWP rule entry")).toBe("Structure problem");
  });
});

describe("shouldShowTagSubline", () => {
  it("shows subline only for YAML problem with a sub-group", () => {
    expect(shouldShowTagSubline(YAML_PROBLEM_CATEGORY, YAML_SUBGROUP_PARSE)).toBe(true);
    expect(shouldShowTagSubline(YAML_PROBLEM_CATEGORY)).toBe(false);
    expect(shouldShowTagSubline("Structure problem", "EWP rule entry")).toBe(false);
  });
});
