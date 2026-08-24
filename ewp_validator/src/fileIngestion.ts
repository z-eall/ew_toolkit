export interface Ingestable {
  file: File;
  relPath: string;
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
