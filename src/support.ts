import "./style.css";
import { navHtml, mountThemeToggle } from "./nav";

interface SupportEntry {
  name: string;
  desc: string;
  url: string | null;
  img: string;
}

const base = import.meta.env.BASE_URL;

const primary: SupportEntry[] = [
  {
    name: "Jere",
    desc: 'Creator of <a class="mention-link" href="https://thunderstore.io/c/valheim/p/JereKuusela/" target="_blank" rel="noopener noreferrer">Expand World mods</a> and owner of Valheim World Editing discord.<br />He is also a master of the art of speaking... "very efficiently".',
    url: "https://buymeacoffee.com/jerekuusela",
    img: "https://github.com/JereKuusela.png",
  },
  {
    name: "Z e a l l",
    desc: "Creator of EW Toolkit site, accepting donations to support my modded Valheim projects and vibe-coding projects.",
    url: "https://ko-fi.com/zeall",
    img: "https://github.com/z-eall.png",
  },
];

const hivemind: SupportEntry[] = [
  {
    name: "Raaka",
    desc: "Master wizard of Hivemind, you will find his wisdom everywhere, or in forest with a BMX.",
    url: "https://ko-fi.com/j427967",
    img: `${base}support/raaka.png`,
  },
  {
    name: "DhakhaR",
    desc: "Mechanicus Tech Priest, supporting him consider praising the Omnissiah.",
    url: "https://buymeacoffee.com/camsyuyelq",
    img: `${base}support/dhakhar.png`,
  },
  {
    name: "JPValheim",
    desc: "Diplomat officer, his flying bonemaws fetch people to VWE.",
    url: "https://www.patreon.com/JPValheim",
    img: `${base}support/jpvalheim.png`,
  },
  {
    name: ":fire:",
    desc: "Vibe codding maniac, he builds crazy tools and he doesn't sleep.",
    url: "https://paypal.me/tjt1013",
    img: `${base}support/fire.png`,
  },
];

const special: SupportEntry[] = [
  {
    name: "Haloa",
    desc: 'Creator of the <a class="mention-link" href="https://valheimtools.stream/" target="_blank" rel="noopener noreferrer">Valheim Tools site</a>, and a phenomenal Valheim builder for those in the know.',
    url: null,
    img: `${base}support/haloa.png`,
  },
];

// simple-icons "discord" glyph, filled currentColor (outline doesn't read
// as the logo at this size the way it does for the nav's line icons).
const discordIcon = `
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1277 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6066 3.9495-1.5218 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>
`;

const card = (e: SupportEntry) => `
  <div class="support-card">
    <img class="support-card-img" src="${e.img}" alt="" loading="lazy" />
    <div class="support-card-body">
      <div class="support-card-name">${e.name}</div>
      ${e.desc ? `<div class="support-card-desc">${e.desc}</div>` : ""}
      <a class="support-link" ${e.url ? `href="${e.url}" target="_blank" rel="noopener noreferrer"` : ""}>Support</a>
    </div>
  </div>
`;

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  ${navHtml("support")}
  <div class="landing">
    <h1>Support</h1>
    <p class="tagline">If you enjoy using Valheim world editing mods or tools, consider supporting the people behind them.</p>
    <div class="support-links">
      ${primary.map(card).join("")}
    </div>

    <div class="support-section-label">Hivemind</div>
    <p class="support-section-desc">Other wizards taking care of the VWE community.</p>
    <div class="support-links">
      ${hivemind.map(card).join("")}
    </div>

    <div class="support-section-label">Also Worth Supporting</div>
    <div class="support-links">
      ${special.map(card).join("")}
    </div>

    <div class="support-section-label">Find us here</div>
    <a class="support-discord" href="https://discord.gg/VFRJcPwUdm" target="_blank" rel="noopener noreferrer">
      <span class="support-discord-icon" aria-hidden="true">${discordIcon}</span>
      Valheim World Editing
    </a>
  </div>
`;

mountThemeToggle();
