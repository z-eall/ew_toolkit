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
