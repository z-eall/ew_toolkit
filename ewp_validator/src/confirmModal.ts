// Custom in-app replacement for window.confirm() (ticket 09,
// .scratch/validator-round2/issues/09-custom-confirm-modal.md): native
// confirm() is hard-capped at two buttons in every browser, and this Tool
// needs a real 3-way choice at one call site. Styled with the shared hub
// identity tokens so it reads as the same site as everything else. Kept
// local to this Tool rather than shared/ — the hub-wide audit found no
// other Tool has any confirm-style dialog yet, so there's no second
// consumer to prove a shared shape against (same discipline as leaving the
// theme-toggle mechanism un-shared, see ew_toolkit/hub-map.md's Not yet
// specified).
//
// Long filename lists (confirm-modal-large-list tickets 02–04): pass
// `fileList` so the modal owns the always-boxed bullet scroll region.
export interface ConfirmButton {
  label: string;
  value: string;
  /** Visual emphasis + initial focus. At most one button should set this. */
  primary?: boolean;
  /** Accents the button with the error/danger color. */
  danger?: boolean;
}

export interface ConfirmModalOptions {
  /** Summary text only — no embedded filename blob. */
  message: string;
  /**
   * When set, always-boxed dotted scroll region with one bullet per name
   * (even for 1–3 files). Call sites that only have a short warning omit this.
   */
  fileList?: string[];
  /** Optional aria label for the scroll region; defaults to "Flagged files". */
  fileListLabel?: string;
  buttons: ConfirmButton[];
  /** The value Escape resolves to — always the safe/non-destructive choice. */
  cancelValue: string;
  /**
   * Whether Enter activates the primary button. Default false: every
   * destructive confirm (anything that deletes or overwrites data) must
   * require an explicit click, so a stray Enter left over from typing
   * elsewhere can never trigger data loss. Only the one non-destructive
   * confirm (the upload-gate skip) opts in.
   */
  allowEnter?: boolean;
}

export function showConfirmModal(opts: ConfirmModalOptions): Promise<string> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";

    const box = document.createElement("div");
    box.className = "confirm-box";
    box.setAttribute("role", "alertdialog");
    box.setAttribute("aria-modal", "true");

    const names = opts.fileList;
    if (names && names.length > 0) box.classList.add("has-file-list");

    const messageEl = document.createElement("p");
    messageEl.className = "confirm-message";
    messageEl.id = "confirm-message";
    messageEl.textContent = opts.message;
    box.appendChild(messageEl);
    box.setAttribute("aria-labelledby", "confirm-message");

    if (names && names.length > 0) {
      const scroll = document.createElement("div");
      scroll.className = "confirm-list-scroll";
      scroll.tabIndex = 0;
      const label = opts.fileListLabel ?? "Flagged files";
      scroll.setAttribute("role", "region");
      scroll.setAttribute("aria-label", `${label} (${names.length})`);

      const ul = document.createElement("ul");
      for (const name of names) {
        const li = document.createElement("li");
        li.textContent = name;
        ul.appendChild(li);
      }
      scroll.appendChild(ul);
      box.appendChild(scroll);
    }

    const buttonRow = document.createElement("div");
    buttonRow.className = "confirm-buttons";
    let primaryBtn: HTMLButtonElement | null = null;
    let primaryValue: string | null = null;
    for (const b of opts.buttons) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = ["confirm-btn", b.primary && "primary", b.danger && "danger"].filter(Boolean).join(" ");
      btn.textContent = b.label;
      btn.addEventListener("click", () => finish(b.value));
      buttonRow.appendChild(btn);
      if (b.primary) {
        primaryBtn = btn;
        primaryValue = b.value;
      }
    }
    box.appendChild(buttonRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function finish(value: string) {
      document.removeEventListener("keydown", onKeydown);
      overlay.remove();
      resolve(value);
    }

    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        finish(opts.cancelValue);
        return;
      }
      if (e.key === "Enter") {
        // Swallowed unconditionally (not just left to fall through) so a
        // destructive dialog's focused Cancel button never activates from a
        // stray Enter either — see allowEnter's doc comment.
        e.preventDefault();
        if (opts.allowEnter && primaryValue !== null) finish(primaryValue);
      }
    }
    document.addEventListener("keydown", onKeydown);

    (primaryBtn ?? buttonRow.querySelector("button"))?.focus();
  });
}
