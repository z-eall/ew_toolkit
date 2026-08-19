# Implement RPC orphan list-item diagnosis

Type: task
Status: resolved
Blocked by: [RPC orphan list-item shape diagnosis](03-rpc-orphan-list-item-diagnosis.md)
Parent: [Diagnosis Arbitration map](../map.md)

## Question

Implement the two RPC orphan warnings agreed in ticket 03:

- **Sibling param** — `- name: Foo` then orphan `- 1: …` list item
- **Missing name** — numbered params with no `name:`
- Both `objectRpc:` and `clientRpc:`; warning / Value problem; before `checkRpcParams`; suppress ajv noise on the orphan index.

## Resolution

- `diagnoseRpcOrphanListItems()` in `shapeMismatchDiagnosis.ts` — rule ids `ewp-rpc-orphan-sibling-param`, `ewp-rpc-missing-name`.
- Wired in `structuralPrecheck.ts` before `checkRpcParams`; orphan indices skipped; ajv suppress paths merged.
- Tests in `shapeMismatchDiagnosis.test.ts` and `structuralPrecheck.test.ts`. 53 tests pass in touched files.
