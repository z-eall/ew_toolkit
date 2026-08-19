import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The real "monaco-editor" package has no "main"/"exports" entry Node can
// resolve outside a bundler (Vite resolves its "module" field; plain Node/
// vitest's node environment can't) — and even resolved, a real editor.create()
// needs a DOM container and canvas this test environment (node, no DOM)
// doesn't have. FileManager's actual surface against monaco is small (Uri.parse,
// editor.createModel, editor.setModelMarkers, MarkerSeverity, and a handful of
// methods on the model/editor it's handed), so a minimal fake covering exactly
// that surface stands in for the whole package.
vi.mock("monaco-editor", () => {
  class FakeModel {
    private value: string;
    private listeners: (() => void)[] = [];
    constructor(content: string) {
      this.value = content;
    }
    getValue() {
      return this.value;
    }
    setValue(v: string) {
      this.value = v;
      for (const l of this.listeners) l();
    }
    onDidChangeContent(cb: () => void) {
      this.listeners.push(cb);
    }
    getPositionAt() {
      return { lineNumber: 1, column: 1 };
    }
    dispose() {}
  }
  return {
    Uri: { parse: (s: string) => s },
    MarkerSeverity: { Error: 8, Warning: 4, Info: 2 },
    editor: {
      createModel: (content: string) => new FakeModel(content),
      setModelMarkers: () => {},
    },
  };
});

import { FileManager, DRAFT_PLACEHOLDER_NAME } from "./fileManager";

// FileManager only ever calls getModel/setModel/revealLineInCenter/setPosition/focus
// on the editor it's given.
function fakeEditor() {
  let model: unknown = null;
  return {
    getModel: () => model,
    setModel: (m: unknown) => {
      model = m;
    },
    revealLineInCenter: () => {},
    setPosition: () => {},
    focus: () => {},
  } as unknown as ConstructorParameters<typeof FileManager>[0];
}

// Regression coverage for the two bugs found and fixed while resolving
// "Review and fix Manual mode's automation gates" (ui-functionality-fixes
// map, ticket 05): a keystroke edit always ran a full revalidation pass
// regardless of mode, and a re-upload of an already-loaded file bypassed
// the Manual-mode defer via the same onContentChanged path.
describe("FileManager manual mode gating", () => {
  let manager: InstanceType<typeof FileManager>;
  let changeCount: number;

  beforeEach(() => {
    changeCount = 0;
    manager = new FileManager(fakeEditor(), () => {
      changeCount++;
    });
    manager.setValidationMode("manual");
  });

  it("does not schedule a revalidation pass on a keystroke edit while Manual mode is on", () => {
    const file = manager.addFile("expand_world_prefabs_test.yaml", "data:\n  - key: value\n");
    expect(manager.status).toBe("stale"); // adding a file is itself deferred in manual mode

    manager.validateNow();
    expect(manager.status).toBe("clean");

    file.model.setValue("data:\n  - key: value2\n");

    // scheduleHybridRevalidation debounces 400ms/1200ms; asserting synchronously
    // (no timers advanced) proves nothing was scheduled that could later run
    // behind the user's back.
    expect(manager.status).toBe("stale");
  });

  it("marks a re-upload of an already-loaded file stale instead of auto-validating", () => {
    manager.upsertUploadedBatch([{ name: "expand_world_prefabs_a.yaml", content: "data:\n  - key: v1\n", folder: "" }]);
    expect(manager.status).toBe("stale");

    // Switch to auto and back to manual to clear "stale" from the initial add,
    // isolating the re-upload's own effect on status.
    manager.setValidationMode("auto");
    expect(manager.status).not.toBe("stale");
    manager.setValidationMode("manual");

    manager.upsertUploadedBatch([{ name: "expand_world_prefabs_a.yaml", content: "data:\n  - key: v2\n", folder: "" }]);
    expect(manager.status).toBe("stale");
  });

  it("only runs a pass when validateNow() is called, in either trigger case", () => {
    const file = manager.addFile("expand_world_prefabs_test.yaml", "data:\n  - key: value\n");
    file.model.setValue("data:\n  - key: value2\n");
    expect(manager.status).toBe("stale");

    manager.validateNow();
    expect(manager.status).toBe("clean");
  });
});

