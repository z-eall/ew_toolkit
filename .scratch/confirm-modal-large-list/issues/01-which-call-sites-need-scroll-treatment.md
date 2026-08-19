# Which confirm call sites embed variable-length file lists?

Type: research
Status: resolved
Blocked by: (none)
Parent: [Confirm modal large file-list overflow](../map.md)

## Question

Audit every `showConfirmModal` call site in `ewp_validator/src/main.ts` (and any future callers of `confirmModal.ts`). For each, state whether the `message` can grow without bound because it embeds a `\n`-joined filename list, estimate typical vs worst-case list length, and classify: **needs scroll-capped list UI**, **short message only**, or **edge case worth sharing the scroll treatment anyway**.

Ground the audit in the actual call sites (Remove folder, upload-gate invalid files, duplicate overwrite, Clear all, Clear invalid files) and link back to [Custom confirmation modal](../../validator-round2/issues/09-custom-confirm-modal.md)'s original five-site inventory.

Deliverable: a per-site table the layout and API tickets can reference — not an implementation.

## Answer

All five call sites live in `main.ts`; `confirmModal.ts` has no other callers.

| Call site | List in message? | Typical scale | Worst case | Verdict |
|-----------|------------------|---------------|------------|---------|
| **Remove folder** | No — folder name + file count only | 1 folder name | Long folder path string | **Short message only** |
| **Upload-gate invalid** | Yes — `\n  ${names}` for every invalid upload | 0–few | **Entire batch** (scripter repro: 1600) | **Needs scroll-capped list UI** |
| **Duplicate overwrite** | Yes — `\n  ${names}` for every clash | 0–few | Whole batch if all names collide | **Needs scroll-capped list UI** |
| **Clear all** | No — fixed warning text | — | — | **Short message only** |
| **Clear invalid** | Yes — `\n  ${names}` for every invalid loaded file | 0–few | All loaded files if all invalid | **Needs scroll-capped list UI** |

**Shared pattern on the three long-list sites:** each builds `names` via `.map(...).join("\n  ")` and embeds it in `message`. Same overflow bug, same fix shape.

**Edge case:** Remove folder could theoretically mention many files in the count line but never lists them — no scroll treatment needed.

**Recommendation for downstream tickets:** implement scroll-capped list UI once in `confirmModal.ts`; wire the three long-list call sites to a structured `fileList` (ticket 04). Leave Remove folder and Clear all on message-only path.
