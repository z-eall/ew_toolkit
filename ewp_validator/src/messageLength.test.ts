// Hub ticket 31: a soft length check. It lists the messages over the cap and never fails, because
// nobody knows yet whether 160 is a good number. Lower the risk of a slow drift by reading the list.
import { expect, it } from "vitest";
import { DIAGNOSIS_IDS } from "./diagnosisKinds";
import { runFullValidation } from "./validationPipeline";
import { DIAGNOSIS_SAMPLES } from "./diagnosisSamples";

const SOFT_CAP = 160;
const HARD_CAP = 200;

it("keeps every message under the hard cap and lists those over the soft cap", () => {
  const long: string[] = [];
  const tooLong: string[] = [];
  for (const id of DIAGNOSIS_IDS) {
    const c = DIAGNOSIS_SAMPLES[id];
    if (!c) continue;
    const files = c.files.map((f, i) => ({ id: `f${i}`, name: f.name, text: f.text }));
    for (const problems of runFullValidation(files).values()) {
      for (const p of problems) {
        if (p.id !== id) continue;
        if (p.message.length > SOFT_CAP) long.push(`${p.message.length} ${id}`);
        if (p.message.length >= HARD_CAP) tooLong.push(`${p.message.length} ${id}`);
      }
    }
  }
  if (long.length > 0) console.info(`Messages over ${SOFT_CAP} characters:\n${[...new Set(long)].join("\n")}`);
  expect([...new Set(tooLong)]).toEqual([]);
});
