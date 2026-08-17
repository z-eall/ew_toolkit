// Multi-file state for the ticket 11 "sidebar + Problems panel" layout.
// Each loaded file gets its own Monaco model. Two validation passes run on
// every change: the ticket 10 structural pre-check (per-file, no coupling)
// and the ticket 06 reference validation (cross-file by nature — a change in
// one file can make a `data:` reference in another valid or invalid — so it
// always re-runs across every loaded file, not just the one that changed).
import * as monaco from "monaco-editor";
import { runReferenceValidation } from "./referenceValidation";
import { runStructuralPrecheck, type Problem, type Severity } from "./structuralPrecheck";

export interface LoadedFile {
  id: string;
  name: string;
  /** Immediate parent folder for the sidebar tree; "" for an individually-picked file. */
  folder: string;
  model: monaco.editor.ITextModel;
  problems: Problem[];
}

const SEVERITY_TO_MARKER: Record<Severity, monaco.MarkerSeverity> = {
  error: monaco.MarkerSeverity.Error,
  warning: monaco.MarkerSeverity.Warning,
  info: monaco.MarkerSeverity.Info,
};

const MARKER_OWNER = "ewp-toolkit";
const VALIDATE_DEBOUNCE_MS = 200;

const REFERENCE_BRANCH_LABEL: Record<"data-reference" | "custom-key", string> = {
  "data-reference": "data.yaml reference",
  "custom-key": "custom saved key",
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

  addFile(name: string, content: string, folder = ""): LoadedFile {
    const uniqueName = this.uniqueName(name);
    const id = `f${this.nextId++}`;
    const uri = monaco.Uri.parse(`file:///loaded/${id}/${encodeURIComponent(uniqueName)}`);
    const model = monaco.editor.createModel(content, "yaml", uri);
    const file: LoadedFile = { id, name: uniqueName, folder, model, problems: [] };
    this.files.push(file);
    model.onDidChangeContent(() => this.scheduleRevalidateAll());
    this.revalidateAll();
    if (this.activeId === null) this.setActive(id);
    else this.onChange();
    return file;
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
    this.editor.setModel(file ? file.model : null);
    this.onChange();
  }

  /** Rename a loaded file. Blank names are rejected; collisions get a ` (n)` suffix. */
  renameFile(id: string, rawName: string): void {
    const file = this.files.find((f) => f.id === id);
    if (!file) return;
    const trimmed = rawName.trim();
    if (trimmed === "" || trimmed === file.name) {
      this.onChange();
      return;
    }
    file.name = this.uniqueName(trimmed, id);
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
    const rank: Record<Severity, number> = { error: 0, warning: 1, info: 2 };
    let top: Problem | null = null;
    for (const p of file.problems) {
      if (!top || rank[p.severity] < rank[top.severity] || (rank[p.severity] === rank[top.severity] && p.range[0] < top.range[0])) {
        top = p;
      }
    }
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

  private uniqueName(name: string, exceptId?: string): string {
    const existing = new Set(this.files.filter((f) => f.id !== exceptId).map((f) => f.name));
    if (!existing.has(name)) return name;
    const dot = name.lastIndexOf(".");
    const base = dot === -1 ? name : name.slice(0, dot);
    const ext = dot === -1 ? "" : name.slice(dot);
    let n = 2;
    while (existing.has(`${base} (${n})${ext}`)) n++;
    return `${base} (${n})${ext}`;
  }
}

export function errorCount(file: LoadedFile): number {
  return file.problems.filter((p) => p.severity === "error").length;
}
export function warningCount(file: LoadedFile): number {
  return file.problems.filter((p) => p.severity === "warning").length;
}
