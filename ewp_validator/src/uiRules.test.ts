import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PHONE_MAX_WIDTH, REVEAL_HIGHLIGHT_MS, effectiveValidationMode, isPhoneWidth, nextPhonePanel, RENAME_NOTE_DISMISS_EVENTS, anyUnsavedWork, applyLeaveWarning, armRenameNoteDismiss, confirmKeyDecision, initialFocusIndex } from "./uiRules";

describe("anyUnsavedWork", () => {
  it("is false with no files", () => expect(anyUnsavedWork([])).toBe(false));
  it("is false when files are saved", () => expect(anyUnsavedWork([{ dirty: false, text: "a: 1" }])).toBe(false));
  it("is false when a changed file is empty or only spaces", () => {
    expect(anyUnsavedWork([{ dirty: true, text: "" }, { dirty: true, text: " \n " }])).toBe(false);
  });
  it("is true when one changed file has content", () => {
    expect(anyUnsavedWork([{ dirty: false, text: "x" }, { dirty: true, text: "x" }])).toBe(true);
  });
});

describe("applyLeaveWarning", () => {
  const ev = () => {
    const e = { prevented: false, returnValue: "", preventDefault() { this.prevented = true; } };
    return e;
  };
  it("does nothing when there is no unsaved work", () => {
    const e = ev();
    expect(applyLeaveWarning(e, false)).toBe(false);
    expect(e.prevented).toBe(false);
    expect(e.returnValue).toBe("");
  });
  it("prevents default AND sets a non-empty returnValue (empty string = no prompt in Firefox/Safari)", () => {
    const e = ev();
    expect(applyLeaveWarning(e, true)).toBe(true);
    expect(e.prevented).toBe(true);
    expect(e.returnValue.length).toBeGreaterThan(0);
  });
});

describe("confirmKeyDecision", () => {
  const base = { cancelValue: "cancel", primaryValue: "yes" };
  it("Escape picks the safe value, even when Enter is allowed", () => {
    expect(confirmKeyDecision("Escape", base)).toEqual({ handled: true, resolve: "cancel" });
    expect(confirmKeyDecision("Escape", { ...base, allowEnter: true })).toEqual({ handled: true, resolve: "cancel" });
  });
  it("Enter is swallowed but confirms nothing by default (destructive dialogs)", () => {
    expect(confirmKeyDecision("Enter", base)).toEqual({ handled: true, resolve: null });
  });
  it("Enter picks the primary button only when the dialog opts in", () => {
    expect(confirmKeyDecision("Enter", { ...base, allowEnter: true })).toEqual({ handled: true, resolve: "yes" });
  });
  it("Enter with no primary button confirms nothing, even when allowed", () => {
    expect(confirmKeyDecision("Enter", { ...base, allowEnter: true, primaryValue: null })).toEqual({ handled: true, resolve: null });
  });
  it("other keys are left alone", () => {
    expect(confirmKeyDecision("a", base)).toEqual({ handled: false });
  });
});

describe("initialFocusIndex", () => {
  it("focuses the primary (safe) button", () => expect(initialFocusIndex([{}, { primary: true }, {}])).toBe(1));
  it("falls back to the first button", () => expect(initialFocusIndex([{}, {}])).toBe(0));
});

describe("call sites keep the rules", () => {
  // Only the upload-gate skip may set allowEnter; every other dialog must need a click.
  it("allowEnter appears at most once in main.ts", () => {
    const main = readFileSync(new URL("./main.ts", import.meta.url), "utf8");
    expect((main.match(/allowEnter:\s*true/g) ?? []).length).toBeLessThanOrEqual(1);
  });
  it("no dialog marks a danger button as primary", () => {
    const main = readFileSync(new URL("./main.ts", import.meta.url), "utf8");
    expect(/primary:\s*true[^}]*danger:\s*true|danger:\s*true[^}]*primary:\s*true/.test(main)).toBe(false);
  });
});

