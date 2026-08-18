// Multi-file state for the ticket 11 "sidebar + Problems panel" layout.
// Each loaded file gets its own Monaco model. Two validation passes run on
// every change: the ticket 10 structural pre-check (per-file, no coupling)
// and the ticket 06 reference validation (cross-file by nature — a change in
// one file can make a `data:` reference in another valid or invalid — so it
// always re-runs across every loaded file, not just the one that changed).
import * as monaco from "monaco-editor";
import { runReferenceValidation } from "./referenceValidation";
import { pickHighestPriority, runStructuralPrecheck, type Problem, type Severity } from "./structuralPrecheck";

export interface LoadedFile {
  id: string;
  name: string;
  /** Immediate parent folder for the sidebar tree; "" for an individually-picked file. */
  folder: string;
  model: monaco.editor.ITextModel;
  problems: Problem[];
  /**
   * A file materialised by typing into the empty editor (not the "+ Add a file"
   * button, not an upload). Emptying it again undoes the creation — until it has
   * been saved at least once, after which it is kept like any other file.
   */
  ephemeral: boolean;
  /** True once the file has been included in a Save. Protects an ephemeral file from auto-removal. */
  savedOnce: boolean;
  /** Unsaved edits since the last save/load — drives the "save before leaving" prompt. */
  dirty: boolean;
}

interface AddOptions {
  ephemeral?: boolean;
  dirty?: boolean;
  /** Skip the ` (n)` collision suffix — used for uploads, which resolve duplicates by overwrite/cancel instead. */
  unique?: boolean;
}

const SEVERITY_TO_MARKER: Record<Severity, monaco.MarkerSeverity> = {
  error: monaco.MarkerSeverity.Error,
  warning: monaco.MarkerSeverity.Warning,
  info: monaco.MarkerSeverity.Info,
};

const MARKER_OWNER = "ewp-toolkit";
const VALIDATE_DEBOUNCE_MS = 200;

const REFERENCE_BRANCH_LABEL: Record<"data-reference" | "custom-key" | "data-function", string> = {
  "data-reference": "data.yaml reference",
  "custom-key": "custom saved key",
  "data-function": "object data",
};

