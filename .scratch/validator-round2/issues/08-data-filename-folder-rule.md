# Fix the "data" filename rule: EWP treats data files as folder-based, not prefix-based

Type: grilling
Status: resolved
Blocked by: (none)

## Question

Source-verification research for [Rework upload logic](06-upload-logic-block-invalid.md)
(full detail: [research/06-upload-block-feasibility.md](../research/06-upload-block-feasibility.md))
found a real correctness bug in `fileNameCheck.ts`'s `classifyFileName`, not
just an imprecise rule:

- Our current rule: a file is a valid "data" file if its name starts with
  `data` (case-insensitive) and ends in `.yaml`.
- EWP's actual rule (`FileLoading.cs`): there is **no `data*.yaml` prefix
  pattern anywhere in EWP's source**. `PrefabPattern = "expand_prefabs*.yaml"`
  and `DataPattern = "expand_data*.yaml"` are the only two real prefix
  patterns, and both already match our existing rules correctly.

So our `"data"` prefix rule is simultaneously:
- **too strict** — rejects `mydata.yaml` sitting in a `data` folder, which
  EWP loads fine.
- **too loose** — accepts `data123.yaml` sitting outside a `data` folder,
  which EWP never loads.

This blocks [Rework upload logic](06-upload-logic-block-invalid.md)'s
"block invalid files at upload time" decision — building an upload-time gate
on top of a rule known to reject/accept the wrong files would be worse than
today's reactive flow.

## Ground already covered (two research legs, no further AFK dispatch needed)

**EWP's precise rule** (`ExpandWorldPrefabs/service/FileLoading.cs`, full
detail: [research/06-upload-block-feasibility.md](../research/06-upload-block-feasibility.md)):

```csharp
public static readonly string DataGamePath = Path.GetFullPath(Path.Combine("BepInEx", "config", "data"));
public static readonly string DataProfilePath = Path.GetFullPath(Path.Combine(Paths.ConfigPath, "data"));
public const string DataPattern = "expand_data*.yaml";
public const string PrefabPattern = "expand_prefabs*.yaml";
```

`GetDataSourceFiles` scans, all with `SearchOption.AllDirectories` (recursive)
and `StringComparison.OrdinalIgnoreCase` throughout:
- `DataGamePath` and `DataProfilePath` — **every** `.yaml` file, any name, any
  depth beneath either root. This is the real "data" rule: folder-rooted, not
  prefix-based, and not limited to a direct child — a file nested several
  levels under `.../config/data/...` still loads.
- `baseDirectory` (`<ConfigPath>/expand_world`) — only files matching
  `DataPattern`/`PrefabPattern`, but *also* recursive (`AllDirectories`), so
  `expand_prefabs*.yaml`/`expand_data*.yaml` can sit nested anywhere under
  that base folder too, not just at its top level.

**Does WEC need checking too?** Yes, it was worth confirming once — done. Full
detail: [research/wec-ewp-correlation.md](../../ew_toolkit/research/wec-ewp-correlation.md).
Short answer: **no, not for this rule.** EWP and WEC have zero code coupling
(no assembly reference, no shared loader). WEC has its own, fully independent
`data`-folder scanner (`WorldEditCommands/service/data/DataLoading.cs`) that
happens to watch the identical two paths/glob/case-rule — a deliberate
same-author format convention, not a dependency. It corroborates EWP's rule
without adding anything new. EWP's `FileLoading.cs` alone is authoritative
for *this* rule. (The corrected standing rule — [EW Toolkit map](../../ew_toolkit/map.md)
Notes — now says "consult whichever mod's source implements the specific
behavior," not "always check both"; this ticket is the case that motivated
the correction.)

**Does our tool have folder/path context to apply a folder-based rule?**
Checked directly: `LoadedFile.folder` (`fileManager.ts`) exists, but it is
**only the immediate parent directory name**, not a full path —
`folderFromRelativePath` (`fileView.ts`) explicitly takes `parts[parts.length - 2]`
("takes the deepest directory when nested," confirmed by its own test suite).
Two concrete gaps this creates against EWP's real (recursive) rule:
- A file uploaded as `customEWP/data/sub/mydata.yaml` gets `folder = "sub"`
  — the `data` ancestor is lost, even though EWP would still load this file
  (recursive scan).
- A single, individually-picked file (not part of a folder upload — no
  `webkitRelativePath`) always gets `folder = ""` — no folder context at
  all, so a lone `mydata.yaml` picked via the file dialog can never be
  classified as "in a data folder" even if the scripter's real disk layout
  has it there.

## Grill toward a concrete answer

