import type { LoadedFile } from "./fileManager";
import { pickHighestPriority, type Severity } from "./structuralPrecheck";

/** The Problems panel's severity tabs, plus the "This file" tab that shows every severity at once. */
export type ProblemTab = Severity | "thisfile";

export interface FocusedProblemResult {
  /** `${file.id}:${problem.range[0]}` for the winning problem, or null if none is on the cursor's line. */
  key: string | null;
  /** The tab to show — unchanged from `previousTab` unless the winning problem's severity should take over. */
  activeTab: ProblemTab;
  /** True if `key` or `activeTab` differs from what was passed in. */
  changed: boolean;
}

/**
 * The problem row the editor cursor should be following, recomputed from the
 * editor's CURRENT actual cursor position (see `syncFocusedProblem`'s call
 * site in main.ts for why this can't just trust a cursor-changed event to
 * have fired). Picks the highest-priority problem on `cursorLine` and decides
 * whether the active tab should follow it — never yanking the user off
 * "This file", and only switching tabs when the key actually changed.
 */
export function computeFocusedProblem(
  file: LoadedFile | null,
  cursorLine: number,
  previousTab: ProblemTab,
  previousKey: string | null,
): FocusedProblemResult {
  let best: LoadedFile["problems"][number] | null = null;
  if (file) {
    const onLine = file.problems.filter((p) => {
      const startLine = file.model.getPositionAt(p.range[0]).lineNumber;
      const endLine = file.model.getPositionAt(Math.max(p.range[1], p.range[0])).lineNumber;
      return cursorLine >= startLine && cursorLine <= endLine;
    });
    best = pickHighestPriority(onLine);
  }
  const key = best && file ? `${file.id}:${best.range[0]}` : null;
  const keyChanged = key !== previousKey;

  let activeTab = previousTab;
  let tabChanged = false;
  if (keyChanged && best && previousTab !== "thisfile" && previousTab !== best.severity) {
    activeTab = best.severity;
    tabChanged = true;
  }

  return { key, activeTab, changed: keyChanged || tabChanged };
}
