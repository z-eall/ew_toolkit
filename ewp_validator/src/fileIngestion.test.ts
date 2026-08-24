import { describe, expect, it } from "vitest";
import { fromDataTransfer, fromFileList } from "./fileIngestion";

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
