import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import { configureMonacoYaml } from "monaco-yaml";
import yamlWorker from "monaco-yaml/yaml.worker?worker";
import { errorCount, FileManager, type LoadedFile, warningCount } from "./fileManager";
import {
  buildTree,
  DEFAULT_UPLOAD_SORT,
  filterFiles,
  folderFromRelativePath,
  type FileStatus,
  planSave,
  type SaveFile,
  type SaveScope,
  type SortMode,
  sortFiles,
  statusOf,
  type ViewFile,
} from "./fileView";
import schemaJson from "./schema.generated.json";
import { pickHighestPriority, type Severity } from "./structuralPrecheck";
import "./style.css";
import { buildZip } from "./zip";

// A from-scratch file lands in the canonical Expand World location so the panel
// shows the same folder > file shape as a real mod upload.
const DEFAULT_FOLDER = "expand_world";
const DEFAULT_FILE_NAME = "expand_world_prefabs.yaml";

(self as unknown as { MonacoEnvironment: monaco.Environment }).MonacoEnvironment = {
  getWorker(_moduleId: string, label: string) {
    if (label === "yaml") return new yamlWorker();
    return new editorWorker();
  },
};

const meta = (schemaJson as any)._meta as { ewpVersion: string | null; generatedAt: string };

// Outline-only icons in the hub's minimalist style (viewBox 24, no fill,
// currentColor stroke) so the toolbar reads the same as the site nav.
const icon = (paths: string, extra = "") =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ${extra}>${paths}</svg>`;

const ICONS = {
  // Notepad with a folded corner + ruled lines — same glyph as the nav's tool icon.
  file: '<path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M15 3v4h4"/><path d="M8 11h3"/><path d="M8 14h6"/><path d="M8 17h4"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  funnel: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  dragArrow: '<path d="M9 10 4 15l5 5"/><path d="M4 15h11a5 5 0 0 0 5-5V4"/>',
  arrowUp: '<path d="M12 20V6"/><path d="m6 12 6-6 6 6"/>',
  arrowDown: '<path d="M12 4v14"/><path d="m6 12 6 6 6-6"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  // Classic floppy disk: shutter notch at the top, label at the bottom.
  save: '<path d="M5 4h11l3 3v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M8 4v5h6V4"/><path d="M8 13h8v6H8z"/>',
  // Nav glyphs — copied from the hub's nav.ts so the toolbar reads the same.
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-9"/><path d="M9.5 20v-6h5v6"/>',
  // "Buy me a coffee" cup — the donation convention, matching what the
  // Support page actually links to.
  support:
    '<path d="M5 9h12v7a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V9z"/><path d="M17 10.5h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M9 3c0 1-1 1-1 2s1 1 1 2"/><path d="M13 3c0 1-1 1-1 2s1 1 1 2"/>',
};

// Theme is shared with the hub via the same localStorage key, so a choice made
// on either page carries over. The chrome follows the earthy hub palette (CSS
// `data-theme`); Monaco gets the matching built-in editor theme.
type Theme = "dark" | "light";
const THEME_KEY = "ew-toolkit-theme";
const storedTheme = (): Theme => (localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark");
function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
  monaco.editor.setTheme(theme === "light" ? "vs" : "vs-dark");
  const btn = document.querySelector<HTMLButtonElement>("#theme-toggle");
  if (btn) btn.textContent = theme === "dark" ? "☾ Dark" : "☀ Light";
}

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="app">
    <nav class="site-nav">
      <div class="site-nav-links">
        <a class="nav-link" href="../"><span class="nav-icon" aria-hidden="true">${icon(ICONS.home)}</span>Home</a>
        <a class="nav-link active" href="./"><span class="nav-icon" aria-hidden="true">${icon(ICONS.file)}</span>EWP Validator</a>
        <a class="nav-link" href="../support/"><span class="nav-icon" aria-hidden="true">${icon(ICONS.support)}</span>Support</a>
      </div>
      <button id="theme-toggle" class="theme-toggle" aria-label="Current theme, click to switch"></button>
    </nav>
    <div class="app-header">
      <span><b>Expand World Prefabs YAML Validator</b></span>
      <span>${meta.ewpVersion ? `EWP ${meta.ewpVersion}` : "EWP version unknown"} · schema generated ${new Date(meta.generatedAt).toLocaleString()}</span>
    </div>
    <div class="app-body">
      <div class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <span>Loaded files</span>
          <span class="sidebar-actions">
            <button class="icon-btn has-plus" id="add-files-btn" title="Upload files" aria-label="Upload files">${icon(ICONS.file)}<span class="plus-sup">+</span></button>
            <button class="icon-btn has-plus" id="add-folder-btn" title="Upload folders" aria-label="Upload folders">${icon(ICONS.folder)}<span class="plus-sup">+</span></button>
            <div class="sortfilter">
              <button class="icon-btn" id="sortfilter-btn" title="Sort & filter" aria-label="Sort and filter">${icon(ICONS.funnel)}</button>
              <div class="sortfilter-menu" id="sortfilter-menu" hidden></div>
            </div>
          </span>
        </div>
        <div id="file-list"></div>
      </div>
      <div class="resizer-x" id="resizer-x" title="Drag to resize"></div>
      <div class="main">
        <div class="active-file-name" id="active-file-name">
          <span class="filename-text" id="filename-text" title="Click to rename"></span>
          <span class="filename-actions">
            <button class="icon-btn" id="new-file-btn" title="New file" aria-label="New file">${icon(ICONS.plus)}</button>
            <div class="savemenu">
              <button class="icon-btn" id="save-btn" title="Save" aria-label="Save">${icon(ICONS.save)}</button>
              <div class="save-menu" id="save-menu" hidden></div>
            </div>
          </span>
        </div>
        <div id="editor"></div>
        <div class="resizer-y" id="resizer-y" title="Drag to resize"></div>
        <div class="problems">
          <div class="problems-tabs" id="problems-tabs"></div>
          <div id="problems-list"></div>
        </div>
      </div>
    </div>
  </div>
  <input type="file" id="file-input" multiple accept=".yaml,.yml" hidden />
  <input type="file" id="folder-input" webkitdirectory multiple hidden />
`;

