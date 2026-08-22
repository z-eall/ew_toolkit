/**
 * PROTOTYPE — confirm modal large-list (wayfinder tickets 02 & 03).
 * Four variants × three file counts. Cycle with ←/→ ; switch count with 1/2/3 keys.
 */
import "../style.css";
import "./confirm-modal-large-list.css";

type VariantKey = "baseline" | "adaptive-pre" | "adaptive-ul" | "boxed-pre" | "boxed-ul";
type CountKey = "3" | "12" | "160";

const VARIANTS: { key: VariantKey; label: string; q1: string; q2: string }[] = [
  { key: "baseline", label: "Baseline (today)", q1: "Unbounded — broken at scale", q2: "pre-line in one <p>" },
  { key: "adaptive-pre", label: "Adaptive + pre-line", q1: "Box only when 10+ files", q2: "pre-line in scroll box" },
  { key: "adaptive-ul", label: "Adaptive + ul/li", q1: "Box only when 10+ files", q2: "<ul><li> list" },
  { key: "boxed-pre", label: "Always boxed + pre-line", q1: "List box even for 3 files", q2: "pre-line in scroll box" },
  { key: "boxed-ul", label: "Always boxed + ul/li", q1: "List box even for 3 files", q2: "<ul><li> list" },
];

const COUNTS: { key: CountKey; n: number; label: string }[] = [
  { key: "3", n: 3, label: "3 files" },
  { key: "12", n: 12, label: "12 files" },
  { key: "160", n: 160, label: "160 files" },
];

const ADAPTIVE_THRESHOLD = 10;