1. **Given the recursion/depth gap above, how exact does the fix need to
   be?** Three shapes, increasing in cost:
   - (a) match EWP loosely — folder field is literally `"data"` (immediate
     parent only, matching today's single-level upload semantics), accept
     the known miss on deeper nesting as a documented limitation.
   - (b) match EWP more precisely — walk the file's full relative path (not
     just the collapsed `folder` field) for a `data` path segment anywhere,
     requiring a `fileManager`/`fileView` change to carry/check the full
     path, not just the collapsed folder label.
   - (c) something narrower — e.g. only apply the folder-based rule when a
     real folder upload happened (`webkitRelativePath` was present) and keep
     today's prefix-only behavior for individually-picked loose files, since
     those have no folder context to check at all.
2. **Case sensitivity of the `data` folder name itself:** EWP's path
   comparison is `OrdinalIgnoreCase` throughout — confirm the fix compares
   the folder segment case-insensitively too (`Data`, `DATA` should count).
3. **Should `expand_prefabs*`/`expand_data*` prefix matching also become
   folder-independent-but-recursive**, i.e. should those two patterns match
   regardless of which folder/subfolder they're nested in (per EWP's
   `AllDirectories` scan), rather than only at the file's own level as today
   — or is this out of scope for this ticket (current behavior already
   treats prefix as folder-independent, since `classifyFileName` never
   checks folder for those two cases)?
4. Once a fix shape is chosen: does it change `classifyFileName`'s
   signature (`name` → `name, folder` or `name, fullPath`)? That's a
   contract change touching `fileManager.ts`'s single call site
   (`revalidateAll`) — confirm the blast radius is really just that one
   call site before implementing.
5. Once this lands, unblocks [Rework upload logic](06-upload-logic-block-invalid.md)'s
   deferred "block at upload time" decision — revisit that ticket once this
   one resolves.

## Resolution

**Q1 (fix precision) — reopened, then reversed the premise.** Re-pitched
options (a)/(b)/(c) all built a folder-based check, on the assumption that
matching EWP's real rule was the goal. The scripter corrected that
assumption: this validator's `folder` field is a UI-only label for
export-organization purposes, not the scripter's real EWP install path —
there is no honest way for this tool to answer "is this file really under
the scripter's real `config/data` folder." Building a check on that field
(or any other proxy for it) would be validating a coincidence, not EWP's
real rule. Folder-based gating is off the table for this validator's
architecture, full stop — independent of how precisely we could reconstruct
EWP's recursive scan.

That leaves the `"data"` filename prefix as the only name-detectable
signal available at all. The scripter's final call: **keep it**, explicitly
as a **practical heuristic** rather than a source-verified rule — "scripters
basically don't specify data entries elsewhere" in practice, even though
EWP's C# source doesn't encode that as a rule. Documented as such directly
in `fileNameCheck.ts` (comment above `VALID_PREFIXES`), so the divergence
from EWP's real behavior is visible in the code, not just this ticket.

**Q2 (case sensitivity) — moot.** No folder check is being built, so there's
no folder-segment casing to decide. The existing prefix match was already
case-insensitive (`name.toLowerCase()`), unchanged.

**Q3 (should prefix matching become folder-independent-but-recursive) —
agreed, same relation as Q1: no.** `expand_prefabs*`/`expand_data*` prefix
matching stays exactly as today (folder-independent already, since
`classifyFileName` never inspected folder for those two cases). No change.

**Q4 (blast radius if the signature changed) — agreed to proceed, but moot
in practice.** Since the resolved fix keeps `classifyFileName(name)`'s
existing one-argument signature (no folder-based logic added), there is no
signature change and no `fileManager.ts` call-site edit needed. Confirmed
by inspection: `revalidateAll()`'s single call site is untouched.

**Q5 / ripple check on [Rework upload logic](06-upload-logic-block-invalid.md)
— checked, as the scripter asked ("check if this fix is helping our gate
check for invalid file upload").** Answer: yes, it still helps, on the same
terms as before this reopened round — `classifyFileName` remains a pure,
cheap, filename-only function with zero content parsing, so the "Invalid
file" diagnosis stays 100% detectable at upload time. What changed is only
the epistemic status of the `"data"` case: it's now a knowingly-approximate
heuristic instead of a rule believed to match EWP exactly. That doesn't
weaken upload-time blockability (the check runs identically either way) —
it only means Ticket 06's "hard block vs. warn-and-skip" decision inherits
a small known false-positive/false-negative rate on `"data"`-adjacent
filenames, same as the reactive flow already had. This ticket's "spun off
from a known-wrong rule" blocker on Ticket 06 is cleared: the rule is no
longer wrong, it's a documented approximation, which is a materially
different (and acceptable) status to build a block on top of.

**Implemented this pass:** doc-only change to `fileNameCheck.ts` (comment
above `VALID_PREFIXES` explaining the heuristic and linking this ticket).
No logic change — `classifyFileName`'s `data*` branch is unchanged.
`npx vitest run` / `npx tsc --noEmit` / `npm run build` not re-run since no
executable line changed; existing fixtures already cover this branch.
