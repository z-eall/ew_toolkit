// View-layer helpers for the sidebar file panel (ticket 13): a file's rolled-up
// status, folder grouping for the upload tree, and the sort/filter model behind
// the funnel menu. Kept pure and DOM-free so the ordering rules are unit-tested
// here rather than probed through the rendered panel.

export type FileStatus = "error" | "warning" | "valid";

export interface ViewFile {
  id: string;
  name: string;
  /** Immediate parent folder for the upload tree; "" for an individually-picked file. */
  folder: string;
  status: FileStatus;
}

export type SortMode = "az" | "za" | "errors" | "warnings" | "valid";

/** The one-time sort applied every time files are added (Error > Warning > Valid). */
export const DEFAULT_UPLOAD_SORT: SortMode = "errors";

export function statusOf(errors: number, warnings: number): FileStatus {
  if (errors > 0) return "error";
  if (warnings > 0) return "warning";
  return "valid";
}

/**
 * The folder to indent a file under: the deepest directory of its upload path.
 * `customEWP/expand_world_prefabs_HelloWorld.yaml` -> `customEWP`. A bare
 * filename (an individually-picked file has no path) -> "" (root level).
 */
export function folderFromRelativePath(relativePath: string): string {
  const parts = relativePath.replace(/\\/g, "/").split("/").filter(Boolean);
  if (parts.length < 2) return "";
  return parts[parts.length - 2];
}

const STATUS_ORDER: Record<SortMode, FileStatus[]> = {
  az: [],
  za: [],
  errors: ["error", "warning", "valid"],
  warnings: ["warning", "error", "valid"],
  valid: ["valid", "warning", "error"],
};

export function sortFiles(files: readonly ViewFile[], mode: SortMode): ViewFile[] {
  const byName = (a: ViewFile, b: ViewFile) => a.name.localeCompare(b.name);
  const sorted = [...files];
  if (mode === "az") return sorted.sort(byName);
  if (mode === "za") return sorted.sort((a, b) => byName(b, a));
  const rank = STATUS_ORDER[mode];
  return sorted.sort((a, b) => {
    const ra = rank.indexOf(a.status);
    const rb = rank.indexOf(b.status);
    return ra !== rb ? ra - rb : byName(a, b);
  });
}

export function filterFiles(files: readonly ViewFile[], enabled: ReadonlySet<FileStatus>): ViewFile[] {
  return files.filter((f) => enabled.has(f.status));
}

export interface TreeGroup {
  folder: string;
  files: ViewFile[];
}

/** Group into one level of folders, preserving the incoming (already sorted) order. */
export function buildTree(files: readonly ViewFile[]): TreeGroup[] {
  const groups: TreeGroup[] = [];
  const byFolder = new Map<string, TreeGroup>();
  for (const f of files) {
    let g = byFolder.get(f.folder);
    if (!g) {
      g = { folder: f.folder, files: [] };
      byFolder.set(f.folder, g);
      groups.push(g);
    }
    g.files.push(f);
  }
  return groups;
}
