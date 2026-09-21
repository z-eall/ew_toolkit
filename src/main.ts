import "./style.css";
import toolList from "../shared/tools.json";
import { navHtml, mountThemeToggle, iconFor, toolboxIcon } from "./nav";

// Tools come from shared/tools.json, the one list (no auto-discovery). `key`
// is also the Tool's folder name and picks its icon via iconFor.
interface Tool {
  key: string;
  name: string;
  subpath: string;
  description: string;
}

const tools: Tool[] = toolList.map((t) => ({
  key: t.key,
  name: t.label,
  subpath: `./${t.key}/`,
  description: t.description,
}));

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
