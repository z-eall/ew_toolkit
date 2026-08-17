import "./style.css";
import { navHtml, mountThemeToggle, iconFor } from "./nav";

// Hardcoded v1 Tool registration — see .scratch/ew_toolkit/hub-map.md Notes.
// `key` matches the corresponding entry in nav.ts's navItems and picks the
// tool's icon via iconFor; omit it (or use a key with no icon mapping) and
// the tool gets nav.ts's default icon automatically.
interface Tool {
  key: string;
  name: string;
  subpath: string;
  description: string;
}

const tools: Tool[] = [
  {
    key: "ewp_validator",
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
          <a class="tool-btn" href="${t.subpath}"><span class="nav-icon" aria-hidden="true">${iconFor(t.key)}</span>${t.name}</a>
          <span class="tool-desc">${t.description}</span>
        </div>
      `,
        )
        .join("")}
    </div>
  </div>
`;

mountThemeToggle();
