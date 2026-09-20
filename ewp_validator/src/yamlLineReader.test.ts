// Hub ticket 31: after a parse failure, the real cause is read from the lines. Each case is a mistake
// people really make; the parser's own code for it is a poor guide (see yamlErrorMessages.ts).
import { describe, expect, it } from "vitest";
import { runFullValidation } from "./validationPipeline";

const syntaxMessages = (text: string): string[] => {
  const out: string[] = [];
  const files = [{ id: "f0", name: "expand_prefabs_a.yaml", text }];
  for (const problems of runFullValidation(files).values()) for (const p of problems) if (p.id === "yaml-syntax-error") out.push(p.message);
  return out;
};

describe("YAML syntax errors name the real cause", () => {
  it("a tab for indentation", () => {
    expect(syntaxMessages("- prefab: Boar\n\ttype: create\n")).toEqual([expect.stringContaining("Line 2 starts with a tab")]);
  });
  it("an unclosed [", () => {
    expect(syntaxMessages("- prefab: [Boar\n  type: create\n")).toEqual([expect.stringContaining("Line 1 opens `[` that never closes")]);
  });
  it("an unclosed quote", () => {
    expect(syntaxMessages('- prefab: Boar\n  command: "say hi\n  type: create\n')).toEqual([expect.stringContaining("Line 2 opens a quote that never closes")]);
  });
  it("a missing colon after a key", () => {
    expect(syntaxMessages("- prefab Boar\n  type: create\n")).toEqual([expect.stringContaining("Line 1 has no `:` after the key")]);
  });
  it("a second ': ' inside a value", () => {
    expect(syntaxMessages("- prefab: Boar\n  command: say a: b\n")).toEqual([expect.stringContaining("Line 2 has a second `: ` inside a value")]);
  });
  it("gives one message, not one per parser error", () => {
    expect(syntaxMessages("- prefab: Boar\n\ttype: create\n")).toHaveLength(1);
  });
  it("a precise parser code keeps its own message", () => {
    expect(syntaxMessages("- prefab: Boar\n  type: create\n  type: destroy\n")).toEqual([expect.stringContaining("appears more than once")]);
  });
  it("a valid file gets no syntax message", () => {
    expect(syntaxMessages("- prefab: Boar\n  type: create\n  filters:\n  - int, health, 5\n")).toEqual([]);
  });
});
