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
import { DIAGNOSIS_CATEGORIES, DIAGNOSIS_CATEGORY_SET, presentSortedCategories } from "./diagnosisCategories";
import { pickHighestPriority, type Severity } from "./structuralPrecheck";
import "./style.css";
import { buildZip } from "./zip";

// A from-scratch file (typed draft, single upload, or single drag-drop with no
// folder context) lands in this default folder rather than the root, so
// nothing is ever left loose without the user explicitly placing it there.
// "Add a folder" creates a new, uniquely-named one of the same base name.
const DEFAULT_FILE_NAME = "unnamed.yaml";
const DEFAULT_FOLDER_NAME = "unnamed";

(self as unknown as { MonacoEnvironment: monaco.Environment }).MonacoEnvironment = {
  getWorker(_moduleId: string, label: string) {
    if (label === "yaml") return new yamlWorker();
    return new editorWorker();
  },
};

const meta = (schemaJson as any)._meta as { ewpVersion: string | null; generatedAt: string };

// generatedAt is a UTC ISO string (schema/generate.mjs); render it in whatever
// timezone the browser is actually in — Intl resolves the zone from the
// runtime automatically, no timezone argument needed.
//
// Full form (year/month/day/zone spelled out) is used as the hover title so
// it never reads as "is this UTC or mine?"; the short form (just the time) is
// what's shown inline, since the header line is tight on space and the date
// is almost always "today" anyway.
function formatLocalTimestamp(isoUtc: string): string {
  return new Date(isoUtc).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function formatShortLocalTime(isoUtc: string): string {
  return new Date(isoUtc).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// Outline-only icons in the hub's minimalist style (viewBox 24, no fill,
// currentColor stroke) so the toolbar reads the same as the site nav.
const icon = (paths: string, extra = "") =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ${extra}>${paths}</svg>`;

const ICONS = {
  // Notepad with a folded corner + ruled lines — same glyph as the nav's tool icon.
  file: '<path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M15 3v4h4"/><path d="M8 11h3"/><path d="M8 14h6"/><path d="M8 17h4"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  // Upload glyphs: the document/folder outline with the "+" drawn as part of the
  // same stroke (currentColor), so the plus reads as one with the icon rather
  // than a tacked-on blue superscript. Used identically in the toolbar and the
  // drag-and-drop empty state.
  filePlus:
    '<path d="M15 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7z"/><path d="M15 3v4h4"/><path d="M12 11v6"/><path d="M9 14h6"/>',
  folderPlus:
    '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 10v6"/><path d="M9 13h6"/>',
  funnel: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  dragArrow: '<path d="M9 10 4 15l5 5"/><path d="M4 15h11a5 5 0 0 0 5-5V4"/>',
  arrowUp: '<path d="M12 20V6"/><path d="m6 12 6-6 6 6"/>',
  arrowDown: '<path d="M12 4v14"/><path d="m6 12 6 6 6-6"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  close: '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
  // Circular two-arrow refresh — the "reset to default" affordance (clearer than
  // a bare × for "put this back the way it was").
  reset: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>',
  // Two stacked sheets — the universal "copy to clipboard" glyph.
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M6 15a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1"/>',
  // Ladybird beetle: antennae, a split domed shell, and four spots — the
  // "file a report" affordance (bug report).
  ladybug:
    '<path d="M12 6c1.4 0 2.6.9 3.1 2.2"/><path d="M12 6c-1.4 0-2.6.9-3.1 2.2"/><path d="m6 8-1.8-1.4"/><path d="m18 8 1.8-1.4"/><ellipse cx="12" cy="13.5" rx="6.5" ry="7"/><path d="M12 7v13"/><circle cx="8.6" cy="12" r=".7"/><circle cx="15.4" cy="12" r=".7"/><circle cx="8.9" cy="16.5" r=".7"/><circle cx="15.1" cy="16.5" r=".7"/>',
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
      <div class="nav-right">
        <a class="changelog-link" href="https://github.com/z-eall/ew_toolkit/releases" target="_blank" rel="noopener noreferrer">Changelog</a>
        <button id="theme-toggle" class="theme-toggle" aria-label="Current theme, click to switch"></button>
      </div>
    </nav>
    <div class="app-header">
      <span><b>Expand World Prefabs YAML Validator</b></span>
      <span>${meta.ewpVersion ? `EWP ${meta.ewpVersion}` : "EWP version unknown"} · Schema last updated at <span title="${formatLocalTimestamp(meta.generatedAt)}">${formatShortLocalTime(meta.generatedAt)}</span></span>
    </div>
    <div class="app-body">
      <div class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <span>Loaded files</span>
          <span class="sidebar-actions">
            <button class="icon-btn" id="add-files-btn" title="Upload files" aria-label="Upload files">${icon(ICONS.filePlus)}</button>
            <button class="icon-btn" id="add-folder-btn" title="Upload a folder (drag &amp; drop to add several at once)" aria-label="Upload a folder">${icon(ICONS.folderPlus)}</button>
            <div class="sortfilter">
              <button class="icon-btn" id="sortfilter-btn" title="Sort & filter" aria-label="Sort and filter">${icon(ICONS.funnel)}</button>
              <div class="sortfilter-menu" id="sortfilter-menu" hidden></div>
            </div>
            <button class="icon-btn" id="clear-all-btn" title="Clear all loaded files" aria-label="Clear all loaded files">${icon(ICONS.trash)}</button>
          </span>
        </div>
        <div id="file-list"></div>
      </div>
      <div class="resizer-x" id="resizer-x" title="Drag to resize"></div>
      <div class="main">
        <div class="active-file-name" id="active-file-name">
          <span class="filename-text" id="filename-text" title="Click to rename"></span>
          <span class="filename-actions">
            <div class="newmenu">
              <button class="icon-btn" id="new-file-btn" title="Add new" aria-label="Add new">${icon(ICONS.plus)}</button>
              <div class="new-menu" id="new-menu" hidden></div>
            </div>
            <div class="savemenu">
              <button class="icon-btn" id="save-btn" title="Save" aria-label="Save">${icon(ICONS.save)}</button>
              <div class="save-menu" id="save-menu" hidden></div>
            </div>
          </span>
        </div>
        <div id="editor"></div>
        <div class="resizer-y" id="resizer-y" title="Drag to resize"></div>
        <div class="problems">
          <div class="problems-header">
            <div class="problems-tabs" id="problems-tabs"></div>
            <div class="problems-actions">
              <div class="catfilter">
                <button class="icon-btn" id="catfilter-btn" title="Filter by category" aria-label="Filter diagnoses by category">${icon(ICONS.funnel)}</button>
                <div class="catfilter-menu" id="catfilter-menu" hidden></div>
              </div>
              <div class="report">
                <button class="icon-btn" id="report-btn" title="File a report" aria-label="File a report">${icon(ICONS.ladybug)}</button>
                <div class="report-menu" id="report-menu" hidden></div>
              </div>
            </div>
          </div>
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
const newMenu = document.getElementById("new-menu")!;
const clearAllBtn = document.getElementById("clear-all-btn") as HTMLButtonElement;
const saveBtn = document.getElementById("save-btn") as HTMLButtonElement;
const saveMenu = document.getElementById("save-menu")!;
const problemsTabsEl = document.getElementById("problems-tabs")!;
const problemsListEl = document.getElementById("problems-list")!;

// ---------- Sidebar view state (sort + filter behind the funnel menu) ----------

const DEFAULT_FILTERS: FileStatus[] = ["error", "warning", "valid"];
let currentSort: SortMode = DEFAULT_UPLOAD_SORT;
const sidebarFilters = new Set<FileStatus>(DEFAULT_FILTERS);

// Folders the user has collapsed in the sidebar tree (by folder name).
const collapsedFolders = new Set<string>();

// ---------- Problems panel tab state (error / warning / info / this file) ----------
// The "info" tab is the blue data.yaml/custom-key/legacy-format hints; the
// "thisfile" tab isolates every severity for the active file only.

type ProblemTab = Severity | "thisfile";
let activeTab: ProblemTab = "error";

// The diagnostic-category vocabulary now lives in ./diagnosisCategories (shared
// with fileManager's reference labels and unit-tested there). Synthetic
// parse/root/item branches are deliberately excluded: they're rare fatal issues,
// always shown, never filtered.

// Category multi-select filter for the Problems panel (all on by default).
const categoryFilter = new Set<string>(DIAGNOSIS_CATEGORIES);
const categoriesAreDefault = () => categoryFilter.size === DIAGNOSIS_CATEGORIES.length;

// Files whose diagnosis group the user has collapsed in the Problems panel.
const collapsedProblemFiles = new Set<string>();
const TAB_LABEL: Record<ProblemTab, string> = {
  error: "Errors",
  warning: "Warnings",
  info: "Info",
  thisfile: "This file",
};

function render() {
  showDraftIfEmpty();
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
        <p data-open="files"><span class="hint-icon">${icon(ICONS.filePlus)}</span> Upload one or multiple files</p>
        <p data-open="folders"><span class="hint-icon">${icon(ICONS.folderPlus)}</span> Upload a folder</p>
        <p><span class="hint-icon">${icon(ICONS.dragArrow)}</span> Or drag &amp; drop files or folders here (several at once)</p>
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
    const collapsed = group.folder !== "" && collapsedFolders.has(group.folder);
    if (group.folder) {
      const header = document.createElement("div");
      header.className = `folder-row ${collapsed ? "collapsed" : ""}`;
      header.innerHTML = `<span class="folder-caret">${icon(ICONS.chevron)}</span><span class="folder-icon">${icon(ICONS.folder)}</span><span class="folder-name" title="${escapeHtml(group.folder)}">${escapeHtml(group.folder)}</span><span class="folder-count">${group.files.length}</span><button class="folder-remove-btn" title="Remove folder">×</button>`;
      header.addEventListener("click", () => {
        if (collapsed) collapsedFolders.delete(group.folder);
        else collapsedFolders.add(group.folder);
        renderFileList();
      });
      header.querySelector(".folder-remove-btn")!.addEventListener("click", (e) => {
        e.stopPropagation();
        // Count every file in the folder, not just the ones passing the current
        // sidebar filter — the remove clears the whole folder regardless of view.
        const total = fileManager.allFiles.filter((f) => f.folder === group.folder).length;
        const ok = confirm(
          `Remove folder "${group.folder}" and its ${total} file${total > 1 ? "s" : ""}?\n\n` +
            `Make sure you've saved anything you want to keep — removed files can't be recovered.`,
        );
        if (ok) fileManager.removeFilesInFolder(group.folder);
      });
      wireFolderDropTarget(header, group.folder);
      fileListEl.appendChild(header);
    }
    if (collapsed) continue;
    for (const vf of group.files) {
      const file = byId.get(vf.id)!;
      const errors = errorCount(file);
      const warnings = warningCount(file);
      const row = document.createElement("div");
      row.className = `file-row ${vf.id === active?.id ? "active" : ""} ${group.folder ? "nested" : ""}`;
      row.draggable = true;
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
      row.addEventListener("dragstart", (e) => {
        e.dataTransfer?.setData(INTERNAL_DND_TYPE, vf.id);
        if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
      });
      fileListEl.appendChild(row);
    }
  }
}

// A private MIME type marks a drag that started on a sidebar file row, so a
// folder drop can tell "move this loaded file" from "upload these OS files".
const INTERNAL_DND_TYPE = "application/x-ewp-file-id";

function wireFolderDropTarget(el: HTMLElement, folder: string) {
  el.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    el.classList.add("folder-drop");
  });
  el.addEventListener("dragleave", () => el.classList.remove("folder-drop"));
  el.addEventListener("drop", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    el.classList.remove("folder-drop");
    const movedId = e.dataTransfer?.getData(INTERNAL_DND_TYPE);
    if (movedId) {
      fileManager.moveToFolder(movedId, folder);
    } else if (e.dataTransfer) {
      await ingest(await fromDataTransfer(e.dataTransfer), folder);
    }
  });
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

  const activeId = fileManager.activeFile?.id ?? null;
  // Category filter narrows the pool before counts/tabs are derived, so a hidden
  // category's rows never inflate the tab badges — counts must match what's shown.
  const categoryPassing = rows.filter(
    (r) => !DIAGNOSIS_CATEGORY_SET.has(r.problem.branch) || categoryFilter.has(r.problem.branch),
  );
  const counts: Record<ProblemTab, number> = { error: 0, warning: 0, info: 0, thisfile: 0 };
  for (const { file, problem } of categoryPassing) {
    counts[problem.severity]++;
    if (file.id === activeId) counts.thisfile++;
  }

  renderTabs(counts);

  if (fileManager.allFiles.length === 0) {
    problemsListEl.innerHTML = `<div class="problems-empty">Upload .yaml files to validate them.</div>`;
    return;
  }

  // "This file" isolates every severity for the active file; the others filter by
  // severity. The category multi-select then narrows further — but only touches
  // the defined categories, so parse/root/item branches always stay visible.
  const bySeverity =
    activeTab === "thisfile"
      ? rows.filter((r) => r.file.id === activeId)
      : rows.filter((r) => r.problem.severity === activeTab);
  const shown =
    activeTab === "thisfile"
      ? categoryPassing.filter((r) => r.file.id === activeId)
      : categoryPassing.filter((r) => r.problem.severity === activeTab);
  if (shown.length === 0) {
    const label = activeTab === "thisfile" ? "problems in this file" : `${TAB_LABEL[activeTab].toLowerCase()} to report`;
    const suffix = bySeverity.length > 0 && !categoriesAreDefault() ? " match the category filter" : "";
    problemsListEl.innerHTML = `<div class="problems-empty">No ${label}${suffix}.</div>`;
    return;
  }

  // Group by file so each file's diagnosis collapses independently, preserving
  // the incoming (tab-sorted) order of both files and their problems.
  const groups: { file: LoadedFile; rows: ProblemRow[] }[] = [];
  const byFile = new Map<string, (typeof groups)[number]>();
  for (const r of shown) {
    let g = byFile.get(r.file.id);
    if (!g) {
      g = { file: r.file, rows: [] };
      byFile.set(r.file.id, g);
      groups.push(g);
    }
    g.rows.push(r);
  }

  // Keep the file that owns the caret-focused note expanded, so following the
  // cursor never lands the highlight inside a collapsed group.
  const focusedFileId = focusedProblemKey ? focusedProblemKey.split(":")[0] : null;

  problemsListEl.innerHTML = "";
  for (const group of groups) {
    const collapsed = collapsedProblemFiles.has(group.file.id) && group.file.id !== focusedFileId;
    const header = document.createElement("div");
    header.className = `problem-file ${collapsed ? "collapsed" : ""}`;
    header.innerHTML = `<span class="pf-caret">${icon(ICONS.chevron)}</span><span class="pf-name" title="${escapeHtml(group.file.name)}">${escapeHtml(group.file.name)}</span><span class="pf-count">${group.rows.length}</span>`;
    header.addEventListener("click", () => {
      if (collapsedProblemFiles.has(group.file.id)) collapsedProblemFiles.delete(group.file.id);
      else collapsedProblemFiles.add(group.file.id);
      renderProblemsPanel();
    });
    problemsListEl.appendChild(header);
    if (collapsed) continue;

    for (const { file, problem } of group.rows) {
      const start = file.model.getPositionAt(problem.range[0]);
      const row = document.createElement("div");
      const key = `${file.id}:${problem.range[0]}`;
      row.className = `problem ${problem.severity} ${key === focusedProblemKey ? "cursor-focus" : ""}`;
      row.dataset.key = key;
      row.innerHTML = `<span class="loc">:${start.lineNumber}</span><span class="msg">${escapeHtml(problem.message)}</span><button class="copy-btn" title="Copy diagnosis to clipboard" aria-label="Copy diagnosis to clipboard">${icon(ICONS.copy)}</button><span class="branch">[${escapeHtml(problem.branch)}]</span>`;
      row.addEventListener("click", () => fileManager.revealProblem(file.id, problem.range[0]));
      row.querySelector<HTMLButtonElement>(".copy-btn")!.addEventListener("click", (e) => {
        e.stopPropagation();
        copyDiagnosis(e.currentTarget as HTMLButtonElement, file, problem, start.lineNumber);
      });
      problemsListEl.appendChild(row);
    }
  }
  if (focusedProblemKey) {
    problemsListEl.querySelector(".problem.cursor-focus")?.scrollIntoView({ block: "nearest" });
  }
}

// Copy a single diagnosis as `name.yaml:12 — message [Category]`, the shape a
// user pastes into a validation report's description. Briefly marks the button
// so the copy registers without a disruptive toast.
function copyDiagnosis(
  btn: HTMLButtonElement,
  file: LoadedFile,
  problem: LoadedFile["problems"][number],
  line: number,
): void {
  const text = `${file.name}:${line} — ${problem.message} [${problem.branch}]`;
  navigator.clipboard?.writeText(text).then(
    () => {
      btn.classList.add("copied");
      setTimeout(() => btn.classList.remove("copied"), 1000);
    },
    () => {},
  );
}

// The problem row the editor cursor is currently sitting on (file id + offset),
// so the panel can follow the caret onto a flagged line and highlight its note.
let focusedProblemKey: string | null = null;

function renderTabs(counts: Record<ProblemTab, number>) {
  const tabs: ProblemTab[] = ["error", "warning", "info", "thisfile"];
  problemsTabsEl.innerHTML = "";
  for (const tab of tabs) {
    const btn = document.createElement("button");
    btn.className = `problem-tab ${tab} ${tab === activeTab ? "active" : ""}`;
    btn.title = tab === "thisfile" ? "Show only the active file's problems" : `Show ${TAB_LABEL[tab].toLowerCase()}`;
    const dot = tab === "thisfile" ? `<span class="tab-icon">${icon(ICONS.file)}</span>` : `<span class="tab-dot"></span>`;
    btn.innerHTML = `${dot}${TAB_LABEL[tab]}<span class="tab-count">${counts[tab]}</span>`;
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
  { mode: "az", label: "A - Z", symbol: icon(ICONS.arrowUp, 'class="sort-arrow"') },
  { mode: "za", label: "Z - A", symbol: icon(ICONS.arrowDown, 'class="sort-arrow"') },
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

const filtersAreDefault = () =>
  sidebarFilters.size === DEFAULT_FILTERS.length && DEFAULT_FILTERS.every((s) => sidebarFilters.has(s));

function renderSortFilterMenu() {
  const sortReset = currentSort !== DEFAULT_UPLOAD_SORT;
  const filterReset = !filtersAreDefault();
  const resetBtn = (kind: string) =>
    `<button class="menu-reset" data-reset="${kind}" title="Reset to default">${icon(ICONS.reset)}</button>`;
  sortFilterMenu.innerHTML = `
    <div class="menu-section-head">
      <span class="menu-section-title">Sort</span>${sortReset ? resetBtn("sort") : ""}
    </div>
    ${SORT_OPTIONS.map(
      (o) =>
        `<button class="menu-item sort-item ${o.mode === currentSort ? "active" : ""}" data-sort="${o.mode}">
          <span class="menu-symbol">${o.symbol}</span><span class="menu-label">${o.label}</span>
          <span class="menu-check">${o.mode === currentSort ? "✓" : ""}</span>
        </button>`,
    ).join("")}
    <div class="menu-divider"></div>
    <div class="menu-section-head">
      <span class="menu-section-title">Filter</span>${filterReset ? resetBtn("filter") : ""}
    </div>
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
      renderSortFilterMenu();
      renderFileList();
    });
  });
  sortFilterMenu.querySelectorAll<HTMLButtonElement>(".menu-reset").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (btn.dataset.reset === "sort") {
        currentSort = DEFAULT_UPLOAD_SORT;
      } else {
        sidebarFilters.clear();
        for (const s of DEFAULT_FILTERS) sidebarFilters.add(s);
      }
      renderSortFilterMenu();
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

