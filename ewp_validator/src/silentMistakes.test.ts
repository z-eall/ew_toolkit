// Round 6 ticket 18: the five silent-mistake warnings. Every rule has a bad script that warns and
// a correct twin that stays quiet, so a rule cannot pass by running nothing or by nagging everyone.
import { describe, expect, it } from "vitest";
import { findBadConditionOperator } from "./silentMistakes";
import { runFullValidation } from "./validationPipeline";

const P = "expand_prefabs_a.yaml";

function idsOf(...texts: string[]): string[] {
  const files = texts.map((text, i) => ({ id: `f${i}`, name: P.replace("_a", `_${i}`), text }));
  const out: string[] = [];
  for (const problems of runFullValidation(files).values()) for (const p of problems) out.push(p.id);
  return out;
}
const silent = (ids: string[]) => ids.filter((i) => i.startsWith("silent-"));

describe("rule 1: == or <> in a condition", () => {
  it("finds the bad operators and leaves good ones alone", () => {
    expect(findBadConditionOperator("<int_level> == 3")).toBe("==");
    expect(findBadConditionOperator("<int_level> <> 3")).toBe("<>");
    for (const ok of ["<int_level> = 3", "<int_level> != 3", "<int_level> >= 3", "<int_level> <= 3", "<int_level=0> < 3", "<int_a> = 1 and <int_b> > 2", "'a == b' = <x>", "<int_x> = <int_y>"]) {
      expect(findBadConditionOperator(ok), ok).toBeNull();
    }
  });

  it("warns on a top-level condition", () => {
    const ids = idsOf("- prefab: Boar\n  type: create\n  condition: <int_level> == 3\n  command: s hi\n");
    expect(ids).toContain("silent-condition-operator");
  });

  it("warns on a condition inside objects: too", () => {
    const ids = idsOf("- prefab: Boar\n  type: create\n  objects:\n  - prefab: Wolf\n    condition: <int_level> <> 2\n");
    expect(ids).toContain("silent-condition-operator");
  });

  it("twin: a single = stays quiet", () => {
    expect(silent(idsOf("- prefab: Boar\n  type: create\n  condition: <int_level> = 3\n  command: s hi\n"))).toEqual([]);
  });
});

describe("rule 2: data: write without triggerRules while a type: change waits", () => {
  const watcher = "- prefab: Boar\n  type: change, level\n  command: s changed\n";

  it("warns for an inline write", () => {
    const ids = idsOf("- prefab: Boar\n  type: destroy\n  data: int, level, 3\n" + "\n" + watcher);
    expect(ids).toContain("silent-change-needs-trigger-rules");
  });

  it("warns for a write, and the watcher, in different files, and for a named data entry", () => {
    const ids = idsOf(
      "- prefab: Boar\n  type: create\n  data: strongBoar\n",
      "- name: strongBoar\n  ints:\n  - level, 3\n",
      watcher,
    );
    expect(ids).toContain("silent-change-needs-trigger-rules");
  });

  it("also warns when triggerRules: false is written out", () => {
    const ids = idsOf("- prefab: Boar\n  type: destroy\n  data: int, level, 3\n  triggerRules: false\n" + "\n" + watcher);
    expect(ids).toContain("silent-change-needs-trigger-rules");
  });

  it("twin: triggerRules: true stays quiet", () => {
    expect(silent(idsOf("- prefab: Boar\n  type: destroy\n  data: int, level, 3\n  triggerRules: true\n" + "\n" + watcher))).toEqual([]);
  });

  it("twin: no change rule waiting, or a different key, or a different prefab: quiet", () => {
    expect(silent(idsOf("- prefab: Boar\n  type: destroy\n  data: int, level, 3\n"))).toEqual([]);
    expect(silent(idsOf("- prefab: Boar\n  type: destroy\n  data: int, level, 3\n" + "\n" + "- prefab: Boar\n  type: change, other\n"))).toEqual([]);
    expect(silent(idsOf("- prefab: Boar\n  type: destroy\n  data: int, level, 3\n" + "\n" + "- prefab: Wolf\n  type: change, level\n"))).toEqual([]);
  });
});

