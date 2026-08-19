### Site
- Auto and Manual validation modes, with an upload progress banner.
- Manual mode hides per-file status badges until you press Validate; Validate also sorts the file list errors-first once.
- Auto mode no longer runs a full-project check on every keystroke (fast per-file check while typing; full check after a short pause or when you switch files).
- FILTER menus keep working when you use select-all / deselect-all (the menu stays open).
- Diagnosis tags use the live FILTER names, including **YAML problem**, with a second line only for YAML parse/root/item groups.
- Renaming a file updates Problems-panel filename diagnoses immediately (Auto) or on Validate (Manual).
- Export all no longer freezes the page on large batches; native confirm dialogs are replaced by an in-app confirm.
- Hub and validator share one icon and color set; toolbar labels say Export (not Save); panel headers and sort/filter chrome are aligned.
- Problems panel: next-file jump, collapse vs cursor highlight, focus zones, and tabs no longer stick to the active file's severity.

### Structure problem
- Schema now matches current EWP/WEC source for several missed shapes (`delay:`, `spawn:`/`swap:` as a string or a list, item `customData` as `key: value` pairs).
- `type:` / `types:` matching follows EWP (case does not matter).

### Value problem
- RPC `objectRpc:` / `clientRpc:` parameters are checked against EWP's RPC docs (wrong type, extra or missing params — warnings, not hard errors). RPC tables regenerate from those docs at build time.
- Clearer messages when `data:` / `filter:` is written as a YAML list, including incomplete `type, key, value` lines.
- Split RPC list items (`- name:` then a sibling `- 1:`) and RPC blocks with no `name:` get a specific warning.
- WEC data entries accept a numeric `name:` (for example `name: 333`). A `data:` used where `name:` belongs (known WEC README typo) is called out.
- Value errors name the field (`\`data:\``) instead of a JSON-Schema path like `/data`.

### Reference problem
- Custom saved keys and `data.yaml` references follow EWP's real matching rules more closely (fewer false unused/undefined flags, including commented counterparts).

### YAML problem
- Empty, whitespace-only, and comment-only files warn instead of a hard “must be a YAML list” error.
- YAML parse failures use plain-language wording.

### Invalid file
- In-app filename edits are checked against valid EWP structural names before they stick.
- Upload intake is less likely to leave broken files unnoticed in the batch.

### Legacy but working
- Legacy `data:` under objects/poke is labeled as an old alias for `filter:` (still works).
