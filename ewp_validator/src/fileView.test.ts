import { describe, expect, it } from "vitest";
import {
  buildTree,
  DEFAULT_UPLOAD_SORT,
  filterFiles,
  folderFromRelativePath,
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