describe("rule 3: poke under a prefab-less world-centre trigger without maxDistance", () => {
  it("warns for globalkey, key, time and realtime triggers", () => {
    for (const type of ["globalkey, raidCooldown", "key, someKey", "time, day", "realtime, hour"]) {
      const ids = idsOf(`- type: ${type}\n  poke:\n  - prefab: piece_workbench\n    parameter: raidEnded\n`);
      expect(ids, type).toContain("silent-poke-world-centre");
    }
  });

  it("twin: maxDistance, position or offset on the poke stays quiet", () => {
    for (const extra of ["maxDistance: 10000", "position: 0,0,0", "offset: 0,1,0"]) {
      expect(silent(idsOf(`- type: globalkey, raidCooldown\n  poke:\n  - prefab: piece_workbench\n    ${extra}\n    parameter: raidEnded\n`)), extra).toEqual([]);
    }
  });

  it("twin: event and custom triggers carry a real position, and a rule with a prefab has its own place", () => {
    expect(silent(idsOf("- type: event, foo\n  poke:\n  - prefab: piece_workbench\n    parameter: x\n"))).toEqual([]);
    expect(silent(idsOf("- type: custom, foo\n  poke:\n  - prefab: piece_workbench\n    parameter: x\n"))).toEqual([]);
    expect(silent(idsOf("- prefab: Player\n  type: globalkey, raidCooldown\n  poke:\n  - prefab: piece_workbench\n    parameter: x\n"))).toEqual([]);
  });
});

describe("rule 4: a 4th comma part in a filter is a weight", () => {
  it("warns on filter: int, level, 2,3", () => {
    const ids = idsOf("- prefab: Boar\n  type: create\n  filter: int, level, 2,3\n  data: strongBoar\n");
    expect(ids).toContain("silent-filter-weight-part");
  });

  it("warns inside objects: and in a filters: list", () => {
    expect(idsOf("- prefab: Boar\n  type: create\n  objects:\n  - prefab: Wolf\n    filter: int, level, 2,3\n")).toContain("silent-filter-weight-part");
    expect(idsOf("- prefab: Boar\n  type: create\n  filters:\n  - int, level, 2, 3\n")).toContain("silent-filter-weight-part");
  });

  it("twin: a semicolon range, a normal filter, or a rule with filterLimit stays quiet", () => {
    expect(silent(idsOf("- prefab: Boar\n  type: create\n  filter: int, level, 2;3\n"))).toEqual([]);
    expect(silent(idsOf("- prefab: Boar\n  type: create\n  filter: int, level, 2\n"))).toEqual([]);
    expect(silent(idsOf("- prefab: Boar\n  type: create\n  filters:\n  - int, level, 2, 3\n  filterLimit: 3\n"))).toEqual([]);
  });

  it("twin: a top-level data: write of a typed triple is not a filter", () => {
    expect(silent(idsOf("- prefab: Boar\n  type: create\n  data: int, level, 3\n"))).toEqual([]);
  });
});

describe("rule 5: EWP keys and Valheim global keys are separate stores", () => {
  it("warns when a <save_> key is watched by type: globalkey", () => {
    const ids = idsOf("- prefab: Player\n  type: say, ack\n  exec: <save_raidRank_3>\n\n- type: globalkey, raidRank\n  command: s updated\n");
    expect(ids).toContain("silent-key-store-mix");
  });

  it("warns when a <save_> key is watched by globalKeys:", () => {
    const ids = idsOf("- prefab: Player\n  type: say, ack\n  exec: <save_raidRank_3>\n\n- prefab: Boar\n  type: create\n  globalKeys: raidRank\n");
    expect(ids).toContain("silent-key-store-mix");
  });

  it("warns when setkey X is watched by type: key (the other direction)", () => {
    const ids = idsOf("- prefab: Player\n  type: say, ack\n  command: setkey abc\n\n- type: key, abc\n  command: s updated\n");
    expect(ids).toContain("silent-key-store-mix");
  });

  it("twin: each key read the same way it was written stays quiet", () => {
    expect(silent(idsOf("- prefab: Player\n  type: say, ack\n  exec: <save_raidRank_3>\n\n- type: key, raidRank\n  command: s updated\n"))).toEqual([]);
    expect(silent(idsOf("- prefab: Player\n  type: say, ack\n  command: setkey abc\n\n- type: globalkey, abc\n  command: s updated\n"))).toEqual([]);
  });

  it("twin: a key written both ways is not flagged", () => {
    expect(silent(idsOf("- prefab: Player\n  type: say, ack\n  exec: <save_k_1>\n  command: setkey k\n\n- type: globalkey, k\n- type: key, k\n"))).toEqual([]);
  });

  it("a commented-out write does not count", () => {
    expect(silent(idsOf("# exec: <save_raidRank_3>\n- type: globalkey, raidRank\n  command: s updated\n"))).toEqual([]);
  });
});
