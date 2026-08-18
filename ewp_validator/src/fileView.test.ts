import { describe, expect, it } from "vitest";
import {
  buildTree,
  DEFAULT_UPLOAD_SORT,
  filterFiles,
  folderFromRelativePath,
  pickNextAfterRemoval,
  planSave,
  type SaveFile,
  sortFiles,
  statusOf,
  type ViewFile,
} from "./fileView";

function vf(id: string, name: string, status: ViewFile["status"], folder = ""): ViewFile {
  return { id, name, folder, status };
}

describe("statusOf", () => {
  it("is error when any error is present, regardless of warnings", () => {
    expect(statusOf(1, 0)).toBe("error");
    expect(statusOf(2, 3)).toBe("error");
  });
  it("is warning when only warnings are present", () => {
    expect(statusOf(0, 1)).toBe("warning");
  });
  it("is valid when clean", () => {
    expect(statusOf(0, 0)).toBe("valid");
  });
});

describe("folderFromRelativePath", () => {
  it("takes the immediate parent directory of a folder-uploaded file", () => {
    expect(folderFromRelativePath("customEWP/expand_world_prefabs_HelloWorld.yaml")).toBe("customEWP");
  });
  it("takes the deepest directory when nested", () => {
    expect(folderFromRelativePath("customEWP/sub/file.yaml")).toBe("sub");
  });
  it("returns empty string for a bare filename (individually picked file)", () => {
    expect(folderFromRelativePath("file.yaml")).toBe("");
    expect(folderFromRelativePath("")).toBe("");
  });
  it("normalizes backslashes and leading/trailing slashes", () => {
    expect(folderFromRelativePath("customEWP\\file.yaml")).toBe("customEWP");
    expect(folderFromRelativePath("/customEWP/file.yaml")).toBe("customEWP");
  });
});

describe("sortFiles", () => {
  const files = [
    vf("1", "beta.yaml", "valid"),
    vf("2", "alpha.yaml", "error"),
    vf("3", "gamma.yaml", "warning"),
    vf("4", "delta.yaml", "error"),
  ];

  it("sorts A-Z by name", () => {
    expect(sortFiles(files, "az").map((f) => f.name)).toEqual([
      "alpha.yaml",
      "beta.yaml",
      "delta.yaml",
      "gamma.yaml",
    ]);
  });
  it("sorts Z-A by name", () => {
    expect(sortFiles(files, "za").map((f) => f.name)).toEqual([
      "gamma.yaml",
      "delta.yaml",
      "beta.yaml",
      "alpha.yaml",
    ]);
  });
  it("errors first, then warning, then valid, name-tiebroken", () => {
    expect(sortFiles(files, "errors").map((f) => f.name)).toEqual([
      "alpha.yaml",
      "delta.yaml",
      "gamma.yaml",
      "beta.yaml",
    ]);
  });
  it("warnings first", () => {
    expect(sortFiles(files, "warnings").map((f) => f.status)).toEqual(["warning", "error", "error", "valid"]);
  });
  it("valid first", () => {
    expect(sortFiles(files, "valid").map((f) => f.status)).toEqual(["valid", "warning", "error", "error"]);
  });
  it("does not mutate the input array", () => {
    const copy = [...files];
    sortFiles(files, "az");
    expect(files).toEqual(copy);
  });

  it("A-Z orders folders alphabetically first, then files within, root/loose group last", () => {
    const mixed = [
      vf("1", "z.yaml", "valid", "beta"),
      vf("2", "a.yaml", "valid", "beta"),
      vf("3", "m.yaml", "valid", "alpha"),
      vf("4", "loose.yaml", "valid", ""),
    ];
    expect(sortFiles(mixed, "az").map((f) => [f.folder, f.name])).toEqual([
      ["alpha", "m.yaml"],
      ["beta", "a.yaml"],
      ["beta", "z.yaml"],
      ["", "loose.yaml"],
    ]);
  });

  it("Z-A reverses folder and file order but still keeps root/loose group last", () => {
    const mixed = [
      vf("1", "a.yaml", "valid", "alpha"),
      vf("2", "z.yaml", "valid", "beta"),
      vf("3", "a.yaml", "valid", "beta"),
      vf("4", "loose.yaml", "valid", ""),
    ];
    expect(sortFiles(mixed, "za").map((f) => [f.folder, f.name])).toEqual([
      ["beta", "z.yaml"],
      ["beta", "a.yaml"],
      ["alpha", "a.yaml"],
      ["", "loose.yaml"],
    ]);
  });
  it("default upload sort is errors-first", () => {
    expect(DEFAULT_UPLOAD_SORT).toBe("errors");
  });
});

