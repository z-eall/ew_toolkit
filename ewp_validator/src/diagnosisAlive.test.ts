// The "invalid twin" guard (round 6 ticket 04, part f): for every registered diagnosis id there is
// one small bad input that makes the full pipeline emit it. So a check that silently stops
// running turns a red test here, and the many "no problems" tests elsewhere cannot pass by
// running nothing. The inputs live in diagnosisSamples.ts.
import { describe, expect, it } from "vitest";
import { DIAGNOSIS_IDS } from "./diagnosisKinds";
import { DIAGNOSIS_NOT_COVERED as NOT_COVERED, DIAGNOSIS_SAMPLES as CASES } from "./diagnosisSamples";
import { runFullValidation } from "./validationPipeline";

describe("every diagnosis id fires on one bad input", () => {
  it("has a case (or a reason) for every registered id", () => {
    for (const id of DIAGNOSIS_IDS) expect(id in CASES || id in NOT_COVERED, `no bad input for ${id}`).toBe(true);
  });

  for (const id of DIAGNOSIS_IDS) {
    if (id in NOT_COVERED) continue;
    it(`emits ${id}`, () => {
      const c = CASES[id]!;
      const files = c.files.map((f, i) => ({ id: `f${i}`, name: f.name, text: f.text, filenameExempt: f.exempt }));
      const seen = new Set<string>();
      for (const problems of runFullValidation(files).values()) for (const p of problems) seen.add(p.id);
      expect([...seen], `input did not emit ${id}`).toContain(id);
    });
  }
});
