import { describe, expect, it } from "vitest";
import {
  commentedOutListMessage,
  fieldLabelFromInstancePath,
  formatAjvFallthroughMessage,
  scalarDataFieldTypeMessage,
  typeValueEnumMessage,
  unknownKeyMessage,
} from "./ajvMessages";

describe("fieldLabelFromInstancePath", () => {
  it("labels top-level and nested instance paths without JSON Pointer syntax", () => {
    expect(fieldLabelFromInstancePath("/name")).toBe("`name:`");
    expect(fieldLabelFromInstancePath("/objects/0/data")).toBe("`data:` under `objects:`");
    expect(fieldLabelFromInstancePath("/objects/0")).toBe("`objects:` entry");
    expect(fieldLabelFromInstancePath("/types/0")).toBe("`types:` entry");
  });
});

describe("formatAjvFallthroughMessage", () => {
  it("formats common ajv type and required fallthroughs", () => {
    expect(
      formatAjvFallthroughMessage({
        keyword: "type",
        instancePath: "/prefab",
        message: "must be string",
        params: { type: "string" },
        schemaPath: "",
      }),
    ).toBe("`prefab:` must be text (a string).");
    expect(
      formatAjvFallthroughMessage({
        keyword: "type",
        instancePath: "/objects/0/data",
        message: "must be string",
        params: { type: "string" },
        schemaPath: "",
      }),
    ).toBe("`data:` under `objects:` must be text (a string).");
    expect(
      formatAjvFallthroughMessage({
        keyword: "required",
        instancePath: "",
        message: "must have required property 'values'",
        params: { missingProperty: "values" },
        schemaPath: "",
      }),
    ).toBe("`values:` is required.");
  });
});

describe("commentedOutListMessage", () => {
  it("names the field", () => {
    expect(commentedOutListMessage("filters")).toBe(
      "`filters:` has no entries — all its items are commented out. Uncomment it, or remove the empty `filters:`.",
    );
  });
});

describe("typeValueEnumMessage", () => {
  it("names the field and lists the known types passed in", () => {
    const msg = typeValueEnumMessage("/type", "create, destroy");
    expect(msg).toBe('`type:` must be one of: create, destroy (any case), optionally followed by ", param1 param2".');
  });
});

describe("unknownKeyMessage", () => {
  it("names the key and the entry type", () => {
    expect(unknownKeyMessage("typo", "EWP rule entry")).toBe("'typo' is not a valid key in a EWP rule entry.");
  });
});

describe("scalarDataFieldTypeMessage", () => {
  it("provides clearer scalar-field type messages", () => {
    expect(scalarDataFieldTypeMessage("data")).toContain("filters:");
    expect(scalarDataFieldTypeMessage("filter")).toContain("filters:");
    expect(scalarDataFieldTypeMessage("bannedFilter")).toContain("bannedFilters:");
    expect(scalarDataFieldTypeMessage("unknown")).toBeNull();
  });
});