// monaco-yaml is configured purely for completion/hover here — its own
// diagnostics (validate: false) are deliberately off. Structural validation
// errors are produced entirely by runStructuralPrecheck (ticket 10), not by
// this schema's `oneOf`, and are applied as markers by FileManager below.
configureMonacoYaml(monaco, {
  validate: false,
  hover: true,
  completion: true,
  schemas: [
    {
      uri: "inmemory://ewp-toolkit/schema.json",
      fileMatch: ["**/*.yaml", "**/*.yml"],
      schema: schemaJson as any,
    },
  ],
});

const editor = monaco.editor.create(document.getElementById("editor")!, {
  theme: storedTheme() === "light" ? "vs" : "vs-dark",
  automaticLayout: true,
  minimap: { enabled: false },
  fontSize: 13,
});

// Chrome + editor theme, kept in sync with the hub. Ctrl+F / Ctrl+H (Monaco's
// built-in find & replace, incl. Replace All) work whenever the editor is focused.
applyTheme(storedTheme());
document.getElementById("theme-toggle")!.addEventListener("click", () => {
  applyTheme((document.documentElement.getAttribute("data-theme") as Theme) === "dark" ? "light" : "dark");
});

const fileManager = new FileManager(editor, render);

const sidebarEl = document.getElementById("sidebar") as HTMLDivElement;
const fileListEl = document.getElementById("file-list")!;
const filenameTextEl = document.getElementById("filename-text") as HTMLElement;
const newFileBtn = document.getElementById("new-file-btn") as HTMLButtonElement;
const saveBtn = document.getElementById("save-btn") as HTMLButtonElement;
const saveMenu = document.getElementById("save-menu")!;
const problemsTabsEl = document.getElementById("problems-tabs")!;
const problemsListEl = document.getElementById("problems-list")!;

// ---------- Sidebar view state (sort + filter behind the funnel menu) ----------

let currentSort: SortMode = DEFAULT_UPLOAD_SORT;
const sidebarFilters = new Set<FileStatus>(["error", "warning", "valid"]);

// ---------- Problems panel tab state (error / warning / info) ----------
// The "info" tab is the blue data.yaml/custom-key/legacy-format hints.

let activeTab: Severity = "error";
const TAB_LABEL: Record<Severity, string> = { error: "Errors", warning: "Warnings", info: "Info" };

function render() {
  renderFileList();
  renderActiveFileName();
  renderProblemsPanel();
}

function toViewFile(file: LoadedFile): ViewFile {
  return { id: file.id, name: file.name, folder: file.folder, status: statusOf(errorCount(file), warningCount(file)) };
}

