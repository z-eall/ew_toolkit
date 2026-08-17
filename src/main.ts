import "./style.css";

// Hardcoded v1 Tool registration — see .scratch/ewp-toolkit/hub-map.md Notes.
// Visual design/layout is ticket 18's job; this is a minimal placeholder so
// the hub has a working root page.
interface Tool {
  name: string;
  subpath: string;
  description: string;
}

const tools: Tool[] = [
  {
    name: "EWP Validator",
    subpath: "./ewp_validator/",
    description:
      "Validate EWP YAML files for Jere Kuusela's ExpandWorld Prefab mod.",
  },
];

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  <h1>EW Toolkit</h1>
  <ul id="tool-list"></ul>
`;

const list = app.querySelector<HTMLUListElement>("#tool-list")!;
for (const tool of tools) {
  const item = document.createElement("li");
  item.innerHTML = `<a href="${tool.subpath}">${tool.name}</a> — ${tool.description}`;
  list.appendChild(item);
}
