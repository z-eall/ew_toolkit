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

  it("flags an undefined filter: reference the same way as data:", () => {
    const files = [{ id: "a", text: "- prefab: Bonemass\n  type: create\n  filter: fireMineDispenserCheck\n" }];
    const problems = runReferenceValidation(files);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ fileId: "a", severity: "error", kind: "data-reference" });
    expect(problems[0].message).toContain("fireMineDispenserCheck");
  });

  it("flags each undefined name in a filters: list, and resolves defined ones", () => {
    const files = [
      {
        id: "a",
        text:
          "- prefab: Bonemass\n  type: create\n  filters:\n  - fireMineStopperCheck\n  - knownFilter\n" +
          "\n- name: knownFilter\n  ints:\n  - a, 1\n",
      },
    ];
    const problems = runReferenceValidation(files);
    const refErrors = problems.filter((p) => p.kind === "data-reference" && p.severity === "error");
    expect(refErrors).toHaveLength(1);
    expect(refErrors[0].message).toContain("fireMineStopperCheck");
    expect(refErrors.some((p) => p.message.includes("knownFilter"))).toBe(false);
  });

  it("does not treat an inline `filter: type, key, value` shorthand as a reference", () => {
    const files = [{ id: "a", text: "- prefab: Bonemass\n  type: create\n  filter: string, boss, Bonemass\n" }];
    expect(runReferenceValidation(files)).toEqual([]);
  });

  it("resolves a filter: reference defined as a data entry name", () => {
    const files = [
      { id: "a", text: "- prefab: Bonemass\n  type: create\n  filter: bossCheck\n" },
      { id: "b", text: "- name: bossCheck\n  ints:\n  - boss, 1\n" },
    ];
    expect(runReferenceValidation(files)).toEqual([]);
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
    expect(problems[0].message).toContain("Verify in expand_prefabs*/ewp_data.yaml");
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

  it("does not flag save/load/clear keys built entirely from passed params — nothing concrete to check", () => {
    // <save_<par_1>_<par_2>>, <clear_<rest_1>>, and <save_<pid>_<long_playerID>>
    // all extract a key name that is purely a dynamic <...> group (no literal
    // characters) — the real name only exists at runtime, so there's nothing to
    // match a read/write against and it must not be flagged either way.
    const files = [
      {
        id: "a",
        text:
          "- prefab: Player\n  type: say, !savedata\n  exec: <save_<par_1>_<par_2>>\n\n" +
          "- prefab: Player\n  type: say, !cleardata\n  exec: <clear_<rest_1>>\n\n" +
          "- prefab: Player\n  type: state, join\n  exec: |\n    <save_<pid>_<long_playerID>>;\n    <save_<long_playerID>_<pname>>\n",
      },
    ];
    expect(runReferenceValidation(files)).toEqual([]);
  });

  it("ignores saved-key templates written inside a YAML comment", () => {
    // A commented-out `<save_..>` isn't live code — it must not count as a real
    // write, or an unrelated live read of the same name gets a false "written
    // but never read" flag reversed onto a phantom match, or vice versa.
    const files = [
      {
        id: "a",
        text:
          "# - type: realtime, second\n  # exec: <save_realtimesecond_<modlong_<par_1>_60>>\n\n" +
          "# - type: key, realtimesecond 0,5,10,15,20,25,30,35,40,45,50,55\n  # bannedKeys: bfvworldlevel 0\n  # exec: <save++_cargospawnfactor>\n",
      },
    ];
    expect(runReferenceValidation(files)).toEqual([]);
  });

  it("tells a live read whose only <save_..> is commented out apart from a truly missing write", () => {
    // The `truceday` case: `<load_truceday=0>` and `bannedKeys: truceday` are
    // live reads, but the two `<save_truceday_..>` writes are toggled off in
    // comments at the bottom of the file. The commented save must not count as a
    // live write (round 2), but it *is* visible proof — so instead of the
    // generic "no <save_..> found", the read is flagged with a message that
    // points at the commented-out write specifically.
    const files = [
      {
        id: "a",
        text:
          "- prefab: Player\n  type: poke, findFactionOfficers\n  objectRpc:\n" +
          "  - name: Message\n    2: string, <msgOfficerScout_truce<eq_1_<load_truceday=0>>>\n\n" +
          "- prefab: fx_siegebomb_explosion\n  type: create\n  bannedKeys: truceday 1\n\n" +
          "# - type: key, bfvrealday 7,14,21\n  # exec: <save_truceday_1>\n\n" +
          "# - type: key, bfvrealday 1;6,8;13,15;20\n  # exec: <save_truceday_0>\n",
      },
    ];
    const problems = runReferenceValidation(files).filter((p) => p.message.includes("truceday"));
    // One per live read: <load_truceday> and bannedKeys: truceday.
    expect(problems).toHaveLength(2);
    for (const p of problems) {
      expect(p).toMatchObject({ severity: "info", kind: "custom-key" });
      expect(p.message).toContain("is read");
      expect(p.message).toContain("commented out");
      // Not the generic "there is no write anywhere" wording.
      expect(p.message).not.toContain("no <save_..> found");
    }
  });

  it("tells a live <save_..> whose only read is commented out apart from a truly unread write", () => {
    // Mirror of the truceday case on the write side.
    const files = [
      {
        id: "a",
        text:
          "- prefab: Beehive\n  type: create\n  command: <save_beacon_1>\n\n" +
          "# - prefab: Chest\n  # type: create\n  # command: <load_beacon=0>\n",
      },
    ];
    const problems = runReferenceValidation(files).filter((p) => p.message.includes("beacon"));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ severity: "info", kind: "custom-key" });
    expect(problems[0].message).toContain("is written");
    expect(problems[0].message).toContain("commented out");
    expect(problems[0].message).not.toContain("never read");
  });

  it("detects a commented-out read in AST field form (# bannedKeys: / # keys: / # type: key), not just <load_..>", () => {
    // The read exists only as a commented-out `bannedKeys:` line, which neither
    // the YAML AST (comment-blind) nor the <load_..> template scan reaches —
    // recovered from raw comment text so the write still gets the "read is
    // commented out" message rather than the generic "never read".
    for (const commentedRead of ["# bannedKeys: beacon 1", "# keys: beacon 1", "# - type: key, beacon 5;10"]) {
      const files = [
        { id: "a", text: `- prefab: Beehive\n  type: create\n  command: <save_beacon_1>\n\n${commentedRead}\n` },
      ];
      const problems = runReferenceValidation(files).filter((p) => p.message.includes("beacon"));
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toContain("is written");
      expect(problems[0].message).toContain("commented out");
      expect(problems[0].message).not.toContain("never read");
    }
  });

  it("does not blank out a '#' that follows real content — e.g. a chat command inside a block scalar", () => {
    // `s Say #hello` is live block-scalar content, not a comment (YAML would
    // only treat a leading or whitespace-preceded '#' as a comment starter on
    // an otherwise-empty line prefix); the write here must still be tracked.
    const files = [
      { id: "a", text: "- prefab: Player\n  type: poke\n  exec: |\n    s Say #hello <save_greeted_1>\n" },
      { id: "b", text: "- prefab: Player\n  type: create\n  keys: greeted 1\n" },
    ];
    expect(runReferenceValidation(files)).toEqual([]);
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