describe("filterFiles", () => {
  const files = [vf("1", "a", "error"), vf("2", "b", "warning"), vf("3", "c", "valid")];
  it("keeps only enabled statuses", () => {
    expect(filterFiles(files, new Set(["error"])).map((f) => f.id)).toEqual(["1"]);
    expect(filterFiles(files, new Set(["warning", "valid"])).map((f) => f.id)).toEqual(["2", "3"]);
  });
  it("keeps everything when all statuses enabled", () => {
    expect(filterFiles(files, new Set(["error", "warning", "valid"]))).toHaveLength(3);
  });
});

describe("planSave", () => {
  const sf = (name: string, folder: string, content = "x"): SaveFile => ({ name, folder, content });
  const files = [
    sf("a.yaml", "expand_world", "AA"),
    sf("b.yaml", "expand_world", "BB"),
    sf("loose.yaml", "", "LL"),
  ];

  it("saves the active file raw (no zip, no folder wrapper)", () => {
    const plan = planSave(files, "file", files[0]);
    expect(plan).toEqual({ kind: "single", filename: "a.yaml", entries: [{ path: "a.yaml", content: "AA" }] });
  });

  it("zips a folder's files with the folder as a directory in the archive", () => {
    const plan = planSave(files, "folder", files[0])!;
    expect(plan.kind).toBe("zip");
    expect(plan.filename).toBe("expand_world.zip");
    expect(plan.entries).toEqual([
      { path: "expand_world/a.yaml", content: "AA" },
      { path: "expand_world/b.yaml", content: "BB" },
    ]);
  });

  it("saves a single-member folder raw rather than zipping it", () => {
    const plan = planSave([sf("only.yaml", "solo", "S")], "folder", sf("only.yaml", "solo", "S"));
    expect(plan).toMatchObject({ kind: "single", filename: "only.yaml" });
  });

  it("zips everything for scope 'all', keeping folderless files at the archive root", () => {
    const plan = planSave(files, "all", files[0])!;
    expect(plan.kind).toBe("zip");
    expect(plan.entries.map((e) => e.path)).toEqual(["expand_world/a.yaml", "expand_world/b.yaml", "loose.yaml"]);
  });

  it("returns null when the scope selects nothing", () => {
    expect(planSave([], "all", null)).toBeNull();
    expect(planSave(files, "file", null)).toBeNull();
  });
});

describe("buildTree", () => {
  it("groups files by folder, preserving sorted order for groups and members", () => {
    const files = [
      vf("1", "a.yaml", "error", "customEWP"),
      vf("2", "b.yaml", "warning", "customEWP"),
      vf("3", "c.yaml", "valid", "otherMod"),
    ];
    const tree = buildTree(files);
    expect(tree.map((g) => g.folder)).toEqual(["customEWP", "otherMod"]);
    expect(tree[0].files.map((f) => f.id)).toEqual(["1", "2"]);
  });

  it("puts folderless files in a root group with folder ''", () => {
    const tree = buildTree([vf("1", "loose.yaml", "valid", "")]);
    expect(tree).toEqual([{ folder: "", files: [vf("1", "loose.yaml", "valid", "")] }]);
  });

  it("group order follows first appearance in the (already sorted) list", () => {
    const files = sortFiles(
      [vf("1", "z.yaml", "valid", "A"), vf("2", "a.yaml", "error", "B")],
      "errors",
    );
    // error file (folder B) sorts first, so its group leads
    expect(buildTree(files).map((g) => g.folder)).toEqual(["B", "A"]);
  });
});

describe("pickNextAfterRemoval", () => {
  const order = ["a", "b", "c", "d"];

  it("prefers the item that slides up into the removed spot", () => {
    expect(pickNextAfterRemoval(order, new Set(["b"]), 1)).toBe("c");
  });

  it("falls back to the previous item when the removed one was last", () => {
    expect(pickNextAfterRemoval(order, new Set(["d"]), 3)).toBe("c");
  });

  it("skips past every removed id in a contiguous batch (folder removal)", () => {
    // "b" and "c" removed together (e.g. a whole folder); pivot at "b"'s index
    expect(pickNextAfterRemoval(order, new Set(["b", "c"]), 1)).toBe("d");
  });

  it("falls back past a trailing contiguous batch", () => {
    expect(pickNextAfterRemoval(order, new Set(["c", "d"]), 2)).toBe("b");
  });

  it("returns null when every id is removed", () => {
    expect(pickNextAfterRemoval(order, new Set(order), 0)).toBeNull();
  });

  it("handles a scattered (non-contiguous) removal set, e.g. Clear Invalid", () => {
    // "a" and "c" removed; pivot is the active file "c" at index 2
    expect(pickNextAfterRemoval(order, new Set(["a", "c"]), 2)).toBe("d");
  });
});
