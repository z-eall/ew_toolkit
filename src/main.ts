import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import { configureMonacoYaml } from "monaco-yaml";
import yamlWorker from "monaco-yaml/yaml.worker?worker";
import schemaJson from "./schema.generated.json";
import { runStructuralPrecheck, type Problem, type Severity } from "./structuralPrecheck";
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
    <div class="app-header">
      <span><b>EWP Toolkit</b> — structural YAML validator</span>
      <span>${meta.ewpVersion ? `EWP ${meta.ewpVersion}` : "EWP version unknown"} · schema generated ${new Date(meta.generatedAt).toLocaleString()}</span>
    </div>
    <div id="editor"></div>
    <div class="problems">
      <div class="problems-header" id="problems-count">Checking...</div>
      <div id="problems-list"></div>
    </div>
  </div>
`;

// monaco-yaml is configured purely for completion/hover here — its own
// diagnostics (validate: false) are deliberately off. Structural validation
// errors are produced entirely by runStructuralPrecheck (ticket 10), not by
// this schema's `oneOf`, and are applied as markers below.
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

const modelUri = monaco.Uri.parse("file:///expand_prefabs.yaml");
const model = monaco.editor.createModel(SAMPLE_YAML, "yaml", modelUri);

const editor = monaco.editor.create(document.getElementById("editor")!, {
  model,
  theme: "vs-dark",
  automaticLayout: true,
  minimap: { enabled: false },
  fontSize: 13,
});

const problemsCountEl = document.getElementById("problems-count")!;
const problemsListEl = document.getElementById("problems-list")!;

const SEVERITY_TO_MARKER: Record<Severity, monaco.MarkerSeverity> = {
  error: monaco.MarkerSeverity.Error,
  warning: monaco.MarkerSeverity.Warning,
  info: monaco.MarkerSeverity.Info,
};

function revalidate() {
  const text = model.getValue();
  const problems = runStructuralPrecheck(text);
  applyMarkers(problems);
  renderProblemsPanel(problems);
}

function applyMarkers(problems: Problem[]) {
  const markers: monaco.editor.IMarkerData[] = problems.map((p) => {
    const start = model.getPositionAt(p.range[0]);
    const end = model.getPositionAt(Math.max(p.range[1], p.range[0] + 1));
    return {
      severity: SEVERITY_TO_MARKER[p.severity],
      message: p.message,
      startLineNumber: start.lineNumber,
      startColumn: start.column,
      endLineNumber: end.lineNumber,
      endColumn: end.column,
    };
  });
  monaco.editor.setModelMarkers(model, "ewp-structural-precheck", markers);
}

function renderProblemsPanel(problems: Problem[]) {
  if (problems.length === 0) {
    problemsCountEl.textContent = "No problems found";
    problemsListEl.innerHTML = `<div class="problems-empty">Nothing to report — structural pre-check passed for every entry.</div>`;
    return;
  }
  const errorCount = problems.filter((p) => p.severity === "error").length;
  const warningCount = problems.filter((p) => p.severity === "warning").length;
  problemsCountEl.textContent = `${errorCount} error(s), ${warningCount} warning(s)`;

  problemsListEl.innerHTML = "";
  for (const p of problems) {
    const start = model.getPositionAt(p.range[0]);
    const row = document.createElement("div");
    row.className = `problem ${p.severity}`;
    row.innerHTML = `<span class="loc">Ln ${start.lineNumber}</span><span>${escapeHtml(p.message)}</span><span class="branch">[${escapeHtml(p.branch)}]</span>`;
    row.addEventListener("click", () => {
      editor.revealLineInCenter(start.lineNumber);
      editor.setPosition(start);
      editor.focus();
    });
    problemsListEl.appendChild(row);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

let debounceHandle: ReturnType<typeof setTimeout> | undefined;
model.onDidChangeContent(() => {
  clearTimeout(debounceHandle);
  debounceHandle = setTimeout(revalidate, 200);
});

revalidate();
