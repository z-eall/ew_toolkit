import { describe, expect, it } from "vitest";
import { DIAGNOSIS_IDS, DIAGNOSIS_KINDS } from "./diagnosisKinds";
import { KIND_LABELS } from "./diagnosisLabels";
import { DIAGNOSIS_SAMPLES } from "./diagnosisSamples";
import {
  FOLD_MIN,
  foldRows,
  hiddenNote,
  inTab,
  kindKey,
  kindLabel,
  kindsPresent,
  parentState,
  passesKindFilter,
  setKindsVisible,
} from "./problemFilter";
import { runFullValidation } from "./validationPipeline";

const p = (id: string, severity: string, branch = "Reference problem") => ({ id, severity, branch });

describe("kind names", () => {
  it("every id has a name for every severity it can carry", () => {
    for (const id of DIAGNOSIS_IDS) {
      const k = DIAGNOSIS_KINDS[id];
      for (const sev of [k.severity, ...(k.alsoSeverity ?? [])]) {
        const name = kindLabel(id, sev);
        expect(name, `${id}:${sev} has no name`).not.toBe(id);
        expect(name.length).toBeGreaterThan(3);
      }
    }
  });
  it("a kind with several severities has a name per severity", () => {
    expect(KIND_LABELS["data-reference"]).toMatchObject({ error: expect.any(String), info: expect.any(String), warning: expect.any(String) });
  });
  it("uses Legacy, never Old", () => {
    for (const id of DIAGNOSIS_IDS) {
      const all = typeof KIND_LABELS[id] === "string" ? [KIND_LABELS[id] as string] : Object.values(KIND_LABELS[id]);
      for (const name of all) expect(name, name).not.toMatch(/\bold\b/i);
    }
  });
  it("every real diagnosis from the sample inputs has a name (no id shown raw)", () => {
    for (const id of DIAGNOSIS_IDS) {
      const c = DIAGNOSIS_SAMPLES[id];
      if (!c) continue;
      const files = c.files.map((f, i) => ({ id: `f${i}`, name: f.name, text: f.text }));
      for (const problems of runFullValidation(files).values()) {
        for (const x of problems) expect(kindLabel(x.id, x.severity), `${x.id}:${x.severity}`).not.toBe(x.id);
      }
    }
  });
});

