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

// Order two files by folder, keeping the root/loose group ("") last in both
// directions so named folders always lead. `dir` is +1 for A–Z, -1 for Z–A.
function compareFolder(a: ViewFile, b: ViewFile, dir: 1 | -1): number {
  if (a.folder === b.folder) return 0;
  if (a.folder === "") return 1;
  if (b.folder === "") return -1;
  return dir * a.folder.localeCompare(b.folder);
}

export function sortFiles(files: readonly ViewFile[], mode: SortMode): ViewFile[] {
  const byName = (a: ViewFile, b: ViewFile) => a.name.localeCompare(b.name);
  const sorted = [...files];
  // A–Z / Z–A order folders first, then files within each folder (ticket: sort
  // rework). Status sorts stay flat and let buildTree group by first appearance.
  if (mode === "az") return sorted.sort((a, b) => compareFolder(a, b, 1) || byName(a, b));
  if (mode === "za") return sorted.sort((a, b) => compareFolder(a, b, -1) || byName(b, a));
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

/**
 * Pick which id becomes active after removing one or more ids from a
 * currently-displayed order, so the next selection always lands on a visual
 * neighbor of what was removed rather than an arbitrary internal-array
 * survivor (validator-ui-polish: "next item" selection). Scans forward from
 * `pivotIndex` for the first surviving id (the one that visually slides up
 * into the removed spot), then falls back to scanning backward from just
 * before it. `pivotIndex` is the position removal is anchored at — the
 * removed id's own index for a single file, or the first index belonging to
 * a removed folder/batch.
 */
export function pickNextAfterRemoval(
  order: readonly string[],
  removedIds: ReadonlySet<string>,
  pivotIndex: number,
): string | null {
  for (let i = pivotIndex; i < order.length; i++) if (!removedIds.has(order[i])) return order[i];
  for (let i = Math.min(pivotIndex, order.length) - 1; i >= 0; i--) if (!removedIds.has(order[i])) return order[i];
  return null;
}

export interface TreeGroup {
  folder: string;
  files: ViewFile[];
}

// ---------- Save planning ----------

export type SaveScope = "file" | "folder" | "all";

export interface SaveFile {
  name: string;
  folder: string;
  content: string;
}

export interface SavePlan {
  /** "single" downloads the raw file; "zip" packs a folder-structured archive. */
  kind: "single" | "zip";
  /** The download filename handed to the browser. */
  filename: string;
  /** Archive members (one, with a bare name, in the single case). */
  entries: { path: string; content: string }[];
}

const zipPath = (f: SaveFile) => (f.folder ? `${f.folder}/${f.name}` : f.name);

/**
 * Decide what a Save action produces. A lone file downloads raw (no zip, no
 * folder wrapper); anything else packs into a folder-structured zip. Returns
 * null when the scope selects nothing (e.g. "file" with no active file).
 */
export function planSave(files: readonly SaveFile[], scope: SaveScope, active: SaveFile | null): SavePlan | null {
  let selected: SaveFile[];
  if (scope === "all") selected = [...files];
  else if (scope === "file") selected = active ? [active] : [];
  else selected = active ? files.filter((f) => f.folder === active.folder) : [];

  if (selected.length === 0) return null;
  if (selected.length === 1) {
    const only = selected[0];
    return { kind: "single", filename: only.name, entries: [{ path: only.name, content: only.content }] };
  }

  const base = scope === "folder" ? active?.folder || "expand_world" : "expand_world";
  return {
    kind: "zip",
    filename: `${base}.zip`,
    entries: selected.map((f) => ({ path: zipPath(f), content: f.content })),
  };
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
