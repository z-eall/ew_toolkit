import { describe, expect, it } from "vitest";
import { FORMAT_CATEGORY, runFormatLint } from "./formatLint";

describe("runFormatLint — double-colon keys", () => {
  it("flags a key written with a stray double colon, pointing at the key itself", () => {
    const yaml = "- prefab: WearNTear\n  filter:: fireMineDispenserCheck\n";
    const problems = runFormatLint(yaml);
    expect(problems).toHaveLength(1);
    expect(problems[0].severity).toBe("error");
    expect(problems[0].branch).toBe(FORMAT_CATEGORY);
    expect(problems[0].message).toContain("colon");
    // Range points at the offending `filter:` key, not the whole entry.
    expect(yaml.slice(...problems[0].range)).toBe("filter:");
  });

  it("finds a double-colon key nested inside a poke list, on its own line", () => {
    const yaml =
      "- prefab: blackmarble_column_2\n" +
      "  type: poke, fireMineStop\n" +
      "  poke:\n" +
      "  - prefab: WearNTear\n" +
      "    filter:: fireMineDispenserCheck\n" +
      "    limit: 28\n";
    const problems = runFormatLint(yaml);
    expect(problems).toHaveLength(1);
    // The reported range sits on line 5, where the `::` actually is.
    const line = yaml.slice(0, problems[0].range[0]).split("\n").length;
    expect(line).toBe(5);
    expect(yaml.slice(...problems[0].range)).toBe("filter:");
  });

  it("reports each double-colon key separately", () => {
    const yaml =
      "- poke:\n" +
      "  - prefab: WearNTear\n" +
      "    filter:: a\n" +
      "  - prefab: WearNTear\n" +
      "    filter:: b\n";
    expect(runFormatLint(yaml)).toHaveLength(2);
  });

  it("also flags a stray colon in the middle of a key, not just a trailing one", () => {
    const yaml = "- prefab: X\n  fil::ter: y\n";
    const problems = runFormatLint(yaml);
    expect(problems).toHaveLength(1);
    expect(yaml.slice(...problems[0].range)).toBe("fil::ter");
  });

  it("does not flag a double colon inside a comment", () => {
    const yaml = "# note:: this is only a comment\n- prefab: X\n  type: create\n";
    expect(runFormatLint(yaml)).toEqual([]);
  });

  it("does not flag a double colon inside a value (only keys are checked)", () => {
    const yaml = "- prefab: X\n  data: a::b\n";
    expect(runFormatLint(yaml)).toEqual([]);
  });

  it("returns nothing for clean YAML", () => {
    const yaml = "- prefab: WearNTear\n  filter: fireMineDispenserCheck\n  limit: 28\n";
    expect(runFormatLint(yaml)).toEqual([]);
  });

  it("tolerates unparseable / empty input without throwing", () => {
    expect(runFormatLint("")).toEqual([]);
    expect(runFormatLint("just a string")).toEqual([]);
  });
});
