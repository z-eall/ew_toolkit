# House-style ticket

Type: task
Status: resolved
Blocked by: 03, 04

## Question

Record the reusable authoring conventions the content-review reports surfaced, so every later ported guide follows the same rules:

- `<Steps>` for sequential builds
- `<Aside>` for warnings/trust-caveats
- `<Tabs>` only for true side-by-side alternatives, never sequential content
- Shared snippets for repeated boilerplate
- Code-fence language tags
- Splitting overly long/heterogeneous pages
- A playground-suitability rule: small, self-contained YAML snippets are good live-editing candidates; chained/stateful multi-rule scripts are not — shape-validity isn't behavior-correctness, and live-editing those risks false confidence

Source: the three content-review reports (`ew-toolkit-wiki-content-review-theory-fundamental.md`, `-basic-use-cases.md`, `-advanced-use-cases.md`) in `research_reports/`.

## Answer

Read all three content-review reports in full and distilled the recurring findings into a new "Component conventions" section in `ew_wiki/AGENTS.md` (placed after "YAML indent in examples", before "Page and section naming"), 7 rules:

- `<Steps>` for a reader-performed or dependency-chained sequence; skip for a short or already-linear passage.
- `<Aside>` for a single-sentence trust/safety flag, severity matched to stakes (`danger`/`caution` vs `note`/`tip`).
- `<Tabs>` for true alternatives only, never for a read-in-order sequence or a side-by-side comparison the reader needs open at once.
- Shared snippets for boilerplate repeated verbatim across pages (attribution footers, starting-shape YAML, recurring links).
- Every code fence declares a language.
- Split a page along confidence/purpose seams (core teaching vs. community-contributed/unverified; reference tables vs. copy-paste recipes).
- Playground suitability: schema-valid proves shape, not behavior — self-contained YAML is a good candidate, chained/stateful scripts are not.

Also ran a project-wide AGENTS.md/CLAUDE.md dedupe pass while here (maintainer's ask, not originally scoped to this ticket): found `ew_toolkit/AGENTS.md`'s "Issue tracker"/"Triage labels" blurbs were byte-identical to the root project `CLAUDE.md`'s "Agent skills" section (loaded together on every turn in this repo, since Claude Code loads CLAUDE.md hierarchically) *and* their `docs/agents/...` links were dead (that folder only exists at the outer root) — cut both, mirrored the same fix into `ew_toolkit-cursor/AGENTS.md` per the dual-agent sync rule. Also trimmed `ew_wiki/AGENTS.md`'s "Never guess" section, which restated the hub-wide "Confirm, don't guess" rule before adding its real wiki-specific value, and merged it with the adjacent "Source-verify" checklist into one section (same concept: the rule, then the checklist that enforces it).