function statusBadge(status: FileStatus, errors: number, warnings: number): string {
  if (status === "error") return `<span class="badge err">${errors}</span>`;
  if (status === "warning") return `<span class="badge warn">${warnings}</span>`;
  return `<span class="badge ok">✓</span>`;
}

function renderFileList() {
  fileListEl.innerHTML = "";
  const all = fileManager.allFiles;

  if (all.length === 0) {
    fileListEl.innerHTML = `
      <div class="empty-state" id="empty-state" title="Click to upload">
        <p data-open="files"><span class="hint-icon has-plus">${icon(ICONS.file)}<span class="plus-sup">+</span></span> Upload one or multiple files</p>
        <p data-open="folders"><span class="hint-icon has-plus">${icon(ICONS.folder)}<span class="plus-sup">+</span></span> Upload one or multiple folders</p>
        <p><span class="hint-icon">${icon(ICONS.dragArrow)}</span> Or drag &amp; drop here</p>
      </div>`;
    document.getElementById("empty-state")!.addEventListener("click", (e) => {
      const which = (e.target as HTMLElement).closest("[data-open]")?.getAttribute("data-open");
      if (which === "folders") folderInput.click();
      else fileInput.click();
    });
    return;
  }

  const active = fileManager.activeFile;
  const byId = new Map(all.map((f) => [f.id, f]));
  const view = sortFiles(filterFiles(all.map(toViewFile), sidebarFilters), currentSort);
  const tree = buildTree(view);

  if (view.length === 0) {
    fileListEl.innerHTML = `<div class="empty-state"><p>No files match the current filter.</p></div>`;
    return;
  }

  for (const group of tree) {
    if (group.folder) {
      const header = document.createElement("div");
      header.className = "folder-row";
      header.innerHTML = `<span class="folder-icon">${icon(ICONS.folder)}</span><span class="folder-name" title="${escapeHtml(group.folder)}">${escapeHtml(group.folder)}</span>`;
      fileListEl.appendChild(header);
    }
    for (const vf of group.files) {
      const file = byId.get(vf.id)!;
      const errors = errorCount(file);
      const warnings = warningCount(file);
      const row = document.createElement("div");
      row.className = `file-row ${vf.id === active?.id ? "active" : ""} ${group.folder ? "nested" : ""}`;
      row.innerHTML = `
        <span class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
        ${statusBadge(vf.status, errors, warnings)}
        <button class="remove-btn" title="Remove file">×</button>
      `;
      row.querySelector(".file-name")!.addEventListener("click", () => fileManager.revealTopProblem(vf.id));
      row.querySelector(".badge")!.addEventListener("click", () => fileManager.revealTopProblem(vf.id));
      row.querySelector(".remove-btn")!.addEventListener("click", (e) => {
        e.stopPropagation();
        fileManager.removeFile(vf.id);
      });
      fileListEl.appendChild(row);
    }
  }
}

function renderActiveFileName() {
  const file = fileManager.activeFile;
  // Don't stomp the text mid-rename (a background revalidation can re-render
  // while the user is typing a new name into this same element).
  if (document.activeElement !== filenameTextEl) {
    filenameTextEl.textContent = file?.name ?? "No file open";
  }
  filenameTextEl.contentEditable = file ? "true" : "false";
  filenameTextEl.classList.toggle("editable", !!file);
  saveBtn.disabled = !file;
}

interface ProblemRow {
  file: LoadedFile;
  problem: LoadedFile["problems"][number];
}

function renderProblemsPanel() {
  const rows: ProblemRow[] = [];
  for (const file of fileManager.allFiles) {
    for (const problem of file.problems) rows.push({ file, problem });
  }

  const counts: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  for (const { problem } of rows) counts[problem.severity]++;

  renderTabs(counts);

  if (fileManager.allFiles.length === 0) {
    problemsListEl.innerHTML = `<div class="problems-empty">Upload .yaml files to validate them.</div>`;
    return;
  }

  const shown = rows.filter((r) => r.problem.severity === activeTab);
  if (shown.length === 0) {
    problemsListEl.innerHTML = `<div class="problems-empty">No ${TAB_LABEL[activeTab].toLowerCase()} to report.</div>`;
    return;
  }

  problemsListEl.innerHTML = "";
  for (const { file, problem } of shown) {
    const start = file.model.getPositionAt(problem.range[0]);
    const row = document.createElement("div");
    const key = `${file.id}:${problem.range[0]}`;
    row.className = `problem ${problem.severity} ${key === focusedProblemKey ? "cursor-focus" : ""}`;
    row.dataset.key = key;
    row.innerHTML = `<span class="loc">${escapeHtml(file.name)}:${start.lineNumber}</span><span class="msg">${escapeHtml(problem.message)}</span><span class="branch">[${escapeHtml(problem.branch)}]</span>`;
    row.addEventListener("click", () => fileManager.revealProblem(file.id, problem.range[0]));
    problemsListEl.appendChild(row);
  }
  if (focusedProblemKey) {
    problemsListEl.querySelector(".problem.cursor-focus")?.scrollIntoView({ block: "nearest" });
  }
}

