import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import { configureMonacoYaml } from "monaco-yaml";
import yamlWorker from "monaco-yaml/yaml.worker?worker";
import { errorCount, FileManager, type LoadedFile, warningCount } from "./fileManager";
import schemaJson from "./schema.generated.json";
import "./style.css";

(self as unknown as { MonacoEnvironment: monaco.Environment }).MonacoEnvironment = {
  getWorker(_moduleId: string, label: string) {
    if (label === "yaml") return new yamlWorker();
    return new editorWorker();
  },
};

const meta = (schemaJson as any)._meta as { ewpVersion: string | null; generatedAt: string };

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
      <span><b>EWP Toolkit</b> — structural YAML validator</span>
      <span>${meta.ewpVersion ? `EWP ${meta.ewpVersion}` : "EWP version unknown"} · schema generated ${new Date(meta.generatedAt).toLocaleString()}</span>
    </div>
    <div class="app-body">
      <div class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <span>Loaded files</span>
          <span class="sidebar-actions">
            <button class="add-btn" id="add-files-btn" title="Add files">+ Files</button>
            <button class="add-btn" id="add-folder-btn" title="Add folder">+ Folder</button>
          </span>
        </div>
        <div id="file-list"></div>
        <div class="drop-hint">or drop .yaml files here</div>
      </div>
      <div class="main">
        <div class="active-file-name" id="active-file-name"></div>
        <div id="editor"></div>
        <div class="problems">
          <div class="problems-header" id="problems-count">Checking...</div>
          <div id="problems-list"></div>
        </div>
      </div>
    </div>
  </div>
  <input type="file" id="file-input" multiple accept=".yaml,.yml" hidden />
  <input type="file" id="folder-input" webkitdirectory hidden />
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

const sidebarEl = document.getElementById("sidebar")!;
const fileListEl = document.getElementById("file-list")!;
const activeFileNameEl = document.getElementById("active-file-name")!;
const problemsCountEl = document.getElementById("problems-count")!;
const problemsListEl = document.getElementById("problems-list")!;

function render() {
  renderFileList();
  renderActiveFileName();
  renderProblemsPanel();
}

function renderFileList() {
  const active = fileManager.activeFile;
  fileListEl.innerHTML = "";
  for (const file of fileManager.allFiles) {
    const errors = errorCount(file);
    const warnings = warningCount(file);
    const row = document.createElement("div");
    row.className = `file-row ${file.id === active?.id ? "active" : ""}`;
    const badgeClass = errors > 0 ? "err" : warnings > 0 ? "warn" : "ok";
    const badgeText = errors > 0 ? String(errors) : warnings > 0 ? String(warnings) : "✓";
    row.innerHTML = `
      <span class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
      <span class="badge ${badgeClass}">${badgeText}</span>
      <button class="remove-btn" title="Remove file">×</button>
    `;
    row.querySelector(".file-name")!.addEventListener("click", () => fileManager.setActive(file.id));
    row.querySelector(".badge")!.addEventListener("click", () => fileManager.setActive(file.id));
    row.querySelector(".remove-btn")!.addEventListener("click", (e) => {
      e.stopPropagation();
      fileManager.removeFile(file.id);
    });
    fileListEl.appendChild(row);
  }
}

function renderActiveFileName() {
  activeFileNameEl.textContent = fileManager.activeFile?.name ?? "No file open";
}

function renderProblemsPanel() {
  const rows: { file: LoadedFile; problem: LoadedFile["problems"][number] }[] = [];
  for (const file of fileManager.allFiles) {
    for (const problem of file.problems) rows.push({ file, problem });
  }

  if (fileManager.allFiles.length === 0) {
    problemsCountEl.textContent = "No files loaded";
    problemsListEl.innerHTML = `<div class="problems-empty">Add or drop .yaml files to validate them.</div>`;
    return;
  }
  if (rows.length === 0) {
    problemsCountEl.textContent = "No problems found";
    problemsListEl.innerHTML = `<div class="problems-empty">Nothing to report — structural pre-check passed for every loaded file.</div>`;
    return;
  }

  const totalErrors = rows.filter((r) => r.problem.severity === "error").length;
  const totalWarnings = rows.filter((r) => r.problem.severity === "warning").length;
  problemsCountEl.textContent = `${totalErrors} error(s), ${totalWarnings} warning(s) across ${fileManager.allFiles.length} file(s)`;

  problemsListEl.innerHTML = "";
  for (const { file, problem } of rows) {
    const start = file.model.getPositionAt(problem.range[0]);
    const row = document.createElement("div");
    row.className = `problem ${problem.severity}`;
    row.innerHTML = `<span class="loc">${escapeHtml(file.name)}:${start.lineNumber}</span><span>${escapeHtml(problem.message)}</span><span class="branch">[${escapeHtml(problem.branch)}]</span>`;
    row.addEventListener("click", () => fileManager.revealProblem(file.id, problem.range[0]));
    problemsListEl.appendChild(row);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// ---------- Loading files: picker (single/multi + folder) and drag-and-drop ----------

async function addFilesFromList(list: FileList | File[]) {
  const files = Array.from(list).filter((f) => /\.ya?ml$/i.test(f.name));
  for (const f of files) {
    const content = await f.text();
    fileManager.addFile(f.name, content);
  }
}

const fileInput = document.getElementById("file-input") as HTMLInputElement;
const folderInput = document.getElementById("folder-input") as HTMLInputElement;

document.getElementById("add-files-btn")!.addEventListener("click", () => fileInput.click());
document.getElementById("add-folder-btn")!.addEventListener("click", () => folderInput.click());
fileInput.addEventListener("change", () => {
  if (fileInput.files) addFilesFromList(fileInput.files);
  fileInput.value = "";
});
folderInput.addEventListener("change", () => {
  if (folderInput.files) addFilesFromList(folderInput.files);
  folderInput.value = "";
});

sidebarEl.addEventListener("dragover", (e) => {
  e.preventDefault();
  sidebarEl.classList.add("drag-over");
});
sidebarEl.addEventListener("dragleave", () => sidebarEl.classList.remove("drag-over"));
sidebarEl.addEventListener("drop", (e) => {
  e.preventDefault();
  sidebarEl.classList.remove("drag-over");
  if (e.dataTransfer?.files) addFilesFromList(e.dataTransfer.files);
});

// ---------- Initial sample so the page isn't empty on first load ----------

const SAMPLE_YAML = `# Mixed EWP/WEC script file — EWP rule entries, a WEC data entry, a value
# entry, and a value group can all share one array with no tag field.
- prefab: Bonemass
  type: create
  chance: 0.1
  data: ultra_bonemass

- name: ultra_bonemass
  strings:
  - Humanoid.m_name, Ultra Bonemass
  floats:
  - RandomSkillFactor, 1.5

- value: greeting, Hello there

- valueGroup: biome_pool
  values:
  - Meadows
  - BlackForest
`;

fileManager.addFile("expand_prefabs_example.yaml", SAMPLE_YAML);
