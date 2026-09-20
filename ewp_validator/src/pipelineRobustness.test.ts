// One crashing check must not hide everything else (round 6 ticket 12), and unchanged files must
// not be re-scanned. The real checks are wrapped so a marker word in the text makes them throw
// or lets a test count the calls.
import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({ structural: 0 }));

vi.mock("./structuralPrecheck", async (orig) => {
  const real = await orig<typeof import("./structuralPrecheck")>();
  return {
    ...real,
    runStructuralPrecheck: (text: string) => {
      calls.structural++;
      if (text.includes("STRUCT_BOOM")) throw new Error("boom");
      return real.runStructuralPrecheck(text);
    },
  };
});
vi.mock("./referenceValidation", async (orig) => {
  const real = await orig<typeof import("./referenceValidation")>();
  return {
    ...real,
    runReferenceValidation: (files: Array<{ id: string; text: string }>) => {
      if (files.some((f) => f.text.includes("REF_BOOM"))) throw new Error("boom");
      return real.runReferenceValidation(files);
    },
  };
});

import { runFullValidation } from "./validationPipeline";

const good = "- prefab: Boar\n  type: create\n  data: missingData\n";
const P = (n: string) => `expand_prefabs_${n}.yaml`;

beforeEach(() => {
  calls.structural = 0;
});

describe("a crashing check", () => {
  it("in the per-file scan gives that file one plain diagnosis and leaves the others alone", () => {
    const out = runFullValidation([
      { id: "bad", name: P("bad"), text: "- prefab: Boar\n# STRUCT_BOOM\n" },
      { id: "ok", name: P("ok"), text: good },
    ]);
    expect(out.get("bad")!.map((p) => p.id)).toEqual(["check-crashed"]);
    expect(out.get("ok")!.some((p) => p.id === "data-reference" && p.severity === "error")).toBe(true);
  });

  it("in the cross-file check marks only the crashing file; the rest still get reference checks", () => {
    const out = runFullValidation([
      { id: "bad", name: P("bad2"), text: "- prefab: Boar\n  type: create\n# REF_BOOM\n" },
      { id: "ok", name: P("ok2"), text: good },
    ]);
    expect(out.get("bad")!.some((p) => p.id === "check-crashed")).toBe(true);
    expect(out.get("ok")!.some((p) => p.id === "data-reference" && p.severity === "error")).toBe(true);
    expect(out.get("ok")!.some((p) => p.id === "check-crashed")).toBe(false);
  });

  it("is not remembered: the crash shows again on the next run", () => {
    const f = [{ id: "bad", name: P("bad3"), text: "# STRUCT_BOOM\n- prefab: Boar\n" }];
    expect(runFullValidation(f).get("bad")![0]!.id).toBe("check-crashed");
    expect(runFullValidation(f).get("bad")![0]!.id).toBe("check-crashed");
  });
});

describe("per-file scan cache", () => {
  it("re-scans only the file whose text changed", () => {
    const files = Array.from({ length: 5 }, (_, i) => ({ id: `c${i}`, name: P(`cache${i}`), text: `- prefab: Boar${i}\n  type: create\n` }));
    runFullValidation(files);
    expect(calls.structural).toBe(5);
    runFullValidation(files);
    expect(calls.structural).toBe(5); // nothing changed, nothing re-scanned
    runFullValidation(files.map((f, i) => (i === 2 ? { ...f, text: f.text + "  chance: 0.5\n" } : f)));
    expect(calls.structural).toBe(6); // exactly the edited one
  });

  it("does not let one run's added reference problems leak into the next run", () => {
    const f = [{ id: "leak", name: P("leak"), text: good }];
    const first = runFullValidation(f).get("leak")!.length;
    const second = runFullValidation(f).get("leak")!.length;
    expect(second).toBe(first);
  });
});
