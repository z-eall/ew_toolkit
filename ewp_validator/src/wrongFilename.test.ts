import { describe, expect, it } from "vitest";
import { runFullValidation } from "./validationPipeline";

// Round 6 ticket 27: a wrongly named file still gets its own checks, but stays out of the
// cross-file checks because EWP skips it.
const BAD_KEY = "- prefab: Player\n  type: say, x\n  bogusKey: 1\n";

describe("wrongly named file", () => {
  it("shows the name problem first, then its own problems", () => {
    const ids = runFullValidation([{ id: "a", name: "notes.yaml", text: BAD_KEY }]).get("a")!.map((p) => p.id);
    expect(ids[0]).toBe("filename-invalid");
    expect(ids.length).toBeGreaterThan(1);
  });

  it("still shows the silent-mistake warnings of its own", () => {
    const text = "- prefab: Player\n  type: say, test\n  objects:\n  - prefab: Boar\n    data: string, TamedName, Rex\n    filters:\n    - int, level, 2\n";
    const ids = runFullValidation([{ id: "a", name: "notes.yaml", text }]).get("a")!.map((p) => p.id);
    expect(ids).toContain("ignored-data-with-filter");
  });

  it("does not let its data names count as defined for other files", () => {
    const definer = "- name: shared_flag\n  int: 1\n";
    const user = "- prefab: Wolf\n  type: create\n  data: shared_flag\n";
    const result = runFullValidation([
      { id: "d", name: "notes.yaml", text: definer },
      { id: "u", name: "expand_prefabs_x.yaml", text: user },
    ]);
    expect(result.get("u")!.some((p) => p.id === "data-reference" && p.severity === "error")).toBe(true);
  });

  it("keeps the name message under 200 characters and says the other notes wait", () => {
    const msg = runFullValidation([{ id: "a", name: "my_notes_2.yaml", text: BAD_KEY }]).get("a")![0]!.message;
    expect(msg.length).toBeLessThan(200);
    expect(msg).toContain("apply after a rename");
  });
});
