import { describe, expect, it } from "vitest";
import { computeFocusedProblem, type FocusedProblemResult } from "./focusedProblem";
import type { LoadedFile } from "./fileManager";
import type { Problem } from "./structuralPrecheck";

// computeFocusedProblem only ever reads file.id, file.problems, and
// file.model.getPositionAt — a fake covering just that surface stands in for
// a real LoadedFile, same approach as fileManager.test.ts's FakeModel.
function problem(overrides: Partial<Problem> = {}): Problem {
  return { severity: "error", message: "x", branch: "b", range: [0, 1], ...overrides };
}

function fakeFile(id: string, problems: Problem[], lineOf: Record<number, number> = {}): LoadedFile {
  return {
    id,
    name: `${id}.yaml`,
    folder: "",
    problems,
    model: {
      getPositionAt: (offset: number) => ({ lineNumber: lineOf[offset] ?? 1, column: 1 }),
    },
  } as unknown as LoadedFile;
}

describe("computeFocusedProblem", () => {
  it("returns a null key when there is no active file", () => {
    const result = computeFocusedProblem(null, 1, "error", null);
    expect(result).toEqual<FocusedProblemResult>({ key: null, activeTab: "error", changed: false });
  });

  it("returns a null key when no problem is on the cursor's line", () => {
    const file = fakeFile("f1", [problem({ range: [0, 1] })], { 0: 5, 1: 5 });
    const result = computeFocusedProblem(file, 1, "error", null);
    expect(result.key).toBeNull();
    expect(result.changed).toBe(false);
  });

  it("picks the highest-priority problem on the cursor's line", () => {
    const file = fakeFile(
      "f1",
      [problem({ range: [0, 1], severity: "warning" }), problem({ range: [2, 3], severity: "error" })],
      { 0: 1, 1: 1, 2: 1, 3: 1 },
    );
    const result = computeFocusedProblem(file, 1, "error", null);
    expect(result.key).toBe("f1:2");
    expect(result.changed).toBe(true);
  });

  it("does not report a change when the key is unchanged", () => {
    const file = fakeFile("f1", [problem({ range: [0, 1] })], { 0: 1, 1: 1 });
    const result = computeFocusedProblem(file, 1, "error", "f1:0");
    expect(result).toEqual<FocusedProblemResult>({ key: "f1:0", activeTab: "error", changed: false });
  });

  it("follows the winning problem's severity onto its tab when the key changes", () => {
    const file = fakeFile("f1", [problem({ range: [0, 1], severity: "warning" })], { 0: 1, 1: 1 });
    const result = computeFocusedProblem(file, 1, "error", "f1:9");
    expect(result.activeTab).toBe("warning");
    expect(result.changed).toBe(true);
  });

  it("never yanks the user off the 'thisfile' tab", () => {
    const file = fakeFile("f1", [problem({ range: [0, 1], severity: "warning" })], { 0: 1, 1: 1 });
    const result = computeFocusedProblem(file, 1, "thisfile", "f1:9");
    expect(result.activeTab).toBe("thisfile");
  });

  it("does not switch tabs on a re-render where the key hasn't moved (manual tab click stays)", () => {
    const file = fakeFile("f1", [problem({ range: [0, 1], severity: "warning" })], { 0: 1, 1: 1 });
    const result = computeFocusedProblem(file, 1, "error", "f1:0");
    expect(result.activeTab).toBe("error");
    expect(result.changed).toBe(false);
  });
});
