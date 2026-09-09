import { classifyFileName } from "./fileNameCheck";

export interface Ingestable {
  file: File;
  relPath: string;
}

export interface PreparedFile {
  name: string;
  content: string;
  folder: string;
}

/**
 * Splits YAML-named uploads into ones `classifyFileName` flags as an invalid
 * EWP structural filename vs. the rest. The scripter's own choice (skip/
 * proceed/cancel, via the upload's 3-way confirm modal) decides what happens
 * to `invalid` — this only classifies, it doesn't gate. See
 * validator-main-orchestration ticket 03.
 */
export function classifyUploadEntries(entries: Ingestable[]): { invalid: Ingestable[] } {
  return { invalid: entries.filter((e) => classifyFileName(e.file.name) === "invalid") };
}

/**
 * Which of `prepared`'s files already exist, per `exists` (typically
 * `fileManager.exists`) — the scripter's own choice (overwrite/cancel, via
 * the upload's duplicate confirm modal) decides what happens next. See
 * validator-main-orchestration ticket 03.
 */
export function findDuplicateFiles(
  prepared: PreparedFile[],
  exists: (name: string, folder: string) => boolean,
): PreparedFile[] {
  return prepared.filter((p) => exists(p.name, p.folder));
}

export function fromFileList(list: FileList): Ingestable[] {
  return Array.from(list).map((file) => ({ file, relPath: file.webkitRelativePath || file.name }));
}

// Drag-and-drop can carry whole folders (and multiple at once); walk the entry
// tree so dropped directories become the same folder structure as the picker.
export async function readAllDirEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  // readEntries yields the directory in batches and signals the end with an
  // empty batch, so keep calling until it drains.
  const out: FileSystemEntry[] = [];
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej));
    if (batch.length === 0) return out;
    out.push(...batch);
  }
}

export async function walkEntry(entry: FileSystemEntry, prefix: string, out: Ingestable[]): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej));
    out.push({ file, relPath: prefix + entry.name });
  } else if (entry.isDirectory) {
    const children = await readAllDirEntries((entry as FileSystemDirectoryEntry).createReader());
    for (const child of children) await walkEntry(child, `${prefix}${entry.name}/`, out);
  }
}

export async function fromDataTransfer(dt: DataTransfer): Promise<Ingestable[]> {
  const entries = Array.from(dt.items)
    .map((item) => (item.webkitGetAsEntry ? item.webkitGetAsEntry() : null))
    .filter((e): e is FileSystemEntry => e !== null);
  if (entries.length === 0) return fromFileList(dt.files); // fallback for browsers without the entry API
  const out: Ingestable[] = [];
  for (const entry of entries) await walkEntry(entry, "", out);
  return out;
}
