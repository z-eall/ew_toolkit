# Should confirmModal take a structured file list or stay message-only?

Type: grilling
Status: resolved
Blocked by: 02, 03
Parent: [Confirm modal large file-list overflow](../map.md)

## Question

How should `showConfirmModal` accept filenames now that layout is decided?

## Answer

**Hybrid (option 3):**

```ts
export interface ConfirmModalOptions {
  message: string;           // summary text only — no embedded filename blob
  fileList?: string[];       // when set → always-boxed bullet scroll region
  buttons: ConfirmButton[];
  cancelValue: string;
  allowEnter?: boolean;
  fileListLabel?: string;    // optional aria label, e.g. "Flagged files"
}
```

- Three long-list call sites pass `fileList` + short `message`.
- Two short confirms (Remove folder, Clear all) keep `message` only — no list box.
- Modal owns bullet rendering and scroll chrome — call sites stop building `\n  ${names}` strings.

Ready for [Implement scroll-capped confirm modal](05-implement-and-verify-scroll-capped-modal.md).
