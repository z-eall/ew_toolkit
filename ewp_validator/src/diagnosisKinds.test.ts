// The diagnosis-kind registry: every emitted problem carries a registered id, and the category
// and severity match the registry.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DIAGNOSIS_CATEGORY_SET } from "./diagnosisCategories";
import { DIAGNOSIS_IDS, DIAGNOSIS_KINDS, kindFields } from "./diagnosisKinds";
import { runFullValidation } from "./validationPipeline";

const sourceFiles = readdirSync(new URL(".", import.meta.url))
  .filter((n) => n.endsWith(".ts") && !n.endsWith(".test.ts") && n !== "diagnosisKinds.ts")
  .map((n) => ({ n, text: readFileSync(new URL(n, import.meta.url), "utf8") }));

describe("diagnosis kind registry", () => {
  it("every kind uses a real filter category", () => {
    for (const id of DIAGNOSIS_IDS) expect(DIAGNOSIS_CATEGORY_SET.has(DIAGNOSIS_KINDS[id].category), id).toBe(true);
  });

  it("kindFields gives the registered category and default severity", () => {
    expect(kindFields("filename-invalid")).toEqual({ id: "filename-invalid", severity: "error", branch: "Invalid file" });
  });

  it("every id in the registry is used by an emitter (no dead ids)", () => {
    const all = sourceFiles.map((f) => f.text).join("\n");
    for (const id of DIAGNOSIS_IDS) expect(all.includes(`"${id}"`), `${id} is never emitted`).toBe(true);
  });

  it("emitters do not write severity or branch by hand beside an id", () => {
    // Hand-typed `branch: <CATEGORY>` in an emit site is how a kind and its category drifted apart before.
    for (const f of sourceFiles) {
      if (f.n === "diagnosisCategories.ts") continue;
      expect(/branch:\s*[A-Z_]+_CATEGORY\b/.test(f.text), `${f.n} hand-writes a branch category`).toBe(false);
    }
  });

  it("problems from a mixed file carry a registered id with matching category and allowed severity", () => {
    const text = [
      "- prefab: Boar",
      "  type: create",
      "  data: undefinedThing",
      "  delay: 5",
      "  objects:",
      "  - filter: a, b",
      "  bogusKey: 1",
      "",
    ].join("\n");
    const files = [
      { id: "a", name: "expand_prefabs_a.yaml", text },
      { id: "b", name: "wrong.yaml", text: "- x: 1\n" },
      { id: "c", name: "expand_data_c.yaml", text: "- name: a\n  ints:\n  - health, 5\n" },
      { id: "d", name: "expand_prefabs_d.yaml", text: "not a list" },
    ];
    const seen = new Set<string>();
    for (const problems of runFullValidation(files).values()) {
      for (const p of problems) {
        seen.add(p.id);
        const k = DIAGNOSIS_KINDS[p.id];
        expect(k, `unregistered id ${p.id}`).toBeDefined();
        expect(p.branch, p.id).toBe(k.category);
        expect([k.severity, ...(k.alsoSeverity ?? [])], p.id).toContain(p.severity);
      }
    }
    expect(seen.size).toBeGreaterThanOrEqual(4);
  });
});
