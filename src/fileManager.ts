// Multi-file state for the ticket 11 "sidebar + Problems panel" layout.
// Each loaded file gets its own Monaco model and is validated independently
// (Batch validation, per CONTEXT.md) — there is no cross-file coupling here,
// that's reference validation (ticket 06), not part of this pass.
import * as monaco from "monaco-editor";
import { runStructuralPrecheck, type Problem, type Severity } from "./structuralPrecheck";

export interface LoadedFile {
  id: string;
  name: string;
  model: monaco.editor.ITextModel;
  problems: Problem[];
}

const SEVERITY_TO_MARKER: Record<Severity, monaco.MarkerSeverity> = {
  error: monaco.MarkerSeverity.Error,
  warning: monaco.MarkerSeverity.Warning,
  info: monaco.MarkerSeverity.Info,
};

const MARKER_OWNER = "ewp-structural-precheck";
const VALIDATE_DEBOUNCE_MS = 200;

export class FileManager {
  private files: LoadedFile[] = [];
  private activeId: string | null = null;
  private nextId = 1;
  private debounceHandles = new Map<string, ReturnType<typeof setTimeout>>();

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

  addFile(name: string, content: string): LoadedFile {
    const uniqueName = this.uniqueName(name);
    const id = `f${this.nextId++}`;
    const uri = monaco.Uri.parse(`file:///loaded/${id}/${encodeURIComponent(uniqueName)}`);
    const model = monaco.editor.createModel(content, "yaml", uri);
    const file: LoadedFile = { id, name: uniqueName, model, problems: [] };
    this.files.push(file);
    model.onDidChangeContent(() => this.scheduleValidate(file));
    this.validate(file);
    if (this.activeId === null) this.setActive(id);
    else this.onChange();
    return file;
  }

  removeFile(id: string) {
    const idx = this.files.findIndex((f) => f.id === id);
    if (idx === -1) return;
    const [removed] = this.files.splice(idx, 1);
    clearTimeout(this.debounceHandles.get(id));
    this.debounceHandles.delete(id);
    removed.model.dispose();
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

  private scheduleValidate(file: LoadedFile) {
    clearTimeout(this.debounceHandles.get(file.id));
    this.debounceHandles.set(
      file.id,
      setTimeout(() => {
        this.validate(file);
        this.onChange();
      }, VALIDATE_DEBOUNCE_MS),
    );
  }

  private validate(file: LoadedFile) {
    file.problems = runStructuralPrecheck(file.model.getValue());
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

  private uniqueName(name: string): string {
    const existing = new Set(this.files.map((f) => f.name));
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
