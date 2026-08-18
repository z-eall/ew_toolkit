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

  it("does not flag a data: <function> value at all — it reads object data we can't inspect", () => {
    // A `<string_isSpawningPrefabData>` value resolves, at runtime, to a data.yaml
    // name pulled from the object's own ZDO data (functions.md). Validation can't
    // read object data, so there is nothing to verify and nothing to flag.
    const files = [{ id: "a", text: "- prefab: Bonemass\n  type: create\n  data: <string_isSpawningPrefabData>\n" }];
    expect(runReferenceValidation(files)).toEqual([]);
  });

  it("does not flag a spawn[] nested data: <function> value either", () => {
    const files = [
      { id: "a", text: "- prefab: Bonemass\n  type: create\n  spawn:\n  - prefab: Skeleton\n    data: <string_foo>\n" },
    ];
    expect(runReferenceValidation(files)).toEqual([]);
  });

  it("does not flag a top-level data: type,key,value injection shorthand carrying a <function>", () => {
    // `data: float, cooldownFrostseerBlobSpawner, <time>` is a single-value data
    // injection into the trigger object (scripting.md shorthand), not a data.yaml
    // reference and not an object-data read.
    const files = [
      { id: "a", text: "- prefab: Piece\n  type: poke, cooldownFrostseerBlobSpawner\n  data: float, cooldownFrostseerBlobSpawner, <time>\n" },
    ];
    expect(runReferenceValidation(files)).toEqual([]);
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

  it("resolves a read against a save whose key has a dynamic <...> parameter (prefix/likely match)", () => {
    // `<load_captureblockercity1=0>` reads captureblockercity1; the save builds
    // the key name dynamically, so its static skeleton must match as a wildcard.
    const files = [
      { id: "a", text: "- prefab: A\n  type: create\n  command: <load_captureblockercity1=0>\n" },
      {
        id: "b",
        text: "- prefab: B\n  type: poke\n  exec: |\n    <save_captureblockercity<int_isRadarCity=0>_<time>>\n",
      },
    ];
    expect(runReferenceValidation(files)).toEqual([]);
  });

  it("compares only parameter1 of a type: key trigger, ignoring the hand-written value", () => {
    // `type: key, adminmoderecovery 30;99999` — parameter2 (30;99999) is a value,
    // not part of the key name, so a <save_adminmoderecovery_..> should resolve it
    // and the flag (if any) must name only 'adminmoderecovery'.
    const resolved = [
      { id: "a", text: "- type: key, adminmoderecovery 30;99999\n  exec: |\n    <save_adminmoderecovery_0>\n" },
    ];
    expect(runReferenceValidation(resolved)).toEqual([]);

    const unresolved = [{ id: "a", text: "- type: key, adminmoderecovery 30;99999\n" }];
    const problems = runReferenceValidation(unresolved);
    expect(problems.some((p) => p.kind === "custom-key" && p.message.includes("'adminmoderecovery'"))).toBe(true);
    expect(problems.some((p) => p.message.includes("30;99999"))).toBe(false);
  });

  it("matches keys containing <...> and / on the name portion, ignoring the value", () => {
    // keys: <pid>/teamlead 1 needs the key '<pid>/teamlead' to hold 1; the value
    // is not part of the key, and the save writes the same <pid>/teamlead name.
    const files = [
      { id: "a", text: "- prefab: Player\n  type: state, action swing_sledge\n  keys: <pid>/teamlead 1\n" },
      { id: "b", text: "- prefab: Player\n  type: poke, assignTeamLead 1,2 front\n  exec: |\n    <save_<pid>/teamlead_<par_1>>\n" },
    ];
    expect(runReferenceValidation(files)).toEqual([]);
  });

  it("does not let a purely-dynamic saved key mask unrelated reads", () => {
    // <save_<pid>_1> extracts the key name '<pid>', which is all wildcard. It
    // must not be treated as a write for every other key, or it would suppress
    // the genuine missing-write flag on someFlag.
    const files = [
      { id: "a", text: "- prefab: Beehive\n  type: create\n  keys: someFlag 1\n" },
      { id: "b", text: "- prefab: Player\n  type: poke\n  exec: |\n    <save_<pid>_1>\n" },
    ];
    const problems = runReferenceValidation(files);
    expect(problems.some((p) => p.kind === "custom-key" && p.message.includes("'someFlag'"))).toBe(true);
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
