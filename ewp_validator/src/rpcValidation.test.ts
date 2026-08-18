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
});