// ---------- Problems panel: category filter + "file a report" ----------

const catFilterBtn = document.getElementById("catfilter-btn")!;
const catFilterMenu = document.getElementById("catfilter-menu")!;
const reportBtn = document.getElementById("report-btn")!;
const reportMenu = document.getElementById("report-menu")!;

function renderCatFilterMenu() {
  const reset = !categoriesAreDefault();
  // Only offer categories that the current diagnoses actually produced, in
  // ascending alphabetical order — a filter for a category that can't appear
  // right now is just noise (ticket 13 round 7).
  const present = presentSortedCategories(
    fileManager.allFiles.flatMap((f) => f.problems.map((p) => p.branch)),
  );
  const items =
    present.length > 0
      ? present
          .map(
            (c) =>
              `<label class="menu-item filter-item">
          <input type="checkbox" data-cat="${escapeHtml(c)}" ${categoryFilter.has(c) ? "checked" : ""} />
          <span class="menu-label">${escapeHtml(c)}</span>
        </label>`,
          )
          .join("")
      : `<div class="menu-empty">No categorised diagnoses.</div>`;
  catFilterMenu.innerHTML = `
    <div class="menu-section-head">
      <span class="menu-section-title">Categories</span>
      ${reset ? `<button class="menu-reset" data-reset="cat" title="Show all categories">${icon(ICONS.reset)}</button>` : ""}
    </div>
    ${items}
  `;
  catFilterMenu.querySelectorAll<HTMLInputElement>("input[data-cat]").forEach((cb) => {
    cb.addEventListener("change", () => {
      const c = cb.dataset.cat!;
      if (cb.checked) categoryFilter.add(c);
      else categoryFilter.delete(c);
      renderCatFilterMenu();
      renderProblemsPanel();
    });
  });
  catFilterMenu.querySelector<HTMLButtonElement>(".menu-reset")?.addEventListener("click", (e) => {
    e.stopPropagation();
    categoryFilter.clear();
    for (const c of DIAGNOSIS_CATEGORIES) categoryFilter.add(c);
    renderCatFilterMenu();
    renderProblemsPanel();
  });
}

catFilterBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  reportMenu.setAttribute("hidden", "");
  if (catFilterMenu.hasAttribute("hidden")) {
    renderCatFilterMenu();
    catFilterMenu.removeAttribute("hidden");
  } else {
    catFilterMenu.setAttribute("hidden", "");
  }
});
document.addEventListener("click", (e) => {
  if (!catFilterMenu.hasAttribute("hidden") && !catFilterMenu.contains(e.target as Node) && e.target !== catFilterBtn) {
    catFilterMenu.setAttribute("hidden", "");
  }
});

// ---- File a report (opens a prefilled GitHub issue) ----

const REPORT_TYPES = ["Bug", "Validation", "Feedback"] as const;
type ReportType = (typeof REPORT_TYPES)[number];
const REPORT_LABEL: Record<ReportType, string> = { Bug: "bug", Validation: "validation", Feedback: "feedback" };
const REPORT_ISSUE_URL = "https://github.com/z-eall/ew_toolkit/issues/new";

let reportType: ReportType = "Bug";
let reportCategory: string = DIAGNOSIS_CATEGORIES[0];
let reportDescription = "";

function renderReportMenu() {
  const showCategory = reportType === "Validation";
  reportMenu.innerHTML = `
    <div class="report-heading">File a report</div>
    <label class="report-field">
      <span class="report-label">Tag</span>
      <select class="report-select" id="report-type">
        ${REPORT_TYPES.map((t) => `<option ${t === reportType ? "selected" : ""}>${t}</option>`).join("")}
      </select>
    </label>
    ${
      showCategory
        ? `<label class="report-field">
            <span class="report-label">Category</span>
            <select class="report-select" id="report-category">
              ${DIAGNOSIS_CATEGORIES.map((c) => `<option ${c === reportCategory ? "selected" : ""}>${escapeHtml(c)}</option>`).join("")}
            </select>
          </label>`
        : ""
    }
    <label class="report-field">
      <span class="report-label">Description</span>
      <textarea class="report-textarea" id="report-desc" rows="4" placeholder="Describe the issue. For a validation report, paste the copied diagnosis here.">${escapeHtml(reportDescription)}</textarea>
    </label>
    <div class="report-foot">
      <button class="report-submit" id="report-submit">Open GitHub issue</button>
      <span class="report-note">Opens a prefilled issue in a new tab — review before submitting.</span>
    </div>
  `;

  const typeSel = reportMenu.querySelector<HTMLSelectElement>("#report-type")!;
  typeSel.addEventListener("change", () => {
    reportType = typeSel.value as ReportType;
    renderReportMenu();
  });
  reportMenu.querySelector<HTMLSelectElement>("#report-category")?.addEventListener("change", (e) => {
    reportCategory = (e.currentTarget as HTMLSelectElement).value;
  });
  const desc = reportMenu.querySelector<HTMLTextAreaElement>("#report-desc")!;
  desc.addEventListener("input", () => {
    reportDescription = desc.value;
  });
  reportMenu.querySelector<HTMLButtonElement>("#report-submit")!.addEventListener("click", (e) => {
    e.stopPropagation();
    submitReport();
  });
}

