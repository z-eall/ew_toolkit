import { describe, expect, it } from "vitest";
import { checkFileName, classifyFileName, INVALID_FILE_CATEGORY } from "./fileNameCheck";
import { LEGACY_FORMAT_CATEGORY } from "./structuralPrecheck";

describe("classifyFileName", () => {
  it("accepts the current-format prefixes as valid", () => {
    for (const name of [
      "expand_prefabs.yaml",
      "expand_prefabs_HelloWorld.yaml",
      "data.yaml",
      "data_loot.yaml",
    ]) {
      expect(classifyFileName(name)).toBe("valid");
    }
  });

  it("classifies the legacy expand_data* processor name as legacy", () => {
    expect(classifyFileName("expand_data.yaml")).toBe("legacy");
    expect(classifyFileName("expand_data_mydata.yaml")).toBe("legacy");
  });

  it("rejects names that match no EWP structural prefix", () => {
    for (const name of ["random.yaml", "notes.yaml", "config.yaml", "expand_locations.yaml"]) {
      expect(classifyFileName(name)).toBe("invalid");
    }
  });

  it("rejects the singular expand_prefab (only the plural prefabs form is real)", () => {
    expect(classifyFileName("expand_prefab.yaml")).toBe("invalid");
  });

  it("rejects a non-.yaml extension even when the prefix matches", () => {
    expect(classifyFileName("data.yml")).toBe("invalid");
    expect(classifyFileName("expand_prefabs.txt")).toBe("invalid");
    expect(classifyFileName("expand_data.yml")).toBe("invalid");
  });

  it("is case-insensitive about the prefix and extension", () => {
    expect(classifyFileName("EXPAND_PREFABS.YAML")).toBe("valid");
    expect(classifyFileName("Expand_Data_Foo.Yaml")).toBe("legacy");
  });
});

describe("checkFileName", () => {
  it("returns no problem for a valid file", () => {
    expect(checkFileName("data.yaml")).toEqual({ verdict: "valid", problem: null });
  });

  it("emits a blue legacy-filename info that recommends the data<suffix>.yaml rename", () => {
    const { verdict, problem } = checkFileName("expand_data_mydata.yaml");
    expect(verdict).toBe("legacy");
    expect(problem).not.toBeNull();
    expect(problem!.severity).toBe("info");
    expect(problem!.branch).toBe(LEGACY_FORMAT_CATEGORY);
    expect(problem!.message).toContain("Legacy filename");
    expect(problem!.message).toContain("data_mydata.yaml");
    expect(problem!.message).toContain("/config/data");
  });

  it("maps a bare expand_data.yaml to a data.yaml rename target", () => {
    expect(checkFileName("expand_data.yaml").problem!.message).toContain("'data.yaml'");
  });

  it("preserves the original suffix casing in the rename target", () => {
    expect(checkFileName("Expand_Data_Foo.Yaml").problem!.message).toContain("data_Foo.yaml");
  });

  it("emits an Invalid file error for an unrecognised name", () => {
    const { verdict, problem } = checkFileName("random.yaml");
    expect(verdict).toBe("invalid");
    expect(problem!.severity).toBe("error");
    expect(problem!.branch).toBe(INVALID_FILE_CATEGORY);
    expect(problem!.message).toContain("Invalid file");
    expect(problem!.message).toContain("random.yaml");
  });
});
