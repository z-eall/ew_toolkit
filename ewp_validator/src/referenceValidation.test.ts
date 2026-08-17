import { describe, expect, it } from "vitest";
import { runReferenceValidation } from "./referenceValidation";

describe("data.yaml reference validation (ticket 06)", () => {
  it("flags an undefined data: reference as a hard error", () => {
    const files = [{ id: "a", text: "- prefab: Bonemass\n  type: create\n  data: nonexistent\n" }];
    const problems = runReferenceValidation(files);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ fileId: "a", severity: "error", kind: "data-reference" });
    expect(problems[0].message).toContain("nonexistent");
  });

  it("does not flag a data: reference defined in the same file", () => {
    const files = [
      {
        id: "a",
        text: "- prefab: Bonemass\n  type: create\n  data: ultra_bonemass\n\n- name: ultra_bonemass\n  floats:\n  - x, 1\n",
      },
    ];
    expect(runReferenceValidation(files)).toEqual([]);
  });

  it("resolves a reference defined in a different loaded file (merged namespace)", () => {
    const files = [
      { id: "a", text: "- prefab: Bonemass\n  type: create\n  data: ultra_bonemass\n" },
      { id: "b", text: "- name: ultra_bonemass\n  floats:\n  - x, 1\n" },
    ];
    expect(runReferenceValidation(files)).toEqual([]);
  });

  it("flags a data.yaml entry with zero usages as a low-severity hint, not an error", () => {
    const files = [{ id: "a", text: "- name: never_used\n  ints:\n  - level, 1\n" }];
    const problems = runReferenceValidation(files);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ fileId: "a", severity: "info", kind: "data-reference" });
    expect(problems[0].message).toContain("never_used");
  });

  it("does not treat the inline type,key,value shorthand as a bareword reference", () => {
    const files = [{ id: "a", text: "- prefab: Bonemass\n  type: create\n  data: int, level, 3\n" }];
    expect(runReferenceValidation(files)).toEqual([]);
  });

  it("does not treat a boolean drops: value as a reference, but does check a bareword drops: value", () => {
    const boolFiles = [{ id: "a", text: "- prefab: Bonemass\n  type: create\n  drops: true\n" }];
    expect(runReferenceValidation(boolFiles)).toEqual([]);

    const refFiles = [{ id: "a", text: "- prefab: Bonemass\n  type: create\n  drops: missing_loot_table\n" }];
    const problems = runReferenceValidation(refFiles);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain("missing_loot_table");
  });

  it("checks addItems/removeItems the same way, skipping the itemid,amount shorthand", () => {
    const shorthand = [{ id: "a", text: "- prefab: Chest\n  type: create\n  addItems: Wood, 10\n" }];
    expect(runReferenceValidation(shorthand)).toEqual([]);

    const reference = [{ id: "a", text: "- prefab: Chest\n  type: create\n  removeItems: undefined_loot\n" }];
    const problems = runReferenceValidation(reference);
    expect(problems.some((p) => p.message.includes("undefined_loot"))).toBe(true);
  });

  it("checks spawn[]/swap[] nested data: fields against the same namespace", () => {
    const files = [
      {
        id: "a",
        text: "- prefab: Bonemass\n  type: create\n  spawn:\n  - prefab: Skeleton\n    data: missing_spawn_data\n",
      },
    ];
    const problems = runReferenceValidation(files);
    expect(problems.some((p) => p.kind === "data-reference" && p.message.includes("missing_spawn_data"))).toBe(true);
  });

  it("treats a data: <function> value as a blue object-data flag, not an undefined reference — ticket 13", () => {
    const files = [{ id: "a", text: "- prefab: Bonemass\n  type: create\n  data: <string_isSpawningPrefabData>\n" }];
    const problems = runReferenceValidation(files);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ severity: "info", kind: "data-function" });
    expect(problems[0].message).toContain("object data");
    expect(problems.some((p) => p.severity === "error")).toBe(false);
  });

  it("also flags a spawn[] nested data: <function> value rather than erroring — ticket 13", () => {
    const files = [
      { id: "a", text: "- prefab: Bonemass\n  type: create\n  spawn:\n  - prefab: Skeleton\n    data: <string_foo>\n" },
    ];
    const problems = runReferenceValidation(files);
    expect(problems.some((p) => p.kind === "data-function")).toBe(true);
    expect(problems.some((p) => p.severity === "error")).toBe(false);
  });

  it("does not treat an object filter's data: shorthand as a data.yaml reference", () => {
    // ObjectData.data is a single-filter shorthand in PrefabData.cs, a different
    // semantic from the top-level action `data:` field despite the same name.
    const files = [
      {
        id: "a",
        text: "- prefab: Bonemass\n  type: create\n  objects:\n  - prefab: Chest\n    data: not_a_data_reference\n",
      },
    ];
    expect(runReferenceValidation(files)).toEqual([]);
  });
});