describe("rename note dismiss (round 6 ticket 25)", () => {
  const fake = () => {
    const calls: { op: string; type: string; options: Record<string, boolean> }[] = [];
    const target = {
      addEventListener: (type: string, _l: () => void, options: { once: boolean; capture: boolean }) => calls.push({ op: "add", type, options }),
      removeEventListener: (type: string, _l: () => void, options: { capture: boolean }) => calls.push({ op: "remove", type, options }),
    };
    let pending: (() => void) | null = null;
    const cleared: number[] = [];
    const timers = { set: (fn: () => void) => ((pending = fn), 7), clear: (id: number) => void cleared.push(id) };
    return { calls, target, timers, fire: () => pending?.(), cleared };
  };

  it("adds nothing until the tick passes, so the click that made the note does not close it", () => {
    const f = fake();
    armRenameNoteDismiss(f.target, () => {}, f.timers);
    expect(f.calls).toEqual([]);
    f.fire();
    expect(f.calls.map((c) => c.type)).toEqual([...RENAME_NOTE_DISMISS_EVENTS]);
  });

  it("uses capture-phase, once-only listeners (a bubble-phase one never sees a click inside Monaco)", () => {
    const f = fake();
    armRenameNoteDismiss(f.target, () => {}, f.timers);
    f.fire();
    for (const c of f.calls) expect(c.options).toEqual({ once: true, capture: true });
  });

  it("undoing it cancels the timer and removes each listener with the same capture flag", () => {
    const f = fake();
    const undo = armRenameNoteDismiss(f.target, () => {}, f.timers);
    f.fire();
    f.calls.length = 0;
    undo();
    expect(f.cleared).toEqual([7]);
    expect(f.calls).toEqual(RENAME_NOTE_DISMISS_EVENTS.map((type) => ({ op: "remove", type, options: { capture: true } })));
  });
});

describe("phone layout decisions", () => {
  it("phone width is 767 and below; tablets keep the desktop layout", () => {
    expect(PHONE_MAX_WIDTH).toBe(767);
    expect(isPhoneWidth(375)).toBe(true);
    expect(isPhoneWidth(767)).toBe(true);
    expect(isPhoneWidth(768)).toBe(false);
    expect(isPhoneWidth(1280)).toBe(false);
  });

  it("a tab shows its own panel", () => {
    expect(nextPhonePanel("editor", "tab-files")).toBe("files");
    expect(nextPhonePanel("files", "tab-problems")).toBe("problems");
    expect(nextPhonePanel("problems", "tab-editor")).toBe("editor");
  });

  it("opening a file, tapping a problem or adding a file goes to the editor", () => {
    for (const event of ["open-file", "open-problem", "new-file"] as const) {
      expect(nextPhonePanel("files", event)).toBe("editor");
      expect(nextPhonePanel("problems", event)).toBe("editor");
    }
  });

  it("a phone always validates on edit; a saved Manual is kept for wide screens", () => {
    expect(effectiveValidationMode("manual", true)).toBe("auto");
    expect(effectiveValidationMode("auto", true)).toBe("auto");
    expect(effectiveValidationMode("manual", false)).toBe("manual");
    expect(effectiveValidationMode("auto", false)).toBe("auto");
  });

  it("the phone width matches the CSS media query in style.css", () => {
    const css = readFileSync(new URL("./style.css", import.meta.url), "utf8");
    expect(css).toContain(`@media (max-width: ${PHONE_MAX_WIDTH}px)`);
  });
});

describe('reveal highlight', () => {
  it('the CSS fade lasts as long as the rule says', () => {
    const css = readFileSync(new URL('./style.css', import.meta.url), 'utf8');
    expect(css).toContain('animation: reveal-line-fade ' + REVEAL_HIGHLIGHT_MS + 'ms');
  });
  it('revealProblem marks the line for that long', () => {
    const src = readFileSync(new URL('./fileManager.ts', import.meta.url), 'utf8');
    expect(src).toContain('REVEAL_HIGHLIGHT_MS');
    expect(src).toContain('reveal-line');
  });
});