describe("kindsPresent", () => {
  const list = [p("data-reference", "info"), p("data-reference", "info"), p("data-reference", "error"), p("custom-key", "info"), p("ajv-unknown-key", "error", "Structure problem")];
  it("groups by category and counts each kind", () => {
    const out = kindsPresent(list);
    expect(out.map((c) => c.category)).toEqual(["Reference problem", "Structure problem"]);
    const ref = out[0]!.kinds;
    expect(ref.find((k) => k.key === "data-reference:info")).toMatchObject({ label: "Data entry never used", count: 2 });
    expect(ref.find((k) => k.key === "data-reference:error")).toMatchObject({ label: "Data name not defined anywhere", count: 1 });
  });
  it("sorts kinds by name", () => {
    const labels = kindsPresent(list)[0]!.kinds.map((k) => k.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
  });
  it("skips a problem outside every category", () => {
    expect(kindsPresent([p("x", "info", "(parse)")])).toEqual([]);
  });
});

describe("parent tick", () => {
  const keys = ["a:info", "b:info", "c:info"];
  it("shows all, none or some", () => {
    expect(parentState(keys, new Set())).toBe("all");
    expect(parentState(keys, new Set(keys))).toBe("none");
    expect(parentState(keys, new Set(["b:info"]))).toBe("some");
  });
  it("unticking the parent hides every kind under it, ticking shows them again", () => {
    const hidden = setKindsVisible(new Set(["other:info"]), keys, false);
    expect([...hidden].sort()).toEqual(["a:info", "b:info", "c:info", "other:info"]);
    expect(parentState(keys, hidden)).toBe("none");
    const shown = setKindsVisible(hidden, keys, true);
    expect([...shown]).toEqual(["other:info"]);
  });
  it("does not change the set it was given", () => {
    const start = new Set<string>();
    setKindsVisible(start, keys, false);
    expect(start.size).toBe(0);
  });
});

describe("the filter", () => {
  it("hides a hidden kind and keeps the rest", () => {
    const hidden = new Set(["data-reference:info"]);
    expect(passesKindFilter(p("data-reference", "info"), hidden)).toBe(false);
    expect(passesKindFilter(p("data-reference", "error"), hidden)).toBe(true);
    expect(passesKindFilter(p("custom-key", "info"), hidden)).toBe(true);
  });
  it("a crashed check has no menu item and is never hidden", () => {
    const crashed = p("check-crashed", "warning", "Structure problem");
    expect(kindsPresent([crashed])).toEqual([]);
    expect(passesKindFilter(crashed, new Set(["check-crashed:warning"]))).toBe(true);
  });
  it("always passes a problem outside every category", () => {
    expect(passesKindFilter(p("x", "info", "(parse)"), new Set(["x:info"]))).toBe(true);
  });
  it("counts hidden kinds in words", () => {
    expect(hiddenNote(0)).toBe("");
    expect(hiddenNote(1)).toBe("1 kind hidden");
    expect(hiddenNote(3)).toBe("3 kinds hidden");
  });
});

describe("foldRows", () => {
  const row = (id: string, severity: string, n: number) => ({ ...p(id, severity), n });
  const get = (r: { id: string; severity: string; branch: string }) => r;

  it("folds a non-error kind that repeats the minimum times", () => {
    const rows = Array.from({ length: FOLD_MIN }, (_, i) => row("data-reference", "info", i));
    const out = foldRows(rows, get);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ type: "group", key: "data-reference:info", label: "Data entry never used" });
    expect((out[0] as { rows: unknown[] }).rows).toHaveLength(FOLD_MIN);
  });
  it("leaves a kind below the minimum as plain rows", () => {
    const rows = Array.from({ length: FOLD_MIN - 1 }, (_, i) => row("data-reference", "info", i));
    expect(foldRows(rows, get).every((s) => s.type === "row")).toBe(true);
  });
  it("never folds errors, however many", () => {
    const rows = Array.from({ length: 10 }, (_, i) => row("data-reference", "error", i));
    expect(foldRows(rows, get).every((s) => s.type === "row")).toBe(true);
  });
  it("keeps order: the group sits where its first row was", () => {
    const rows = [row("custom-key", "info", 0), row("data-reference", "info", 1), row("ajv-unknown-key", "error", 2), row("data-reference", "info", 3), row("data-reference", "info", 4)];
    const out = foldRows(rows, get);
    expect(out.map((s) => (s.type === "row" ? s.row.id : `group:${s.key}`))).toEqual(["custom-key", "group:data-reference:info", "ajv-unknown-key"]);
  });
  it("counts kinds separately per severity", () => {
    const rows = [row("data-reference", "info", 0), row("data-reference", "info", 1), row("data-reference", "warning", 2)];
    expect(foldRows(rows, get).every((s) => s.type === "row")).toBe(true);
  });
  it("kindKey joins id and severity", () => {
    expect(kindKey({ id: "a", severity: "info" })).toBe("a:info");
  });
  it("inTab: a severity tab holds only that severity, the file tab holds the open file", () => {
    expect(inTab({ severity: "error" }, "error", false)).toBe(true);
    expect(inTab({ severity: "info" }, "error", true)).toBe(false);
    expect(inTab({ severity: "info" }, "thisfile", true)).toBe(true);
    expect(inTab({ severity: "error" }, "thisfile", false)).toBe(false);
  });
  it("the menu lists only the kinds of the tab being viewed", () => {
    const problems = [
      { id: "unknown-key", severity: "error", branch: "Format problem" },
      { id: "data-reference", severity: "info", branch: "Reference problem" },
    ].map((p) => ({ ...p, file: p.severity === "error" ? "a" : "b" }));
    const forTab = (tab: string, active: string) => problems.filter((p) => inTab(p, tab, p.file === active));
    const kinds = (tab: string, active: string) => kindsPresent(forTab(tab, active)).flatMap((c) => c.kinds.map((k) => k.key));
    expect(kinds("error", "a")).not.toContain("data-reference:info");
    expect(kinds("info", "a")).not.toContain("unknown-key:error");
    expect(kinds("thisfile", "b")).toEqual(["data-reference:info"]);
  });
});