function submitReport() {
  const isValidation = reportType === "Validation";
  const catPart = isValidation ? `: ${reportCategory}` : "";
  const title = `[${reportType}${catPart}] EWP Validator report`;
  const body = [
    `**Tag:** ${reportType}`,
    isValidation ? `**Category:** ${reportCategory}` : "",
    "",
    "**Description:**",
    reportDescription.trim() || "_(no description provided)_",
    "",
    "---",
    `_${meta.ewpVersion ? `EWP ${meta.ewpVersion}` : "EWP version unknown"} · schema generated ${meta.generatedAt}_`,
  ]
    .filter((line) => line !== "")
    .join("\n");
  const url =
    `${REPORT_ISSUE_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}` +
    `&labels=${encodeURIComponent(REPORT_LABEL[reportType])}`;
  window.open(url, "_blank", "noopener");
  reportMenu.setAttribute("hidden", "");
}

reportBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  catFilterMenu.setAttribute("hidden", "");
  if (reportMenu.hasAttribute("hidden")) {
    renderReportMenu();
    reportMenu.removeAttribute("hidden");
  } else {
    reportMenu.setAttribute("hidden", "");
  }
});
document.addEventListener("click", (e) => {
  if (!reportMenu.hasAttribute("hidden") && !reportMenu.contains(e.target as Node) && e.target !== reportBtn) {
    reportMenu.setAttribute("hidden", "");
  }
});

