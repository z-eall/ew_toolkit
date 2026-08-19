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
export interface ConfirmButton {
  label: string;
  value: string;
  /** Visual emphasis + initial focus. At most one button should set this. */
  primary?: boolean;
  /** Accents the button with the error/danger color. */
  danger?: boolean;
}

export interface ConfirmModalOptions {
  message: string;
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

    const messageEl = document.createElement("p");
    messageEl.className = "confirm-message";
    messageEl.textContent = opts.message;
    box.appendChild(messageEl);

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
