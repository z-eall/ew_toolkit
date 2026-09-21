// Hub ticket 31: a misspelled key names the nearest valid key. A far-off key gets no guess.
import { describe, expect, it } from "vitest";
import { closestKey } from "./ajvMessages";
import { runFullValidation } from "./validationPipeline";

const messagesOf = (text: string): string[] => {
  const out: string[] = [];
  const files = [{ id: "f0", name: "expand_prefabs_a.yaml", text }];
  for (const problems of runFullValidation(files).values()) for (const p of problems) if (p.id === "ajv-unknown-key") out.push(p.message);
  return out;
};

describe("closestKey", () => {
  const keys = ["maxDistance", "filter", "filters", "triggerRules", "weight", "type"];
  it("finds a near miss and ignores case", () => {
    expect(closestKey("maxDistanse", keys)).toBe("maxDistance");
    expect(closestKey("maxdistance", keys)).toBe("maxDistance");
    expect(closestKey("triggerRule", keys)).toBe("triggerRules");
    expect(closestKey("wieght", keys)).toBe("weight");
  });
  it("gives no guess when nothing is close", () => {
    expect(closestKey("bogusKey", keys)).toBeNull();
    expect(closestKey("x", [])).toBeNull();
  });
});

describe("unknown key in a real script", () => {
  it("top-level typo names the valid key", () => {
    const m = messagesOf("- prefab: Boar\n  type: create\n  wieght: 2\n");
    expect(m).toHaveLength(1);
    expect(m[0]).toContain("Did you mean `weight:`?");
  });
  it("typo inside a nested object is matched against that object's keys", () => {
    const m = messagesOf("- prefab: Boar\n  type: create\n  poke:\n  - prefab: Wolf\n    maxDistanse: 5\n");
    expect(m.join("\n")).toContain("Did you mean `maxDistance:`?");
  });
  it("a far-off key has no guess", () => {
    const m = messagesOf("- prefab: Boar\n  type: create\n  bogusKey: 1\n");
    expect(m[0]).toBe("'bogusKey' is not a valid key in an EWP entry. The mod ignores it.");
  });
});
