// The provenance table (round 6 ticket 16): every diagnosis id says where it came from.
import { describe, expect, it } from "vitest";
import { DIAGNOSIS_IDS } from "./diagnosisKinds";
import { DIAGNOSIS_PROVENANCE } from "./diagnosisProvenance";

const REPOS = ["valheim-expand_world_prefabs/", "valheim-world_edit_commands/"];

describe("provenance table", () => {
  it("has exactly one entry per registered id", () => {
    expect(Object.keys(DIAGNOSIS_PROVENANCE).sort()).toEqual([...DIAGNOSIS_IDS].sort());
  });

  for (const id of DIAGNOSIS_IDS) {
    const p = DIAGNOSIS_PROVENANCE[id];
    it(`${id}: entry is complete for its level (${p.level})`, () => {
      if (p.level === "source" || p.level === "docs") expect(p.files.length, "needs the mod file(s) it rests on").toBeGreaterThan(0);
      if (p.level !== "source" && p.level !== "docs") expect((p.note ?? "").length, "needs a note saying why").toBeGreaterThan(10);
      // Round 6 ticket 23: a rule that says it was read from the mod source or docs must say when.
      if (p.level === "source" || p.level === "docs") expect(p.checked, "a source or docs rule needs a check date").not.toBeNull();
      if (p.checked !== null) expect(p.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (p.checked !== null) expect(p.ewpVersion, "a dated check names the EWP version").not.toBeNull();
      for (const f of p.files) expect(REPOS.some((r) => f.startsWith(r)), `${f} must start with a mirrored repo name`).toBe(true);
    });
  }

  it("a doc-only rule is never an error (AGENTS.md rule 5)", async () => {
    const { DIAGNOSIS_KINDS } = await import("./diagnosisKinds");
    for (const id of DIAGNOSIS_IDS) {
      if (DIAGNOSIS_PROVENANCE[id].level !== "docs") continue;
      const k = DIAGNOSIS_KINDS[id];
      expect([k.severity, ...(k.alsoSeverity ?? [])], id).not.toContain("error");
    }
  });
});