describe("FileManager auto mode hybrid revalidation", () => {
  let manager: InstanceType<typeof FileManager>;
  let changeCount: number;

  beforeEach(() => {
    vi.useFakeTimers();
    changeCount = 0;
    manager = new FileManager(fakeEditor(), () => {
      changeCount++;
    });
    manager.setValidationMode("auto");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not run a validation pass synchronously on a keystroke", () => {
    const file = manager.addFile("expand_world_prefabs_test.yaml", "- prefab: Foo\n");
    const countAfterAdd = changeCount;
    file.model.setValue("- prefab: FooBar\n");
    expect(changeCount).toBe(countAfterAdd);
  });

  it("runs a per-file structural pass after the fast debounce", () => {
    const file = manager.addFile("expand_world_prefabs_test.yaml", "- prefab: Foo\n");
    const countAfterAdd = changeCount;
    file.model.setValue("- prefab: FooBar\n");
    vi.advanceTimersByTime(400);
    expect(changeCount).toBe(countAfterAdd + 1);
  });

  it("runs a full-project pass after the idle debounce", () => {
    const file = manager.addFile("expand_world_prefabs_test.yaml", "- prefab: Foo\n");
    const countAfterAdd = changeCount;
    file.model.setValue("- prefab: FooBar\n");
    vi.advanceTimersByTime(1200);
    expect(changeCount).toBe(countAfterAdd + 2);
  });

  it("cancels pending keystroke validation when switching files", () => {
    manager.addFile("expand_world_prefabs_a.yaml", "- prefab: A\n");
    const b = manager.addFile("expand_world_prefabs_b.yaml", "- prefab: B\n");
    const countAfterAdd = changeCount;
    manager.allFiles[0]!.model.setValue("- prefab: A2\n");
    manager.setActive(b.id);
    expect(changeCount).toBeGreaterThan(countAfterAdd);
    const countAfterSwitch = changeCount;
    vi.advanceTimersByTime(400);
    expect(changeCount).toBe(countAfterSwitch);
  });
});

describe("FileManager rename filename gate", () => {
  let manager: InstanceType<typeof FileManager>;

  beforeEach(() => {
    manager = new FileManager(fakeEditor(), () => {});
  });

  it("surfaces Invalid file in problems immediately after rename in Auto mode", () => {
    manager.setValidationMode("auto");
    const file = manager.addFile("expand_prefabs_test.yaml", "- prefab: Foo\n  type: create\n");
    manager.renameFile(file.id, "not_a_valid_name.yaml");
    expect(file.problems.some((p) => p.branch === "Invalid file")).toBe(true);
  });

  it("surfaces Invalid file after Validate in Manual mode", () => {
    manager.setValidationMode("manual");
    const file = manager.addFile("expand_prefabs_test.yaml", "- prefab: Foo\n  type: create\n");
    manager.validateNow();
    expect(file.problems.some((p) => p.branch === "Invalid file")).toBe(false);
    manager.renameFile(file.id, "not_a_valid_name.yaml");
    expect(manager.mode).toBe("manual");
    expect(manager.status).toBe("stale");
    manager.validateNow();
    expect(file.problems.some((p) => p.branch === "Invalid file")).toBe(true);
  });

  it("applies the filename gate after an ephemeral draft is renamed away from the placeholder", () => {
    manager.setValidationMode("auto");
    const file = manager.addFile(DRAFT_PLACEHOLDER_NAME, "- prefab: Foo\n  type: create\n", "", {
      ephemeral: true,
    });
    expect(file.problems.some((p) => p.branch === "Invalid file")).toBe(false);
    manager.renameFile(file.id, "not_a_valid_name.yaml");
    expect(file.name).toBe("not_a_valid_name.yaml");
    expect(file.problems.some((p) => p.branch === "Invalid file")).toBe(true);
  });

  it("still exempts an unsaved ephemeral draft on the placeholder name", () => {
    manager.setValidationMode("auto");
    const file = manager.addFile(DRAFT_PLACEHOLDER_NAME, "", "", { ephemeral: true });
    expect(file.problems.some((p) => p.branch === "Invalid file")).toBe(false);
  });
});
