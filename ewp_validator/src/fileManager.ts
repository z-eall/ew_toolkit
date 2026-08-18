// Multi-file state for the ticket 11 "sidebar + Problems panel" layout.
// Each loaded file gets its own Monaco model. Two validation passes run on
// every change: the ticket 10 structural pre-check (per-file, no coupling)
// and the ticket 06 reference validation (cross-file by nature — a change in
// one file can make a `data:` reference in another valid or invalid — so it
// always re-runs across every loaded file, not just the one that changed).
// The typing debounce always runs both passes; add/remove/upload can be
// deferred in "manual" validation mode (see ValidationMode) so loading or
// rearranging a big batch doesn't re-scan the whole file set once per file.
import * as monaco from "monaco-editor";
import { checkFileName } from "./fileNameCheck";
import { runReferenceValidation } from "./referenceValidation";
import { CUSTOM_KEY_CATEGORY, DATA_REFERENCE_CATEGORY, OBJECT_DATA_CATEGORY } from "./diagnosisCategories";
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

/**
 * Auto validates on every add/remove/move (plus the existing typing debounce,
 * unaffected by this switch). Manual defers the add/remove-triggered pass —
 * meant for loading/rearranging a big batch as one task before checking it —
 * and leaves `validationStatus` "stale" until the user calls `validateNow()`.
 */
export type ValidationMode = "auto" | "manual";
/** "none" = never validated yet; "clean" = matches the current file set; "stale" = an add/remove was deferred since the last pass. */
export type ValidationStatus = "none" | "clean" | "stale";

const SEVERITY_TO_MARKER: Record<Severity, monaco.MarkerSeverity> = {
  error: monaco.MarkerSeverity.Error,
  warning: monaco.MarkerSeverity.Warning,
  info: monaco.MarkerSeverity.Info,
};

const MARKER_OWNER = "ewp-toolkit";
const VALIDATE_DEBOUNCE_MS = 200;

const REFERENCE_BRANCH_LABEL: Record<"data-reference" | "custom-key" | "legacy-object-data", string> = {
  "data-reference": DATA_REFERENCE_CATEGORY,
  "custom-key": CUSTOM_KEY_CATEGORY,
  "legacy-object-data": OBJECT_DATA_CATEGORY,
};

export class FileManager {
  private files: LoadedFile[] = [];
  private activeId: string | null = null;
  private nextId = 1;
  private debounceHandle: ReturnType<typeof setTimeout> | undefined;
  private validationMode: ValidationMode = "auto";
  private validationStatus: ValidationStatus = "none";

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

  get mode(): ValidationMode {
    return this.validationMode;
  }

  get status(): ValidationStatus {
    return this.validationStatus;
  }

  /** Whether clicking Validate right now would do anything — single-sourced so the button's disabled state and its click guard can't drift apart. */
  get canValidateNow(): boolean {
    return this.validationMode === "manual" && this.files.length > 0;
  }

  /** Switching back to auto immediately runs a deferred pass so nothing is left stale. */
  setValidationMode(mode: ValidationMode): void {
    this.validationMode = mode;
    if (mode === "auto" && this.validationStatus === "stale") this.revalidateAll();
    this.onChange();
  }

  /** The Validate button's action: run the full pass on demand, regardless of mode. */
  validateNow(): void {
    this.revalidateAll();
    this.onChange();
  }

  /** Runs the pass in auto mode; in manual mode, defers it and marks status "stale" instead. */
  private revalidateOrDefer(): void {
    if (this.validationMode === "manual") {
      this.validationStatus = "stale";
      return;
    }
    this.revalidateAll();
  }

  /**
   * The shape every add/remove-adjacent mutator ends with: run (or defer)
   * the validation pass, then either activate the given fallback file (first
   * file loaded into an empty panel) or just re-render. Shared so the two
   * halves can't drift out of sync at one call site but not another.
   */
  private revalidateThenSettle(fallbackId: string | null): void {
    this.revalidateOrDefer();
    if (this.activeId === null && fallbackId !== null) this.setActive(fallbackId);
    else this.onChange();
  }

  private createFile(name: string, content: string, folder: string, opts: AddOptions): LoadedFile {
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
    return file;
  }

  addFile(name: string, content: string, folder = "", opts: AddOptions = {}): LoadedFile {
    const file = this.createFile(name, content, folder, opts);
    this.revalidateThenSettle(file.id);
    return file;
  }

  /**
   * Add or overwrite a whole batch of uploaded files as one unit: every file
   * lands before a single validation pass runs (or is deferred, in manual
   * mode) — not one pass per file, which used to make a big upload re-scan
   * an ever-growing file set once per file added.
   */
  upsertUploadedBatch(entries: { name: string; content: string; folder: string }[]): LoadedFile[] {
    const results: LoadedFile[] = [];
    for (const { name, content, folder } of entries) {
      const existing = this.files.find((f) => f.name === name && f.folder === folder);
      if (existing) {
        existing.model.setValue(content);
        existing.dirty = false;
        results.push(existing);
      } else {
        results.push(this.createFile(name, content, folder, { dirty: false, unique: false }));
      }
    }
    this.revalidateThenSettle(results.length > 0 ? results[0].id : null);
    return results;
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
    this.revalidateOrDefer();
    if (activeRemoved) this.setActive(this.files[0]?.id ?? null);
    else this.onChange();
  }

  /** Drop every loaded file (the trash action). The caller confirms first. */
  clearAll(): void {
    for (const f of this.files) f.model.dispose();
    this.files = [];
    this.activeId = null;
    this.validationStatus = "none";
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
    this.revalidateOrDefer(); // a removed file's data.yaml entries/keys may have been the only definition/write for something
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
    this.revalidateThenSettle(id);
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
    // Filename gate (ticket 13 round 4): an "Invalid file" name skips both
    // diagnosis passes entirely — it isn't an EWP structural file, so its
    // shape and its data/key namespace shouldn't count. A legacy `expand_data*`
    // name still gets fully scanned, just with an added rename notice. An
    // unsaved draft (ephemeral, never saved) is exempt: it's an in-progress
    // buffer named `unnamed.yaml`, not a claimed EWP file.
    const scannable: LoadedFile[] = [];
    for (const file of this.files) {
      const isDraft = file.ephemeral && !file.savedOnce;
      const nameCheck = isDraft ? null : checkFileName(file.name);
      if (nameCheck && nameCheck.verdict === "invalid") {
        file.problems = nameCheck.problem ? [nameCheck.problem] : [];
        continue;
      }
      file.problems = runStructuralPrecheck(file.model.getValue());
      if (nameCheck && nameCheck.problem) file.problems.push(nameCheck.problem);
      scannable.push(file);
    }

    const refProblems = runReferenceValidation(scannable.map((f) => ({ id: f.id, text: f.model.getValue() })));
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
    this.validationStatus = "clean";
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