// The problem row the editor cursor is currently sitting on (file id + offset),
// so the panel can follow the caret onto a flagged line and highlight its note.
let focusedProblemKey: string | null = null;

function renderTabs(counts: Record<Severity, number>) {
  const tabs: Severity[] = ["error", "warning", "info"];
  problemsTabsEl.innerHTML = "";
  for (const tab of tabs) {
    const btn = document.createElement("button");
    btn.className = `problem-tab ${tab} ${tab === activeTab ? "active" : ""}`;
    btn.title = `Show ${TAB_LABEL[tab].toLowerCase()}`;
    btn.innerHTML = `<span class="tab-dot"></span>${TAB_LABEL[tab]}<span class="tab-count">${counts[tab]}</span>`;
    btn.addEventListener("click", () => {
      activeTab = tab;
      renderProblemsPanel();
    });
    problemsTabsEl.appendChild(btn);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// ---------- Sort & filter menu ----------

const SORT_OPTIONS: { mode: SortMode; label: string; symbol: string }[] = [
  { mode: "az", label: "A–Z", symbol: icon(ICONS.arrowUp, 'class="sort-arrow"') },
  { mode: "za", label: "Z–A", symbol: icon(ICONS.arrowDown, 'class="sort-arrow"') },
  { mode: "errors", label: "Errors first", symbol: '<span class="status-dot error"></span>' },
  { mode: "warnings", label: "Warnings first", symbol: '<span class="status-dot warning"></span>' },
  { mode: "valid", label: "Passing first", symbol: '<span class="status-dot valid"></span>' },
];

const FILTER_OPTIONS: { status: FileStatus; label: string }[] = [
  { status: "error", label: "Errors" },
  { status: "warning", label: "Warnings" },
  { status: "valid", label: "Passing" },
];

const sortFilterBtn = document.getElementById("sortfilter-btn")!;
const sortFilterMenu = document.getElementById("sortfilter-menu")!;

function renderSortFilterMenu() {
  sortFilterMenu.innerHTML = `
    <div class="menu-section-title">Sort</div>
    ${SORT_OPTIONS.map(
      (o) =>
        `<button class="menu-item sort-item ${o.mode === currentSort ? "active" : ""}" data-sort="${o.mode}">
          <span class="menu-symbol">${o.symbol}</span><span class="menu-label">${o.label}</span>
          <span class="menu-check">${o.mode === currentSort ? "✓" : ""}</span>
        </button>`,
    ).join("")}
    <div class="menu-divider"></div>
    <div class="menu-section-title">Filter</div>
    ${FILTER_OPTIONS.map(
      (o) =>
        `<label class="menu-item filter-item">
          <input type="checkbox" data-filter="${o.status}" ${sidebarFilters.has(o.status) ? "checked" : ""} />
          <span class="status-dot ${o.status}"></span><span class="menu-label">${o.label}</span>
        </label>`,
    ).join("")}
  `;

  sortFilterMenu.querySelectorAll<HTMLButtonElement>(".sort-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentSort = btn.dataset.sort as SortMode;
      renderSortFilterMenu();
      renderFileList();
    });
  });
  sortFilterMenu.querySelectorAll<HTMLInputElement>("input[data-filter]").forEach((cb) => {
    cb.addEventListener("change", () => {
      const status = cb.dataset.filter as FileStatus;
      if (cb.checked) sidebarFilters.add(status);
      else sidebarFilters.delete(status);
      renderFileList();
    });
  });
}

sortFilterBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const opening = sortFilterMenu.hasAttribute("hidden");
  if (opening) {
    renderSortFilterMenu();
    sortFilterMenu.removeAttribute("hidden");
  } else {
    sortFilterMenu.setAttribute("hidden", "");
  }
});
document.addEventListener("click", (e) => {
  if (!sortFilterMenu.hasAttribute("hidden") && !sortFilterMenu.contains(e.target as Node) && e.target !== sortFilterBtn) {
    sortFilterMenu.setAttribute("hidden", "");
  }
});

// ---------- Loading files: pickers, folders, and drag-and-drop ----------

interface Ingestable {
  file: File;
  relPath: string;
}

const isYaml = (name: string) => /\.ya?ml$/i.test(name);

async function ingest(entries: Ingestable[]) {
  const yamls = entries.filter((e) => isYaml(e.file.name));
  if (yamls.length === 0) return;
  for (const { file, relPath } of yamls) {
    const content = await file.text();
    fileManager.addFile(file.name, content, folderFromRelativePath(relPath));
  }
  // Every upload resets the panel to the one-time Error > Warning > Valid sort.
  currentSort = DEFAULT_UPLOAD_SORT;
  renderFileList();
}

function fromFileList(list: FileList): Ingestable[] {
  return Array.from(list).map((file) => ({ file, relPath: file.webkitRelativePath || file.name }));
}

// Drag-and-drop can carry whole folders (and multiple at once); walk the entry
// tree so dropped directories become the same folder structure as the picker.
async function readAllDirEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  // readEntries yields the directory in batches and signals the end with an
  // empty batch, so keep calling until it drains.
  const out: FileSystemEntry[] = [];
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej));
    if (batch.length === 0) return out;
    out.push(...batch);
  }
}

async function walkEntry(entry: FileSystemEntry, prefix: string, out: Ingestable[]): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej));
    out.push({ file, relPath: prefix + entry.name });
  } else if (entry.isDirectory) {
    const children = await readAllDirEntries((entry as FileSystemDirectoryEntry).createReader());
    for (const child of children) await walkEntry(child, `${prefix}${entry.name}/`, out);
  }
}

async function fromDataTransfer(dt: DataTransfer): Promise<Ingestable[]> {
  const entries = Array.from(dt.items)
    .map((item) => (item.webkitGetAsEntry ? item.webkitGetAsEntry() : null))
    .filter((e): e is FileSystemEntry => e !== null);
  if (entries.length === 0) return fromFileList(dt.files); // fallback for browsers without the entry API
  const out: Ingestable[] = [];
  for (const entry of entries) await walkEntry(entry, "", out);
  return out;
}

const fileInput = document.getElementById("file-input") as HTMLInputElement;
const folderInput = document.getElementById("folder-input") as HTMLInputElement;

document.getElementById("add-files-btn")!.addEventListener("click", () => fileInput.click());
document.getElementById("add-folder-btn")!.addEventListener("click", () => folderInput.click());
fileInput.addEventListener("change", () => {
  if (fileInput.files) ingest(fromFileList(fileInput.files));
  fileInput.value = "";
});
folderInput.addEventListener("change", () => {
  if (folderInput.files) ingest(fromFileList(folderInput.files));
  folderInput.value = "";
});

sidebarEl.addEventListener("dragover", (e) => {
  e.preventDefault();
  sidebarEl.classList.add("drag-over");
});
sidebarEl.addEventListener("dragleave", () => sidebarEl.classList.remove("drag-over"));
sidebarEl.addEventListener("drop", async (e) => {
  e.preventDefault();
  sidebarEl.classList.remove("drag-over");
  if (e.dataTransfer) ingest(await fromDataTransfer(e.dataTransfer));
});

// ---------- Draggable dividers ----------

function makeResizer(handle: HTMLElement, axis: "x" | "y", apply: (deltaPx: number, startSize: number) => void, sizeOf: () => number) {
  handle.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    try {
      handle.setPointerCapture(e.pointerId);
    } catch {
      // A missing active pointer (e.g. synthetic events) shouldn't abort the drag wiring.
    }
    handle.classList.add("dragging");
    const startPos = axis === "x" ? e.clientX : e.clientY;
    const startSize = sizeOf();
    const move = (ev: PointerEvent) => apply((axis === "x" ? ev.clientX : ev.clientY) - startPos, startSize);
    const up = () => {
      handle.classList.remove("dragging");
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
  });
}

const problemsEl = document.querySelector<HTMLElement>(".problems")!;

