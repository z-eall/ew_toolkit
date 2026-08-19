import { describe, expect, it } from "vitest";
import { checkRpcParams, CLIENT_RPC_PARAMS, OBJECT_RPC_PARAMS } from "./rpcValidation";

describe("checkRpcParams", () => {
  it("flags a numbered parameter beyond the documented count as extra, not an error", () => {
    const issues = checkRpcParams(OBJECT_RPC_PARAMS, "Message", {
      name: "Message",
      1: "enum_message, 2",
      2: "string, hi",
      3: "int, 0",
      4: "true",
    });
    expect(issues).toEqual([
      expect.objectContaining({ key: "4", kind: "extra" }),
    ]);
  });

  it("flags a non-string value for a documented parameter instead of letting ajv's generic message through", () => {
    const issues = checkRpcParams(OBJECT_RPC_PARAMS, "Message", {
      name: "Message",
      1: "enum_message, 2",
      2: "string, hi",
      3: true, // should be a string like "int, 0"
    });
    expect(issues).toEqual([expect.objectContaining({ key: "3", kind: "not-a-string" })]);
    expect(issues[0].message).toContain("should be written as");
  });

  it("flags a declared type that doesn't match the documented type for that parameter", () => {
    const issues = checkRpcParams(OBJECT_RPC_PARAMS, "Message", {
      name: "Message",
      1: "string, 2", // documented as enum_message
      2: "string, hi",
      3: "int, 0",
    });
    expect(issues).toEqual([expect.objectContaining({ key: "1", kind: "type-mismatch" })]);
  });

  it("reports nothing for an entry that matches its documented shape", () => {
    const issues = checkRpcParams(OBJECT_RPC_PARAMS, "Message", {
      name: "Message",
      1: "enum_message, 2",
      2: "string, hi",
      3: "int, 0",
    });
    expect(issues).toEqual([]);
  });

  it("reports nothing for an RPC name that isn't in the table (unknown, or deliberately ambiguous)", () => {
    expect(checkRpcParams(OBJECT_RPC_PARAMS, "SomeUndocumentedRpc", { name: "SomeUndocumentedRpc", 1: "int, 5" })).toEqual([]);
    // RPC_Extract is deliberately omitted (Beehive: no params; SapCollector: 1 zdo param) — ambiguous.
    expect(checkRpcParams(OBJECT_RPC_PARAMS, "RPC_Extract", { name: "RPC_Extract", 1: "zdo, 123" })).toEqual([]);
  });

  it("doesn't flag parameters past the fixed prefix of a variadic RPC", () => {
    const issues = checkRpcParams(CLIENT_RPC_PARAMS, "DestroyZDO", {
      name: "DestroyZDO",
      1: "int, 2",
      2: "zdo, 111",
      3: "zdo, 222",
    });
    expect(issues).toEqual([]);
  });

  it("ignores non-numbered keys like name/target/delay/overwrite", () => {
    const issues = checkRpcParams(OBJECT_RPC_PARAMS, "Message", {
      name: "Message",
      target: "somewhere",
      delay: "1",
      overwrite: "true",
      1: "enum_message, 2",
      2: "string, hi",
      3: "int, 0",
    });
    expect(issues).toEqual([]);
  });

  it("accepts name vs string type prefix aliases (FP-1)", () => {
    const issues = checkRpcParams(OBJECT_RPC_PARAMS, "SetOwner", {
      name: "SetOwner",
      1: "long, 12345",
      2: "string, PlayerName",
    });
    expect(issues).toEqual([]);
  });

  it("accepts int where docs specify enum_* (FP-2)", () => {
    const issues = checkRpcParams(CLIENT_RPC_PARAMS, "ShowMessage", {
      name: "ShowMessage",
      1: "int, 2",
      2: "string, Hello",
    });
    expect(issues).toEqual([]);
  });

  it("reports nothing for the ticket RPC_SetVisualItem repro shape", () => {
    const issues = checkRpcParams(OBJECT_RPC_PARAMS, "RPC_SetVisualItem", {
      name: "RPC_SetVisualItem",
      target: "all",
      1: 'int, "index of the item slot"',
      2: 'string, "name of the item"',
      3: 'int, "variant number of the item"',
      4: 'int, "orientation of the item (0 = none, 1 = vertical, 2 = horizontal, 3 = all)"',
    });
    expect(issues).toEqual([]);
  });

  it("warns on wrong-case type prefix EWP would not convert (FP-3)", () => {
    const issues = checkRpcParams(OBJECT_RPC_PARAMS, "RPC_SetPose", {
      name: "RPC_SetPose",
      1: "Int, 3",
    });
    expect(issues).toEqual([expect.objectContaining({ key: "1", kind: "type-mismatch" })]);
    expect(issues[0].message).toContain("case-sensitively");
  });

  it("warns when documented parameters are omitted (FN-1)", () => {
    const issues = checkRpcParams(OBJECT_RPC_PARAMS, "RPC_SetVisualItem", {
      name: "RPC_SetVisualItem",
      target: "all",
      1: "int, 0",
      2: "string, SwordIron",
    });
    expect(issues.filter((i) => i.kind === "missing").map((i) => i.key)).toEqual(["3", "4"]);
  });
});

describe("generated RPC tables", () => {
  it("documents RPC_SetVisualItem with four params from RPCs.md", () => {
    expect(OBJECT_RPC_PARAMS.RPC_SetVisualItem?.map((p) => p.type)).toEqual(["int", "string", "int", "int"]);
  });

  it("does not include deliberately omitted ambiguous object RPCs", () => {
    expect(OBJECT_RPC_PARAMS.RPC_Extract).toBeUndefined();
    expect(OBJECT_RPC_PARAMS.RPC_DropItem).toBeUndefined();
  });
});