describe("custom saved key lint (ticket 06)", () => {
  it("flags a keys: read with no matching <save_...> write anywhere loaded as a blue notice, not a warning — ticket 13", () => {
    const files = [{ id: "a", text: "- prefab: Beehive\n  type: create\n  keys: myFlag 1\n" }];
    const problems = runReferenceValidation(files);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ fileId: "a", severity: "info", kind: "custom-key" });
    expect(problems[0].message).toContain("myFlag");
    expect(problems[0].message).toContain("ewp_data.yaml");
    // Restored wording — ticket 13
    expect(problems[0].message).toContain("before treating this as a bug");
  });

  it("flags a <save_...> write with no matching read anywhere loaded as a blue notice, not a warning — ticket 13", () => {
    const files = [{ id: "a", text: "- prefab: Beehive\n  type: create\n  command: <save_orphanFlag_1>\n" }];
    const problems = runReferenceValidation(files);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ severity: "info", kind: "custom-key" });
    expect(problems[0].message).toContain("orphanFlag");
  });

  it("does not flag a key with both a write and a read, even across files", () => {
    const files = [
      { id: "a", text: "- prefab: Beehive\n  type: create\n  command: <save_ready_1>\n" },
      { id: "b", text: "- prefab: Chest\n  type: create\n  keys: ready 1\n" },
    ];
    expect(runReferenceValidation(files)).toEqual([]);
  });

  it("reads a key from type: key,<name>'s trigger parameter", () => {
    const files = [{ id: "a", text: "- type: key, unwrittenFlag\n" }];
    const problems = runReferenceValidation(files);
    expect(problems.some((p) => p.kind === "custom-key" && p.message.includes("unwrittenFlag"))).toBe(true);
  });

  it("reads a key from <load_X> and <clear_X> templates", () => {
    const files = [{ id: "a", text: "- prefab: Beehive\n  type: create\n  command: <load_loadedFlag=0> <clear_clearedFlag>\n" }];
    const problems = runReferenceValidation(files);
    const names = problems.map((p) => p.message);
    expect(names.some((m) => m.includes("loadedFlag"))).toBe(true);
    expect(names.some((m) => m.includes("clearedFlag"))).toBe(true);
  });

  it("does not cross-report between the data.yaml namespace and the custom-key namespace", () => {
    const files = [{ id: "a", text: "- name: some_data\n  ints:\n  - level, 1\n" }];
    const problems = runReferenceValidation(files);
    // only the "defined but unused" data-reference hint, no custom-key noise
    expect(problems).toHaveLength(1);
    expect(problems[0].kind).toBe("data-reference");
  });
});

describe("cross-file re-evaluation", () => {
  it("clears both the undefined-reference error and the dead-entry hint once linked across files", () => {
    const brokenFiles = [
      { id: "a", text: "- prefab: Bonemass\n  type: create\n  data: shared_entry\n" },
      { id: "b", text: "- name: unrelated\n  ints:\n  - x, 1\n" },
    ];
    const brokenProblems = runReferenceValidation(brokenFiles);
    expect(brokenProblems.some((p) => p.severity === "error")).toBe(true);

    const fixedFiles = [
      { id: "a", text: "- prefab: Bonemass\n  type: create\n  data: shared_entry\n" },
      { id: "b", text: "- name: shared_entry\n  ints:\n  - x, 1\n" },
    ];
    expect(runReferenceValidation(fixedFiles)).toEqual([]);
  });

  it("skips a file with YAML syntax errors rather than throwing", () => {
    const files = [
      { id: "a", text: "- prefab: Bonemass\n  type: create\n\tbroken: true\n" },
      { id: "b", text: "- name: fine\n  ints:\n  - x, 1\n" },
    ];
    expect(() => runReferenceValidation(files)).not.toThrow();
  });
});
