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
  type SortMode,
  sortFiles,
  statusOf,
  type ViewFile,
} from "./fileView";
import schemaJson from "./schema.generated.json";
import type { Severity } from "./structuralPrecheck";
import "./style.css";

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
};

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="app">
    <nav class="site-nav">
      <div class="site-nav-links">
        <a class="nav-link" href="../">Home</a>
        <a class="nav-link active" href="./">EWP Validator</a>
        <a class="nav-link" href="../support/">Support</a>
      </div>
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
            <button class="icon-btn" id="add-files-btn" title="Upload files" aria-label="Upload files">${icon(ICONS.file)}</button>
            <button class="icon-btn" id="add-folder-btn" title="Upload folders" aria-label="Upload folders">${icon(ICONS.folder)}</button>
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
        <div class="active-file-name" id="active-file-name"></div>
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
  theme: "vs-dark",
  automaticLayout: true,
  minimap: { enabled: false },
  fontSize: 13,
});

const fileManager = new FileManager(editor, render);

const sidebarEl = document.getElementById("sidebar") as HTMLDivElement;
const fileListEl = document.getElementById("file-list")!;
const activeFileNameEl = document.getElementById("active-file-name")!;
const problemsTabsEl = document.getElementById("problems-tabs")!;
const problemsListEl = document.getElementById("problems-list")!;

// ---------- Sidebar view state (sort + filter behind the funnel menu) ----------

let currentSort: SortMode = DEFAULT_UPLOAD_SORT;
const sidebarFilters = new Set<FileStatus>(["error", "warning", "valid"]);

// ---------- Problems panel tab state (error / warning / flag) ----------
// The "flag" tab is the info severity — the blue data.yaml/custom-key hints.

let activeTab: Severity = "error";
const TAB_LABEL: Record<Severity, string> = { error: "Errors", warning: "Warnings", info: "Flags" };

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
      <div class="empty-state">
        <p><span class="hint-icon">${icon(ICONS.file)}</span> Upload one or multiple files</p>
        <p><span class="hint-icon">${icon(ICONS.folder)}</span> Upload one or multiple folders</p>
        <p><span class="hint-icon">${icon(ICONS.dragArrow)}</span> Or drag &amp; drop here</p>
      </div>`;
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
      row.querySelector(".file-name")!.addEventListener("click", () => fileManager.setActive(vf.id));
      row.querySelector(".badge")!.addEventListener("click", () => fileManager.setActive(vf.id));
      row.querySelector(".remove-btn")!.addEventListener("click", (e) => {
        e.stopPropagation();
        fileManager.removeFile(vf.id);
      });
      fileListEl.appendChild(row);
    }
  }
}

function renderActiveFileName() {
  activeFileNameEl.textContent = fileManager.activeFile?.name ?? "No file open";
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
    row.className = `problem ${problem.severity}`;
    row.innerHTML = `<span class="loc">${escapeHtml(file.name)}:${start.lineNumber}</span><span class="msg">${escapeHtml(problem.message)}</span><span class="branch">[${escapeHtml(problem.branch)}]</span>`;
    row.addEventListener("click", () => fileManager.revealProblem(file.id, problem.range[0]));
    problemsListEl.appendChild(row);
  }
}

function renderTabs(counts: Record<Severity, number>) {
  const tabs: Severity[] = ["error", "warning", "info"];
  problemsTabsEl.innerHTML = "";
  for (const tab of tabs) {
    const btn = document.createElement("button");
    btn.className = `problem-tab ${tab} ${tab === activeTab ? "active" : ""}`;
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

render();
