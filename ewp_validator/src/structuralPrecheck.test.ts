import { describe, expect, it } from "vitest";
import { guessBranch, runStructuralPrecheck } from "./structuralPrecheck";

describe("guessBranch", () => {
  it("guesses valueGroup when valueGroup is present", () => {
    expect(guessBranch({ valueGroup: "biomes", values: ["Meadows"] }).branch).toBe("valueGroup");
  });

  it("guesses valueEntry when value is present", () => {
    expect(guessBranch({ value: "greeting, hi" }).branch).toBe("valueEntry");
  });

  it("guesses wecDataEntry for name + a typed list with no prefab/type", () => {
    const guess = guessBranch({ name: "x", ints: ["level, 1"] });
    expect(guess.branch).toBe("wecDataEntry");
    expect(guess.likelyDataNameTypo).toBe(false);
  });

  it("flags the ticket 07 data:/name: typo but still guesses wecDataEntry", () => {
    const guess = guessBranch({ data: "leveler", ints: ["level, 1"] });
    expect(guess.branch).toBe("wecDataEntry");
    expect(guess.likelyDataNameTypo).toBe(true);
  });

  it("does not guess wecDataEntry when prefab/type is also present, even with a typed list", () => {
    // e.g. a real EWP rule entry that happens to also set `ints` via some other path
    expect(guessBranch({ name: "x", prefab: "Bonemass", ints: ["a"] }).branch).toBe("ewpRuleEntry");
  });

  it("defaults to ewpRuleEntry for a normal rule entry and for total garbage", () => {
    expect(guessBranch({ prefab: "Bonemass", type: "create" }).branch).toBe("ewpRuleEntry");
    expect(guessBranch({ foo: "bar" }).branch).toBe("ewpRuleEntry");
  });
});

describe("runStructuralPrecheck", () => {
  it("passes a valid mixed file with all four shapes cleanly", () => {
    const yaml = `
- prefab: Bonemass
  type: create
  chance: 0.1
  data: ultra_bonemass

- name: ultra_bonemass
  floats:
  - RandomSkillFactor, 1.5

- value: greeting, Hello there

- valueGroup: biome_pool
  values:
  - Meadows
`;
    expect(runStructuralPrecheck(yaml)).toEqual([]);
  });

  it("scopes a typo'd key to a single error naming the guessed branch, not the raw oneOf noise", () => {
    const yaml = "- prefeb: Bonemass\n  type: create\n  chance: 0.1\n";
    const problems = runStructuralPrecheck(yaml);
    const errors = problems.filter((p) => p.severity === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0].branch).toBe("EWP rule entry");
    expect(errors[0].message).toContain("prefeb");
    // range should point at the bad key: value pair, not the whole entry
    expect(yaml.slice(...errors[0].range).trim()).toBe("prefeb: Bonemass");
  });

  it("surfaces the ticket 07 data:/name: hint as a warning instead of a generic mismatch error", () => {
    const yaml = "- data: leveler\n  ints:\n  - level, 1\n";
    const problems = runStructuralPrecheck(yaml);
    expect(problems).toHaveLength(1);
    expect(problems[0].severity).toBe("warning");
    expect(problems[0].message).toContain("name:");
    expect(yaml.slice(...problems[0].range).trim()).toBe("data: leveler");
  });

  it("scopes garbage input to the default-guessed branch instead of every branch", () => {
    const yaml = "- foo: bar\n  baz: 1\n";
    const problems = runStructuralPrecheck(yaml);
    expect(problems.every((p) => p.branch === "EWP rule entry")).toBe(true);
    expect(problems.some((p) => p.message.includes("foo"))).toBe(true);
    expect(problems.some((p) => p.message.includes("baz"))).toBe(true);
  });

  it("reports YAML syntax errors and skips downstream structural checks for that file", () => {
    const yaml = "- prefab: Bonemass\n  type: create\n\tbad: true\n";
    const problems = runStructuralPrecheck(yaml);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems[0].message).toContain("YAML syntax error");
  });

  it("rejects a non-array top-level document", () => {
    const problems = runStructuralPrecheck("prefab: Bonemass\ntype: create\n");
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain("must be a YAML array");
  });

  it("warns on a missing prefab for a type that requires one, per ticket 09", () => {
    const yaml = "- type: create\n  chance: 0.1\n";
    const problems = runStructuralPrecheck(yaml);
    expect(problems.some((p) => p.severity === "warning" && p.message.includes("prefab"))).toBe(true);
  });

  it("does not warn on a missing prefab for the documented prefab-less types", () => {
    for (const type of ["globalkey", "key", "custom", "event", "time", "realtime"]) {
      const problems = runStructuralPrecheck(`- type: ${type}\n`);
      expect(problems.some((p) => p.message.includes("expects a non-empty 'prefab'"))).toBe(false);
    }
  });
});
