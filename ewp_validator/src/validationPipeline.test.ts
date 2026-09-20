// The shared pipeline (used by the browser app and the command-line tool) runs every layer.
import { describe, expect, it } from "vitest";
import { runFullValidation } from "./validationPipeline";

const usesData = "- prefab: Boar\n  type: create\n  data: strongBoar\n";
const definesData = "- name: strongBoar\n  ints:\n  - health, 5\n";

describe("runFullValidation", () => {
  it("runs the cross-file reference checks, not only the per-file shape checks", () => {
    const out = runFullValidation([{ id: "a", name: "expand_prefabs_a.yaml", text: usesData }]);
    expect(out.get("a")!.some((p) => p.severity === "error" && /strongBoar/.test(p.message))).toBe(true);
  });

  it("resolves a data entry defined in another file of the same batch", () => {
    const out = runFullValidation([
      { id: "a", name: "expand_prefabs_a.yaml", text: usesData },
      { id: "b", name: "data_b.yaml", text: definesData },
    ]);
    expect(out.get("a")!.filter((p) => p.severity === "error")).toEqual([]);
  });

  it("gates a file whose name is not an EWP file: one filename error, no shape or reference checks", () => {
    const out = runFullValidation([{ id: "a", name: "simple.yaml", text: usesData }]);
    const problems = out.get("a")!;
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toMatch(/Invalid file/);
  });

  it("a draft on the placeholder name is exempt from the filename gate", () => {
    const out = runFullValidation([{ id: "a", name: "unnamed.yaml", text: usesData, filenameExempt: true }]);
    expect(out.get("a")!.some((p) => /Invalid file/.test(p.message))).toBe(false);
  });
});
