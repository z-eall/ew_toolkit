import { describe, expect, it } from "vitest";
import { classifyUploadEntries, findDuplicateFiles, fromDataTransfer, fromFileList } from "./fileIngestion";

// Hand-written fakes covering just the File/DataTransfer/FileSystemEntry
// surface these functions actually read — the project's vitest config runs
// in environment: "node" (no jsdom/real browser), and adding one wasn't
// judged worth it for this cluster (see validator-main-orchestration map).

function fakeFile(name: string): File {
  return { name } as File;
}

function fakeFileList(files: { file: File; webkitRelativePath?: string }[]): FileList {
  const list = files.map(({ file, webkitRelativePath }) =>
    Object.assign(file, { webkitRelativePath: webkitRelativePath ?? "" }),
  );
  return {
    length: list.length,
    item: (i: number) => list[i] ?? null,
    [Symbol.iterator]: () => list[Symbol.iterator](),
  } as unknown as FileList;
}

function fakeFileEntry(name: string): FileSystemEntry {
  return {
    isFile: true,
    isDirectory: false,
    name,
    file: (resolve: (f: File) => void) => resolve(fakeFile(name)),
  } as unknown as FileSystemEntry;
}

function fakeDirEntry(name: string, children: FileSystemEntry[]): FileSystemEntry {
  return {
    isFile: false,
    isDirectory: true,
    name,
    createReader: () => {
      let drained = false;
      return {
        readEntries: (resolve: (entries: FileSystemEntry[]) => void) => {
          if (drained) return resolve([]);
          drained = true;
          resolve(children);
        },
      };
    },
  } as unknown as FileSystemEntry;
}

function fakeDataTransfer(entries: FileSystemEntry[] | null, fallbackFiles: File[] = []): DataTransfer {
  return {
    items: (entries ?? []).map((entry) => ({ webkitGetAsEntry: () => entry })),
    files: fakeFileList(fallbackFiles.map((file) => ({ file }))),
  } as unknown as DataTransfer;
}

describe("fromFileList", () => {
  it("maps each file to its relPath, preferring webkitRelativePath over the bare name", () => {
    const list = fakeFileList([
      { file: fakeFile("a.yaml") },
      { file: fakeFile("b.yaml"), webkitRelativePath: "folder/b.yaml" },
    ]);
    expect(fromFileList(list)).toEqual([
      { file: expect.objectContaining({ name: "a.yaml" }), relPath: "a.yaml" },
      { file: expect.objectContaining({ name: "b.yaml" }), relPath: "folder/b.yaml" },
    ]);
  });
});

describe("fromDataTransfer", () => {
  it("falls back to the flat file list when the entry API yields nothing", async () => {
    const dt = fakeDataTransfer(null, [fakeFile("a.yaml")]);
    const result = await fromDataTransfer(dt);
    expect(result).toEqual([{ file: expect.objectContaining({ name: "a.yaml" }), relPath: "a.yaml" }]);
  });

  it("walks a flat file entry", async () => {
    const dt = fakeDataTransfer([fakeFileEntry("a.yaml")]);
    const result = await fromDataTransfer(dt);
    expect(result).toEqual([{ file: expect.objectContaining({ name: "a.yaml" }), relPath: "a.yaml" }]);
  });

  it("walks a directory entry into a prefixed relPath, recursing into nested folders", async () => {
    const dt = fakeDataTransfer([
      fakeDirEntry("expand_world", [fakeFileEntry("a.yaml"), fakeDirEntry("nested", [fakeFileEntry("b.yaml")])]),
    ]);
    const result = await fromDataTransfer(dt);
    expect(result).toEqual(
      expect.arrayContaining([
        { file: expect.objectContaining({ name: "a.yaml" }), relPath: "expand_world/a.yaml" },
        { file: expect.objectContaining({ name: "b.yaml" }), relPath: "expand_world/nested/b.yaml" },
      ]),
    );
    expect(result).toHaveLength(2);
  });
});

describe("classifyUploadEntries", () => {
  it("flags entries whose filename doesn't match an EWP structural pattern", () => {
    const entries = [
      { file: fakeFile("expand_prefabs_foo.yaml"), relPath: "expand_prefabs_foo.yaml" },
      { file: fakeFile("notes.yaml"), relPath: "notes.yaml" },
    ];
    const { invalid } = classifyUploadEntries(entries);
    expect(invalid).toEqual([expect.objectContaining({ relPath: "notes.yaml" })]);
  });

  it("flags nothing when every entry matches", () => {
    const entries = [{ file: fakeFile("expand_prefabs_foo.yaml"), relPath: "expand_prefabs_foo.yaml" }];
    expect(classifyUploadEntries(entries).invalid).toEqual([]);
  });
});

describe("findDuplicateFiles", () => {
  it("returns only the prepared files the exists callback reports as already loaded", () => {
    const prepared = [
      { name: "a.yaml", content: "", folder: "" },
      { name: "b.yaml", content: "", folder: "sub" },
    ];
    const exists = (name: string, folder: string) => name === "a.yaml" && folder === "";
    expect(findDuplicateFiles(prepared, exists)).toEqual([{ name: "a.yaml", content: "", folder: "" }]);
  });

  it("returns an empty list when nothing exists yet", () => {
    const prepared = [{ name: "a.yaml", content: "", folder: "" }];
    expect(findDuplicateFiles(prepared, () => false)).toEqual([]);
  });
});