function sampleNames(n: number): string[] {
  const out: string[] = [];
  for (let i = 1; i <= n; i++) {
    out.push(i % 3 === 0 ? `mods/extra/wrong_name_${i}.txt` : `expand_prefabs_${i}.yaml`);
  }
  return out;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function summaryIntro(count: number): string {
  return (
    `${count} uploaded file${count > 1 ? "s" : ""} don't match an EWP structural filename ` +
    `(expand_prefabs*.yaml, expand_data*.yaml, or data*.yaml):`
  );
}

function renderPreLine(names: string[]): string {
  return names.map((n) => `  ${n}`).join("\n");
}

function renderUl(names: string[]): string {
  return `<ul>${names.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>`;
}

interface ModalParts {
  boxClass: string;
  bodyHtml: string;
}

function buildModal(variant: VariantKey, count: number, names: string[]): ModalParts {
  const intro = escapeHtml(summaryIntro(count));
  const buttons = `
    <div class="confirm-buttons">
      <button type="button" class="confirm-btn primary">Skip these files</button>
      <button type="button" class="confirm-btn">Proceed anyway</button>
      <button type="button" class="confirm-btn">Cancel upload</button>
    </div>`;

  if (variant === "baseline") {
    const message = `${summaryIntro(count)}:\n${renderPreLine(names)}`;
    return {
      boxClass: "confirm-box baseline-broken",
      bodyHtml: `<p class="confirm-message">${escapeHtml(message)}</p>${buttons}`,
    };
  }

  const useBox = variant.startsWith("boxed-") || count >= ADAPTIVE_THRESHOLD;
  const useUl = variant.endsWith("-ul");

  if (!useBox) {
    const namesBlock = useUl
      ? `<div class="inline-names">${renderUl(names)}</div>`
      : `<div class="inline-names">${escapeHtml(renderPreLine(names))}</div>`;
    return {
      boxClass: "confirm-box is-flex confirm-adaptive-short",
      bodyHtml: `<p class="confirm-summary">${intro}${namesBlock}</p>${buttons}`,
    };
  }

  const listInner = useUl
    ? renderUl(names)
    : escapeHtml(renderPreLine(names));
  const listClass = useUl ? "confirm-list-scroll" : "confirm-list-scroll pre-line";

  return {
    boxClass: "confirm-box is-flex",
    bodyHtml: `
      <p class="confirm-summary">${intro}</p>
      <div class="${listClass}">${listInner}</div>
      ${buttons}`,
  };
}

function getParam(name: string, fallback: string): string {
  return new URLSearchParams(location.search).get(name) ?? fallback;
}

function setParams(updates: Record<string, string>): void {
  const p = new URLSearchParams(location.search);
  for (const [k, v] of Object.entries(updates)) p.set(k, v);
  history.replaceState(null, "", `?${p.toString()}`);
}

function variantIndex(key: VariantKey): number {
  return VARIANTS.findIndex((v) => v.key === key);
}

function render(): void {
  const variantKey = getParam("variant", "boxed-ul") as VariantKey;
  const countKey = getParam("count", "12") as CountKey;
  const vi = Math.max(0, variantIndex(variantKey));
  const variant = VARIANTS[vi] ?? VARIANTS[0];
  const countSpec = COUNTS.find((c) => c.key === countKey) ?? COUNTS[1];
  const names = sampleNames(countSpec.n);
  const modal = buildModal(variant.key, countSpec.n, names);

  const root = document.getElementById("prototype-root")!;
  root.innerHTML = `
    <div class="prototype-backdrop">
      <div class="prototype-state">
        <strong>State</strong>
        variant: ${variant.key}<br/>
        Q1: ${variant.q1}<br/>
        Q2: ${variant.q2}<br/>
        files: ${countSpec.n}<br/>
        adaptive threshold: ${ADAPTIVE_THRESHOLD}<br/>
        buttons pinned: ${variant.key === "baseline" && countSpec.n >= 160 ? "NO — scroll page" : "yes (in modal)"}
      </div>
      <div class="prototype-shell">
        <aside class="prototype-sidebar">
          <h2>Files (dimmed)</h2>
          ${names.slice(0, 8).map((n) => `<div class="fake-file">${escapeHtml(n)}</div>`).join("")}
          ${countSpec.n > 8 ? `<div class="fake-file">… ${countSpec.n - 8} more</div>` : ""}
        </aside>
        <main class="prototype-main">
          <h1>EWP Validator</h1>
          <p>Background chrome — modal is what you're judging.</p>
        </main>
      </div>
      <div class="confirm-overlay" style="display:flex">
        <div class="${modal.boxClass}" role="alertdialog" aria-modal="true">
          ${modal.bodyHtml}
        </div>
      </div>
      <div class="prototype-controls">
        <div class="prototype-count-bar">
          ${COUNTS.map(
            (c) =>
              `<button type="button" data-count="${c.key}" class="${c.key === countKey ? "active" : ""}">${c.label}</button>`,
          ).join("")}
        </div>
        <div class="prototype-switcher">
          <button type="button" id="prev-variant" title="Previous variant (←)">←</button>
          <span>${variant.label} — ${variant.q1}; ${variant.q2}</span>
          <button type="button" id="next-variant" title="Next variant (→)">→</button>
        </div>
      </div>
    </div>`;

  document.getElementById("prev-variant")!.addEventListener("click", () => {
    const i = (vi - 1 + VARIANTS.length) % VARIANTS.length;
    setParams({ variant: VARIANTS[i].key });
    render();
  });
  document.getElementById("next-variant")!.addEventListener("click", () => {
    const i = (vi + 1) % VARIANTS.length;
    setParams({ variant: VARIANTS[i].key });
    render();
  });
  root.querySelectorAll("[data-count]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setParams({ count: (btn as HTMLElement).dataset.count! });
      render();
    });
  });
}

document.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  const variantKey = getParam("variant", "boxed-ul") as VariantKey;
  const countKey = getParam("count", "12") as CountKey;
  const vi = Math.max(0, variantIndex(variantKey));

  if (e.key === "ArrowLeft") {
    e.preventDefault();
    const i = (vi - 1 + VARIANTS.length) % VARIANTS.length;
    setParams({ variant: VARIANTS[i].key });
    render();
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    const i = (vi + 1) % VARIANTS.length;
    setParams({ variant: VARIANTS[i].key });
    render();
  } else if (e.key === "1") {
    setParams({ count: "3" });
    render();
  } else if (e.key === "2") {
    setParams({ count: "12" });
    render();
  } else if (e.key === "3") {
    setParams({ count: "160" });
    render();
  }
});

render();