// ---------- Loading files: pickers, folders, and drag-and-drop ----------

interface Ingestable {
  file: File;
  relPath: string;
}

const isYaml = (name: string) => /\.ya?ml$/i.test(name);

// The folder a newly-created or newly-uploaded loose item (one with no path/
// folder context of its own) lands in: the active file's folder, matching
// "append to the current selected folder" — but when nothing is loaded yet
// (no active file to anchor to), default into DEFAULT_FOLDER_NAME rather than
// the root, so a fresh upload/drop/typed draft is never left loose. Once a
// file exists, its folder is respected as-is (including "" if the user
// explicitly dragged something out to the root) rather than re-defaulted.
const currentFolder = () => (fileManager.activeFile ? fileManager.activeFile.folder : DEFAULT_FOLDER_NAME);

/**
 * Add uploaded files to the panel. `defaultFolder` is used for entries with no
 * captured directory (the plain file picker, or a loose drop). Uploaded files
 * are never silently renamed on collision — a name+folder clash with an already
 * loaded file prompts a single overwrite/cancel decision for the whole batch.
 */
async function ingest(entries: Ingestable[], defaultFolder = "") {
  const yamls = entries.filter((e) => isYaml(e.file.name));
  if (yamls.length === 0) return;

  const prepared: { name: string; content: string; folder: string }[] = [];
  for (const { file, relPath } of yamls) {
    prepared.push({
      name: file.name,
      content: await file.text(),
      folder: folderFromRelativePath(relPath) || defaultFolder,
    });
  }

  const dups = prepared.filter((p) => fileManager.exists(p.name, p.folder));
  if (dups.length > 0) {
    const names = dups.map((d) => (d.folder ? `${d.folder}/${d.name}` : d.name)).join("\n  ");
    const ok = confirm(
      `${dups.length} uploaded file${dups.length > 1 ? "s" : ""} already loaded:\n  ${names}\n\n` +
        `Overwrite ${dups.length > 1 ? "them" : "it"} with the uploaded version? Click Cancel to abort the whole upload.`,
    );
    if (!ok) return;
  }

  for (const p of prepared) fileManager.upsertUploaded(p.name, p.content, p.folder);
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
  // "+ upload files" appends to the current selected folder (browsers strip the
  // real directory from individually-picked files, so there is nothing to capture).
  if (fileInput.files) ingest(fromFileList(fileInput.files), currentFolder());
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
  if (!e.dataTransfer) return;
  // An internal file-row drag dropped on the sidebar (not on a folder) moves the
  // file back out to the root — that's an explicit user placement, unaffected
  // by the loose-upload default below. OS files/folders dropped here without a
  // folder row target use the same "current folder, else default" fallback as
  // the upload picker; a real dropped folder tree still keeps its own paths.
  const movedId = e.dataTransfer.getData(INTERNAL_DND_TYPE);
  if (movedId) fileManager.moveToFolder(movedId, "");
  else ingest(await fromDataTransfer(e.dataTransfer), currentFolder());
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

// When nothing is loaded the editor shows a throwaway draft model so the user
// can type. The loose file is only *created* once they type a real character
// (not merely by focusing/clicking in): the first keystroke promotes the draft
// model itself into a real file (adoptModel, no model swap — swapping mid-
// keystroke drops the rest of the input) and a fresh draft is minted for next
// time. A yaml URI keeps completion/hover working while it's still a draft.
let draftSeq = 0;
let draftModel: monaco.editor.ITextModel;

function newDraftModel(): monaco.editor.ITextModel {
  const model = monaco.editor.createModel("", "yaml", monaco.Uri.parse(`file:///draft/${draftSeq++}/unnamed.yaml`));
  model.onDidChangeContent(() => {
    if (model !== draftModel || fileManager.allFiles.length !== 0) return; // stale draft, or already promoted
    if (model.getValue().trim() === "") return; // stray whitespace doesn't count as "started typing"
    // A draft only ever fires while nothing is loaded (guarded above), so
    // currentFolder() is always DEFAULT_FOLDER_NAME here — using it anyway
    // keeps this in step with the other loose-creation paths.
    fileManager.adoptModel(model, DEFAULT_FILE_NAME, currentFolder(), { ephemeral: true, dirty: true });
    draftModel = newDraftModel();
  });
  return model;
}
draftModel = newDraftModel();

function showDraftIfEmpty() {
  if (fileManager.allFiles.length === 0 && editor.getModel() !== draftModel) {
    editor.setModel(draftModel);
  }
}

// The explicit "+ Add a file" — a deliberate empty file that persists (unlike a
// typed draft, it isn't auto-removed when empty).
function addBlankFile(folder: string) {
  const file = fileManager.addFile(DEFAULT_FILE_NAME, "", folder);
  fileManager.setActive(file.id);
  editor.focus();
}

// "Add a folder" makes a new folder holding one fresh file (the app has no
// empty-folder state — a folder exists only as long as it has a file).
function addFolder() {
  const folder = fileManager.uniqueFolderName(DEFAULT_FOLDER_NAME);
  addBlankFile(folder);
}

const NEW_OPTIONS: { action: "file" | "folder"; label: string }[] = [
  { action: "file", label: "Add a file" },
  { action: "folder", label: "Add a folder" },
];

function renderNewMenu() {
  newMenu.innerHTML = NEW_OPTIONS.map(
    (o) => `<button class="menu-item new-item" data-new="${o.action}"><span class="menu-label">${o.label}</span></button>`,
  ).join("");
  newMenu.querySelectorAll<HTMLButtonElement>(".new-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.new === "folder") addFolder();
      else addBlankFile(currentFolder());
      newMenu.setAttribute("hidden", "");
    });
  });
}

newFileBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (newMenu.hasAttribute("hidden")) {
    renderNewMenu();
    newMenu.removeAttribute("hidden");
  } else {
    newMenu.setAttribute("hidden", "");
  }
});
document.addEventListener("click", (e) => {
  if (!newMenu.hasAttribute("hidden") && !newMenu.contains(e.target as Node) && e.target !== newFileBtn) {
    newMenu.setAttribute("hidden", "");
  }
});

// ---------- Clear all (trash) + leave guards ----------

clearAllBtn.addEventListener("click", () => {
  if (fileManager.allFiles.length === 0) return;
  const ok = confirm(
    "Clear all loaded files?\n\nThis empties the panel and the editor. Make sure you've saved anything you want to keep — cleared files can't be recovered.",
  );
  if (ok) fileManager.clearAll();
});

// Leaving the page drops the in-memory files, so warn while there is unsaved
// work. This one handler covers every way out that clears them: closing the
// tab, reloading, and clicking a hub nav link to another sub-site (each sub-site
// is its own document, so those links are full navigations that fire unload).
window.addEventListener("beforeunload", (e) => {
  if (fileManager.hasUnsavedWork()) {
    e.preventDefault();
    // A non-empty returnValue is required to actually raise the native leave
    // dialog: an empty string is the legacy signal for "no prompt", so several
    // browsers (Firefox, Safari, older Chrome) silently skipped it — which is
    // why closing/switching on the live site never warned. The text itself is
    // ignored by modern browsers, but the value must be truthy.
    e.returnValue = "You have unsaved changes.";
  }
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
  // Follow the caret onto the matching severity tab — but never yank the user
  // off the "This file" view, which already shows every severity for this file.
  if (best && activeTab !== "thisfile" && activeTab !== best.severity) activeTab = best.severity;
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

// The loaded files a given save scope writes, so they can be marked saved
// (clears their unsaved flag; protects a typed draft from auto-removal).
function savedByScope(scope: SaveScope): LoadedFile[] {
  const active = fileManager.activeFile;
  if (scope === "all") return [...fileManager.allFiles];
  if (scope === "file") return active ? [active] : [];
  return active ? fileManager.allFiles.filter((f) => f.folder === active.folder) : [];
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
  fileManager.markSaved(savedByScope(scope).map((f) => f.id));
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