makeResizer(
  document.getElementById("resizer-x")!,
  "x",
  (delta, startSize) => {
    sidebarEl.style.width = `${Math.min(560, Math.max(180, startSize + delta))}px`;
  },
  () => sidebarEl.offsetWidth,
);
makeResizer(
  document.getElementById("resizer-y")!,
  "y",
  (delta, startSize) => {
    problemsEl.style.height = `${Math.min(560, Math.max(100, startSize - delta))}px`;
  },
  () => problemsEl.offsetHeight,
);

// ---------- New file, edit-to-create fallback, and rename ----------

function createNewFile() {
  const file = fileManager.addFile(DEFAULT_FILE_NAME, "", DEFAULT_FOLDER);
  fileManager.setActive(file.id);
  editor.focus();
}

newFileBtn.addEventListener("click", () => createNewFile());

// Focusing the empty editor is the intent to "start editing" — materialise a
// default expand_world/expand_world_prefabs.yaml so the loose edits have a home.
editor.onDidFocusEditorText(() => {
  if (fileManager.allFiles.length === 0) createNewFile();
});

// The Problems panel follows the caret: land on a flagged line and its note is
// selected (and, if needed, its tab opened) in the panel below.
editor.onDidChangeCursorPosition((e) => {
  const file = fileManager.activeFile;
  const line = e.position.lineNumber;
  let best: LoadedFile["problems"][number] | null = null;
  if (file) {
    const onLine = file.problems.filter((p) => {
      const startLine = file.model.getPositionAt(p.range[0]).lineNumber;
      const endLine = file.model.getPositionAt(Math.max(p.range[1], p.range[0])).lineNumber;
      return line >= startLine && line <= endLine;
    });
    best = pickHighestPriority(onLine);
  }
  const key = best && file ? `${file.id}:${best.range[0]}` : null;
  if (key === focusedProblemKey) return;
  focusedProblemKey = key;
  if (best && activeTab !== best.severity) activeTab = best.severity;
  renderProblemsPanel();
});

filenameTextEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    filenameTextEl.blur();
  } else if (e.key === "Escape") {
    e.preventDefault();
    filenameTextEl.textContent = fileManager.activeFile?.name ?? "";
    filenameTextEl.blur();
  }
});
filenameTextEl.addEventListener("blur", () => {
  const file = fileManager.activeFile;
  if (!file) return;
  fileManager.renameFile(file.id, (filenameTextEl.textContent ?? "").replace(/\s+/g, " "));
});

// ---------- Save (this file / this folder / all) ----------

const SAVE_OPTIONS: { scope: SaveScope; label: string }[] = [
  { scope: "file", label: "Save this file" },
  { scope: "folder", label: "Save this folder" },
  { scope: "all", label: "Save all" },
];

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function doSave(scope: SaveScope) {
  const toSaveFile = (f: LoadedFile): SaveFile => ({ name: f.name, folder: f.folder, content: f.model.getValue() });
  const active = fileManager.activeFile;
  const plan = planSave(fileManager.allFiles.map(toSaveFile), scope, active ? toSaveFile(active) : null);
  if (!plan) return;
  if (plan.kind === "single") {
    downloadBlob(plan.filename, new Blob([plan.entries[0].content], { type: "text/yaml" }));
  } else {
    const bytes = buildZip(plan.entries);
    downloadBlob(plan.filename, new Blob([bytes.buffer as ArrayBuffer], { type: "application/zip" }));
  }
}

function renderSaveMenu() {
  saveMenu.innerHTML = SAVE_OPTIONS.map(
    (o) => `<button class="menu-item save-item" data-scope="${o.scope}"><span class="menu-label">${o.label}</span></button>`,
  ).join("");
  saveMenu.querySelectorAll<HTMLButtonElement>(".save-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      doSave(btn.dataset.scope as SaveScope);
      saveMenu.setAttribute("hidden", "");
    });
  });
}

saveBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (saveBtn.disabled) return;
  if (saveMenu.hasAttribute("hidden")) {
    renderSaveMenu();
    saveMenu.removeAttribute("hidden");
  } else {
    saveMenu.setAttribute("hidden", "");
  }
});
document.addEventListener("click", (e) => {
  if (!saveMenu.hasAttribute("hidden") && !saveMenu.contains(e.target as Node) && e.target !== saveBtn) {
    saveMenu.setAttribute("hidden", "");
  }
});

render();
