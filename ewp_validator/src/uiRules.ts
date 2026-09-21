// Small decisions pulled out of the page code so tests can pin them down (round 6 ticket 13).
// Each one shipped once and broke once; keep them pure (no DOM, no Monaco).

/** True if any file with content still has unsaved edits. Drives the "leave this page?" warning. */
export function anyUnsavedWork(files: ReadonlyArray<{ dirty: boolean; text: string }>): boolean {
  return files.some((f) => f.dirty && f.text.trim() !== "");
}

/**
 * Applies the "leave this page?" warning to a beforeunload event. Returns true if it asked
 * the browser to prompt. The returnValue must be a non-empty string: an empty string is the
 * legacy "no prompt" signal, so Firefox and Safari silently skipped the warning on the live site.
 */
export function applyLeaveWarning(
  e: { preventDefault(): void; returnValue: string },
  unsaved: boolean,
): boolean {
  if (!unsaved) return false;
  e.preventDefault();
  e.returnValue = "You have unsaved changes.";
  return true;
}

export type ConfirmKeyResult =
  | { handled: false }
  | { handled: true; resolve: string | null };

/**
 * What a key press does in the confirm dialog. Escape always picks the safe (cancel) value.
 * Enter is always swallowed, and picks the primary button only when the dialog opted in
 * (allowEnter). So a stray Enter can never confirm a destructive choice.
 */
export function confirmKeyDecision(
  key: string,
  opts: { allowEnter?: boolean; cancelValue: string; primaryValue: string | null },
): ConfirmKeyResult {
  if (key === "Escape") return { handled: true, resolve: opts.cancelValue };
  if (key === "Enter") {
    return { handled: true, resolve: opts.allowEnter && opts.primaryValue !== null ? opts.primaryValue : null };
  }
  return { handled: false };
}

/** Index of the button that gets focus when the dialog opens: the primary one, else the first. */
export function initialFocusIndex(buttons: ReadonlyArray<{ primary?: boolean }>): number {
  const i = buttons.findIndex((b) => b.primary);
  return i >= 0 ? i : 0;
}

export const RENAME_NOTE_DISMISS_EVENTS = ["mousemove", "mousedown", "keydown"] as const;

interface DismissTarget {
  addEventListener(type: string, listener: () => void, options: { once: boolean; capture: boolean }): void;
  removeEventListener(type: string, listener: () => void, options: { capture: boolean }): void;
}

/**
 * The rename note stays up until the scripter does something else. This arms that: after one tick
 * (so the click or key that caused the note does not close it at once) it listens for the events
 * above, once each. The listeners must be capture-phase: Monaco stops mousedown and keydown before
 * they bubble to the document, so a bubble-phase listener never saw a click inside the editor and
 * the note stayed up (shipped once, fixed, now pinned by a test). Returns a function that undoes it.
 */
export function armRenameNoteDismiss(
  target: DismissTarget,
  dismiss: () => void,
  timers: { set(fn: () => void): number; clear(id: number): void },
): () => void {
  const timer = timers.set(() => {
    for (const type of RENAME_NOTE_DISMISS_EVENTS) target.addEventListener(type, dismiss, { once: true, capture: true });
  });
  return () => {
    timers.clear(timer);
    for (const type of RENAME_NOTE_DISMISS_EVENTS) target.removeEventListener(type, dismiss, { capture: true });
  };
}
