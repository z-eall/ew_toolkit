import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { anyUnsavedWork, applyLeaveWarning, confirmKeyDecision, initialFocusIndex } from "./uiRules";

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
