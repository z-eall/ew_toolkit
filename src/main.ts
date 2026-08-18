import "./style.css";
import { navHtml, mountThemeToggle, iconFor, toolboxIcon } from "./nav";

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
    description: "Validate Expand World Prefabs YAML files.",
  },
];

interface Mention {
  icon: string;
  name: string;
  url: string;
  description: string;
}

const mentions: Mention[] = [
  {
    icon: toolboxIcon,
    name: "Valheim Tools by Haloa",
    url: "https://valheimtools.stream/",
    description: "Another collection kit of useful Valheim world editing tools.",
  },
];

const tagline = "QoL tools for Valheim world editing.";

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

    <div class="mentions-section">
      <div class="support-section-label">Also Worth a Look</div>
      <div class="tool-rows">
        ${mentions
          .map(
            (m) => `
          <div class="tool-row">
            <a class="tool-btn" href="${m.url}" target="_blank" rel="noopener noreferrer"><span class="nav-icon" aria-hidden="true">${m.icon}</span>${m.name}</a>
            <span class="tool-desc">${m.description}</span>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
  </div>
`;

mountThemeToggle();
