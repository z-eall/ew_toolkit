import { describe, expect, it } from "vitest";
import { guessBranch, LEGACY_FORMAT_CATEGORY, runStructuralPrecheck } from "./structuralPrecheck";

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

  it("guesses wecDataEntry for a raw-data entry (name + bare fields, no typed list) — ticket 13", () => {
    expect(guessBranch({ name: "loot_eldenking", position: "4251,-2618,4361.5", rotation: "90,0,0" }).branch).toBe(
      "wecDataEntry",
    );
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

  it("accepts a raw-data entry that sets bare ZDO fields (position/rotation) as valid — ticket 13", () => {
    const yaml = "- name: loot_eldenking\n  position: 4251,-2618,4361.5\n  rotation: 90,0,0\n";
    expect(runStructuralPrecheck(yaml).filter((p) => p.severity === "error")).toEqual([]);
  });

  it("flags a legacy top-level delay: under the Legacy format entry category, not an error — ticket 13", () => {
    const yaml = "- prefab: dungeon_queen_door_custom\n  type: change, state true\n  delay: 18\n";
    const problems = runStructuralPrecheck(yaml);
    expect(problems.filter((p) => p.severity === "error")).toEqual([]);
    const flag = problems.find((p) => p.severity === "info" && p.message.includes("delay"));
    expect(flag).toBeDefined();
    expect(yaml.slice(...flag!.range).trim()).toBe("delay: 18");
    // Renamed to match Jere's docs, and carries its own filterable category.
    expect(flag!.message).toContain("Legacy format:");
    expect(flag!.message).not.toContain("Old format");
    expect(flag!.branch).toBe(LEGACY_FORMAT_CATEGORY);
  });

  it("flags a legacy single-line spawn: string under the Legacy format entry category, not an error — ticket 13", () => {
    const yaml = "- prefab: Beehive\n  type: create\n  spawn: fx_BonusYield, 0,0,1\n";
    const problems = runStructuralPrecheck(yaml);
    expect(problems.filter((p) => p.severity === "error")).toEqual([]);
    const flag = problems.find((p) => p.severity === "info" && p.message.includes("spawn"));
    expect(flag).toBeDefined();
    expect(flag!.message).toContain("Legacy format:");
    expect(flag!.branch).toBe(LEGACY_FORMAT_CATEGORY);
  });

  it("accepts a value group whose values are numbers, not just strings — ticket 13", () => {
    // README_data.md "multiple parameter values": a valueGroup's values are
    // parameter values and can be numeric (they're substituted as text in-game).
    // YAML parses bare `123` as a number, so the schema must accept scalars.
    const yaml = "- valueGroup: Hello\n  values:\n  - hello\n  - 123\n  - 4.5\n  - true\n";
    expect(runStructuralPrecheck(yaml).filter((p) => p.severity === "error")).toEqual([]);
  });

  it("flags a `::` double colon as a format error, not a misleading 'not a valid key' — ticket 13", () => {
    // `filter:: X` inside a nested poke: YAML reads the key as `filter:`; ajv
    // used to call it an invalid key and point at the whole entry (wrong line).
    const yaml =
      "- prefab: blackmarble_column_2\n" +
      "  type: poke, fireMineStop\n" +
      "  poke:\n" +
      "  - prefab: WearNTear\n" +
      "    filter:: fireMineDispenserCheck\n" +
      "    limit: 28\n";
    const problems = runStructuralPrecheck(yaml);
    // No misleading additionalProperties error survives.
    expect(problems.some((p) => p.message.includes("not a valid key"))).toBe(false);
    // Exactly one format error, pointing at the offending `filter:` key on line 5.
    const format = problems.filter((p) => p.branch === "Formatting");
    expect(format).toHaveLength(1);
    expect(format[0].severity).toBe("error");
    expect(yaml.slice(...format[0].range)).toBe("filter:");
    expect(yaml.slice(0, format[0].range[0]).split("\n").length).toBe(5);
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
    expect(problems[0].message).toContain("must be a YAML list");
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