export class FileManager {
  private files: LoadedFile[] = [];
  private activeId: string | null = null;
  private nextId = 1;
  private debounceHandle: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private editor: monaco.editor.IStandaloneCodeEditor,
    private onChange: () => void,
  ) {}

  get activeFile(): LoadedFile | null {
    return this.files.find((f) => f.id === this.activeId) ?? null;
  }

  get allFiles(): readonly LoadedFile[] {
    return this.files;
  }

  addFile(name: string, content: string, folder = "", opts: AddOptions = {}): LoadedFile {
    const finalName = opts.unique === false ? name : this.uniqueName(name, folder);
    const id = `f${this.nextId++}`;
    const uri = monaco.Uri.parse(`file:///loaded/${id}/${encodeURIComponent(finalName)}`);
    const model = monaco.editor.createModel(content, "yaml", uri);
    const file: LoadedFile = {
      id,
      name: finalName,
      folder,
      model,
      problems: [],
      ephemeral: !!opts.ephemeral,
      savedOnce: false,
      dirty: !!opts.dirty,
    };
    this.files.push(file);
    model.onDidChangeContent(() => this.onContentChanged(file));
    this.revalidateAll();
    if (this.activeId === null) this.setActive(id);
    else this.onChange();
    return file;
  }

  /**
   * Overwrite the file with the same name+folder if one exists, else add it.
   * Uploads take this path (no ` (n)` suffixing); the caller has already
   * confirmed any overwrite with the user.
   */
  upsertUploaded(name: string, content: string, folder: string): LoadedFile {
    const existing = this.files.find((f) => f.name === name && f.folder === folder);
    if (existing) {
      existing.model.setValue(content);
      existing.dirty = false;
      this.revalidateAll();
      this.onChange();
      return existing;
    }
    return this.addFile(name, content, folder, { dirty: false, unique: false });
  }

  /** True if a loaded file already occupies this name within this folder. */
  exists(name: string, folder: string): boolean {
    return this.files.some((f) => f.name === name && f.folder === folder);
  }

  /**
   * Re-file a loaded file under a different folder (drag-to-folder). Renamed
   * with a `(n)` suffix if the destination folder already has that name —
   * names are only guaranteed unique within a folder, not globally.
   */
  moveToFolder(id: string, folder: string): void {
    const file = this.files.find((f) => f.id === id);
    if (!file || file.folder === folder) return;
    file.name = this.uniqueName(file.name, folder, id);
    file.folder = folder;
    this.onChange();
  }

  /**
   * Remove every loaded file in `folder` (the folder-row × action). The caller
   * confirms first. Re-validates because a dropped folder's data.yaml entries
   * may have been the only definition/write behind references in other folders.
   */
  removeFilesInFolder(folder: string): void {
    const inFolder = this.files.filter((f) => f.folder === folder);
    if (inFolder.length === 0) return;
    const activeRemoved = inFolder.some((f) => f.id === this.activeId);
    for (const f of inFolder) f.model.dispose();
    this.files = this.files.filter((f) => f.folder !== folder);
    this.revalidateAll();
    if (activeRemoved) this.setActive(this.files[0]?.id ?? null);
    else this.onChange();
  }

  /** Drop every loaded file (the trash action). The caller confirms first. */
  clearAll(): void {
    for (const f of this.files) f.model.dispose();
    this.files = [];
    this.activeId = null;
    this.editor.setModel(null);
    this.onChange();
  }

  /** Mark the given files saved: protects ephemerals and clears their unsaved flag. */
  markSaved(ids: readonly string[]): void {
    for (const id of ids) {
      const f = this.files.find((x) => x.id === id);
      if (f) {
        f.savedOnce = true;
        f.dirty = false;
      }
    }
    this.onChange();
  }

  /** True if any file with content still has unsaved edits (drives leave prompts). */
  hasUnsavedWork(): boolean {
    return this.files.some((f) => f.dirty && f.model.getValue().trim() !== "");
  }

  private onContentChanged(file: LoadedFile): void {
    // An ephemeral, never-saved file emptied back out undoes its own creation.
    // Deferred a tick so we don't dispose the model from inside its change event.
    if (file.ephemeral && !file.savedOnce && file.model.getValue().trim() === "") {
      setTimeout(() => {
        if (this.files.includes(file) && file.model.getValue().trim() === "") this.removeFile(file.id);
      }, 0);
      return;
    }
    file.dirty = true;
    this.scheduleRevalidateAll();
  }

  removeFile(id: string) {
    const idx = this.files.findIndex((f) => f.id === id);
    if (idx === -1) return;
    const [removed] = this.files.splice(idx, 1);
    removed.model.dispose();
    this.revalidateAll(); // a removed file's data.yaml entries/keys may have been the only definition/write for something
    if (this.activeId === id) {
      const next = this.files[idx] ?? this.files[idx - 1] ?? null;
      this.setActive(next?.id ?? null);
    } else {
      this.onChange();
    }
  }

  setActive(id: string | null) {
    this.activeId = id;
    const file = this.activeFile;
    const nextModel = file ? file.model : null;
    // Skip the setModel when it's already showing — re-setting the same model
    // instance would stomp the caret/selection (matters when adopting a draft).
    if (this.editor.getModel() !== nextModel) this.editor.setModel(nextModel);
    this.onChange();
  }

  /**
   * Turn an existing model into a tracked file. Used to promote the editor's
   * throwaway draft model on the first keystroke without swapping models — a
   * swap mid-keystroke drops the rest of the input.
   */
  adoptModel(model: monaco.editor.ITextModel, name: string, folder = "", opts: AddOptions = {}): LoadedFile {
    const finalName = opts.unique === false ? name : this.uniqueName(name, folder);
    const id = `f${this.nextId++}`;
    const file: LoadedFile = {
      id,
      name: finalName,
      folder,
      model,
      problems: [],
      ephemeral: !!opts.ephemeral,
      savedOnce: false,
      dirty: !!opts.dirty,
    };
    this.files.push(file);
    model.onDidChangeContent(() => this.onContentChanged(file));
    this.revalidateAll();
    if (this.activeId === null) this.setActive(id);
    else this.onChange();
    return file;
  }

  /** Rename a loaded file. Blank names are rejected; collisions get a `(n)` suffix from (1). */
  renameFile(id: string, rawName: string): void {
    const file = this.files.find((f) => f.id === id);
    if (!file) return;
    const trimmed = rawName.trim();
    if (trimmed === "" || trimmed === file.name) {
      this.onChange();
      return;
    }
    file.name = this.uniqueName(trimmed, file.folder, id);
    this.onChange();
  }

  /** Switch to `fileId` and move the cursor to the character offset within its model. */
  revealProblem(fileId: string, offset: number) {
    const file = this.files.find((f) => f.id === fileId);
    if (!file) return;
    this.setActive(fileId);
    const pos = file.model.getPositionAt(offset);
    this.editor.revealLineInCenter(pos.lineNumber);
    this.editor.setPosition(pos);
    this.editor.focus();
  }

  /**
   * Switch to `fileId` and jump to its highest-priority problem
   * (error > warning > flag, earliest offset within a severity). Opening a file
   * from the sidebar should land the cursor on the first thing worth reading.
   */
  revealTopProblem(fileId: string) {
    this.setActive(fileId);
    const file = this.files.find((f) => f.id === fileId);
    if (!file) return;
    const top = pickHighestPriority(file.problems, (a, b) => a.range[0] - b.range[0]);
    if (top) this.revealProblem(fileId, top.range[0]);
  }

  private scheduleRevalidateAll() {
    clearTimeout(this.debounceHandle);
    this.debounceHandle = setTimeout(() => {
      this.revalidateAll();
      this.onChange();
    }, VALIDATE_DEBOUNCE_MS);
  }

  private revalidateAll() {
    for (const file of this.files) {
      file.problems = runStructuralPrecheck(file.model.getValue());
    }

    const refProblems = runReferenceValidation(this.files.map((f) => ({ id: f.id, text: f.model.getValue() })));
    for (const rp of refProblems) {
      const file = this.files.find((f) => f.id === rp.fileId);
      if (!file) continue;
      file.problems.push({
        severity: rp.severity,
        message: rp.message,
        branch: REFERENCE_BRANCH_LABEL[rp.kind],
        range: rp.range,
      });
    }

    for (const file of this.files) this.applyMarkers(file);
  }

  private applyMarkers(file: LoadedFile) {
    const markers: monaco.editor.IMarkerData[] = file.problems.map((p) => {
      const start = file.model.getPositionAt(p.range[0]);
      const end = file.model.getPositionAt(Math.max(p.range[1], p.range[0] + 1));
      return {
        severity: SEVERITY_TO_MARKER[p.severity],
        message: p.message,
        startLineNumber: start.lineNumber,
        startColumn: start.column,
        endLineNumber: end.lineNumber,
        endColumn: end.column,
      };
    });
    monaco.editor.setModelMarkers(file.model, MARKER_OWNER, markers);
  }

  /**
   * A name not already used within `folder`, suffixed `(n)` from (1) on
   * collision. Scoped per-folder to match `exists`/`upsertUploaded` — two
   * different folders can each hold their own `unnamed.yaml`.
   */
  private uniqueName(name: string, folder: string, exceptId?: string): string {
    const existing = new Set(
      this.files.filter((f) => f.id !== exceptId && f.folder === folder).map((f) => f.name),
    );
    if (!existing.has(name)) return name;
    const dot = name.lastIndexOf(".");
    const base = dot === -1 ? name : name.slice(0, dot);
    const ext = dot === -1 ? "" : name.slice(dot);
    let n = 1;
    while (existing.has(`${base}(${n})${ext}`)) n++;
    return `${base}(${n})${ext}`;
  }

  /** A folder name not already in use, suffixed `(n)` from (1) on collision. */
  uniqueFolderName(name: string): string {
    const existing = new Set(this.files.map((f) => f.folder));
    if (!existing.has(name)) return name;
    let n = 1;
    while (existing.has(`${name}(${n})`)) n++;
    return `${name}(${n})`;
  }
}

export function errorCount(file: LoadedFile): number {
  return file.problems.filter((p) => p.severity === "error").length;
}
export function warningCount(file: LoadedFile): number {
  return file.problems.filter((p) => p.severity === "warning").length;
}
