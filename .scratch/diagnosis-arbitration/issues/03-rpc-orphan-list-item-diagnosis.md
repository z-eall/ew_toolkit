# RPC orphan list-item shape diagnosis

Type: grilling
Status: resolved
Blocked by: (none)
Parent: [Diagnosis Arbitration map](../map.md)

## Question

Round 3 research 08 (FN-3) documents RPC yaml where a doc typo or scripter
mistake leaves an **orphan list item** under `objectRpc:` / `clientRpc:` —
e.g. a `- name: Foo` entry followed by a sibling `- 1: int, 5` with no name,
or numeric keys on an entry missing `name:` entirely. EWP accepts broken entries
silently; ajv may emit generic structure noise.

Should the Diagnosis Arbitration catalog own an intent-specific message for
this shape class?

Grill:

1. **Severity** — warning (doc-aware nudge) vs Structure error vs info?
2. **Message** — name the likely fix (merge into previous entry? add `name:`?)
3. **Suppress paths** — which ajv/RPC fallthroughs does this row claim?
4. **Scope** — objectRpc only, clientRpc only, or both?
5. **Overlap** — does `checkRpcParams` or formatLint already cover any case?

If yes: follow-on **task** ticket implements the catalog row + tests. If no:
record why ajv/RPC warnings are enough and close without code.

Reference: [RPC validation source audit](../validator-round3/research/08-rpc-validation-source-audit.md) § FN-3, rank-4 optimization table.

## Resolution

**Yes** — add two intent-specific warnings (both shapes), warning severity,
Value problem category, both `objectRpc:` and `clientRpc:`.

| Shape | Message intent |
|-------|----------------|
| Sibling orphan param after name-only entry | Point scripter to indent under previous RPC, not as new list item |
| Numbered params, no `name:` | Point scripter to add `name: YourRpcName` |

**Suppress / skip:** orphan index skipped for `checkRpcParams`; ajv paths on that list index suppressed. Follow-on: [Implement RPC orphan list-item diagnosis](05-implement-rpc-orphan-list-item-diagnosis.md).
