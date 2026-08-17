import "./style.css";
import { navHtml, mountThemeToggle } from "./nav";

// Placeholder page (see .scratch/ew_toolkit/issues — Support nav ticket).
// Real donation links (Jere's + the site owner's) and final appreciation
// copy are still TODO; this ships the page/route/nav slot so it exists.
const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  ${navHtml("support")}
  <div class="landing">
    <h1>Support</h1>
    <p class="tagline">If EW Toolkit's tools save you time, consider supporting the people behind them.</p>
    <div class="support-links">
      <div class="support-card">
        <div class="support-card-name">Jere Kuusela</div>
        <div class="support-card-desc">Creator of ExpandWorld and the other mods this toolkit is built around.</div>
        <span class="support-link-placeholder">TODO: donation link</span>
      </div>
      <div class="support-card">
        <div class="support-card-name">EW Toolkit</div>
        <div class="support-card-desc">Built and maintained by the site owner.</div>
        <span class="support-link-placeholder">TODO: donation link</span>
      </div>
    </div>
  </div>
`;

mountThemeToggle();
