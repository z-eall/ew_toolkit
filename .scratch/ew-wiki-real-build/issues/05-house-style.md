# House-style ticket

Type: task
Status: open
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

