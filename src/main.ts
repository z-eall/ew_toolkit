import "./style.css";
import { navHtml, mountThemeToggle } from "./nav";

// Hardcoded v1 Tool registration — see .scratch/ew_toolkit/hub-map.md Notes.
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

const tagline = "Tools for Jere Kuusela's Valheim mods.";

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  ${navHtml("home")}
  <div class="landing">
    <h1>EW Toolkit</h1>
    <p class="tagline">${tagline}</p>
    <div class="tool-rows">
      ${tools
        .map(
          (t) => `
        <div class="tool-row">
          <a class="tool-btn" href="${t.subpath}">${t.name}</a>
          <span class="tool-desc">${t.description}</span>
        </div>
      `,
        )
        .join("")}
    </div>
  </div>
`;

mountThemeToggle();
