Type: grilling
Status: resolved
Blocked by: 01

## Question

Given ticket 01's findings, decide the concrete release pipeline:

1. What marks a push as "release-worthy"? (candidates: pushing a git tag matching a convention like `vX.Y.Z`; a manual `workflow_dispatch` run; a label applied to a merged PR that a workflow watches for)
2. What actually runs the summarization and creates the GitHub Release — a GitHub Actions workflow triggered by that signal, a local script/command the user runs, or a hybrid (local drafting + scripted publish)?
3. Does this respect the $0 standing preference, or does the user explicitly accept a small cost for real AI summarization?

Resolve with a concrete, nameable mechanism (e.g. "push a `vX.Y.Z` tag → Actions workflow runs `gh release create --generate-notes`" or "run a local Claude Code step to draft notes into a file → `gh release create --notes-file`").

## Answer

Local-drafting, entirely outside CI, staying at $0 (option (a) from ticket 01, chosen over the paid Anthropic-API-in-CI path — the $0 preference is treated as a hard line, and "curated release points" already implies a human decides *when* to cut a release, so a human-triggered drafting step adds little extra friction on top of that).

Concrete mechanism:

1. **Trigger**: a human decides a batch is release-worthy and runs a local command/script — no CI watches for a signal; this is entirely separate from `build-deploy.yml`'s push/schedule triggers, which are untouched.
2. **Summarization**: Claude Code (or an equivalent local session) drafts release notes from `git log`/diff since the last tag, saved to a notes file.
3. **Tag naming**: date-based, `vYYYY-MM-DD`. Same-day collision handling: the script checks existing tags for that day's prefix (`git tag -l "vYYYY-MM-DD*"`) and appends `-2`, `-3`, … if one already exists (first release of the day stays bare). No semver judgment calls (per map's "Out of scope").
4. **Publish**: the script pushes the computed tag and runs `gh release create <tag> --notes-file <file>`.
5. **Cost**: $0 — no API secret, no CI spend.

Open implementation detail (not blocking, small enough to resolve when actually building this): exact script location (likely `ew_toolkit/scripts/`) and how it computes "since last tag" — left for build time, not a further design decision.
