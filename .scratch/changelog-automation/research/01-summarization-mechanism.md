# Research: feasible AI-summarization mechanisms for changelog automation

Labels: wayfinder:research

## Question

Given the $0-cost standing preference (GitHub free tier only — see [map.md](../map.md) Notes), what are the feasible ways to produce an AI-summarized changelog entry from commits/diff for [build-deploy.yml](../../../.github/workflows/build-deploy.yml), and what does each option cost/require? See the full question in [issues/01-summarization-mechanism-research.md](../issues/01-summarization-mechanism-research.md).

## Comparison table

| Mechanism | What it produces | Cost | Setup effort | Maintenance status |
|---|---|---|---|---|
| `gh release create --generate-notes` / Releases "Generate release notes" button | Categorized list of merged PR titles + contributor list + full-changelog link — **not** prose summarization of diff/commit content | $0 | Zero — built into `gh`/GitHub UI; optional `.github/release.yml` for categorization | N/A — first-party GitHub feature |
| LLM API call from a workflow step (e.g. Anthropic Messages API) | True prose summary, written from actual diff/commit content | ~$0.005–$0.03 per release (see below) — **breaks $0 preference** | Medium — new workflow step, script (Python/Node), `ANTHROPIC_API_KEY` repo secret | N/A — depends on Anthropic API uptime/pricing, not a third-party Action |
| Claude Code run locally before tagging | True prose summary, human-reviewed before publish | $0 (already-paid-for local usage) | None new — manual step, not CI-automated | N/A — user's existing workflow |
| `release-drafter/release-drafter` Action | Auto-drafted release notes, categorized by PR label, updated on every PR merge; still PR-title-based, not diff-prose | $0 | Medium — Action + `.github/release-drafter.yml` config + PR labels | Active: 3,927 stars, not archived, last push 2026-08-16, latest release v7.7.0 |

## GitHub's built-in generated notes

GitHub's automatically generated release notes (both the Releases UI button and `gh release create --generate-notes`) are built from **merged pull requests**, plus a **list of contributors** and a **link to the full changelog** — not from commit messages or diff content directly. The output is markdown, categorizable via an optional `.github/release.yml` (labels → category buckets, plus exclude rules for labels/authors), but GitHub's own docs describe the body as containing "information like the changes since last release and users who contributed" — a structured list, not freeform prose analysis of what changed and why.
Source: [GitHub Docs — Automatically generated release notes](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes); [GitHub REST API — Generate release notes content for a release](https://docs.github.com/en/rest/releases/releases?apiVersion=2022-11-28#generate-release-notes-content-for-a-release); [GitHub CLI — gh release create](https://cli.github.com/manual/gh_release_create).

**Verdict**: this is a categorized list of PR titles/contributors, not a meaningful AI-written prose summary. It also depends on PR-based development (titles/labels) — this repo currently pushes straight to `main` per [build-deploy.yml](../../../.github/workflows/build-deploy.yml), so without a PR-centric workflow this mechanism would have thin/empty input to work from.

## Calling an LLM API from GitHub Actions

A minimal workflow step would need: a `checkout` step, an `ANTHROPIC_API_KEY` stored as a GitHub Actions repository secret and referenced via `${{ secrets.ANTHROPIC_API_KEY }}` in the step's `env`, and a small script (Python via the `anthropic` SDK, or a plain `curl` call) that gathers `git log`/`git diff` output since the last release tag and POSTs it to the Messages API (`x-api-key` header, `model`, `max_tokens`, `messages` body).
Sources: [GitHub Docs — Using secrets in GitHub Actions](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions); [Anthropic — Messages API reference](https://platform.claude.com/docs/en/api/messages).

**Cost estimate**: current per-million-token API pricing (base, non-batch) is:
- Claude Haiku 4.5: $1/MTok input, $5/MTok output
- Claude Sonnet 5: $2/MTok input, $10/MTok output
Source: [Anthropic — Pricing](https://platform.claude.com/docs/en/about-claude/pricing).

For a typical changelog-summarization prompt of 2,000–10,000 input tokens (commit messages/diffs since the last release) plus a few hundred output tokens:

| Model | 5k in / 300 out | 10k in / 500 out |
|---|---|---|
| Haiku 4.5 | ~$0.0065 | ~$0.0125 |
| Sonnet 5 | ~$0.013 | ~$0.025 |

So roughly **half a cent to two and a half cents per release** — trivially cheap in absolute terms, but non-zero, and it requires an API key held as a repo secret (a new credential-management surface). This is the only option of the four that has any per-use monetary cost at all, so it directly conflicts with the $0-cost standing preference recorded in [map.md](../map.md) unless the user explicitly signs off on breaking it for a sub-cent/release cost.

## Running Claude Code locally

No new monetary cost — it's the tool the user is already running interactively. Tradeoff is the opposite axis: it's a **manual step** the user (or an agent session) performs before tagging/publishing, not something `build-deploy.yml` or a release workflow triggers unattended. The release-creation step itself (tag + `gh release create` with the drafted body) can still be scripted/automated; only the summarization step stays human-in-the-loop. This is the "known" option per the ticket and needs no deeper sourcing — it's the status quo capability, not a new mechanism to validate.

## release-drafter (GitHub-native, $0, alternative to raw `--generate-notes`)

`release-drafter/release-drafter` is a GitHub Action that maintains a continuously-updated **draft** release, appending an entry each time a PR merges, categorized by PR label (e.g. "Features", "Bug Fixes") via a `.github/release-drafter.yml` config, with template variables like `$CHANGES` and `$CONTRIBUTORS`. It requires `contents: write` + `pull-requests: read` permissions for `GITHUB_TOKEN` (no new secret) and, optionally, an `autolabeler` to assign PR labels automatically from file paths/branch names/PR body content.
Source: [release-drafter/release-drafter (GitHub repo)](https://github.com/release-drafter/release-drafter).

Verified directly against the GitHub API at research time (2026-08-18): **3,927 stars, not archived, most recent push 2026-08-16, latest tagged release v7.7.0** — actively maintained and reputable.
Source: `api.github.com/repos/release-drafter/release-drafter` (GitHub REST API, queried directly).

**Verdict**: like `--generate-notes`, this produces a nicer-formatted categorized list of PR titles, not diff-content prose. It's a readability/organization upgrade over the raw `--generate-notes` output, still $0, but doesn't solve the "true AI summarization of what changed" part of the destination on its own — and like `--generate-notes`, it's PR-title-driven, which is a weaker signal for this repo's current push-to-`main` workflow than a PR-based one.

## Recommendation

None of the $0 mechanisms (`--generate-notes`, `release-drafter`) produce genuine AI-written prose summaries — both are categorized lists of PR titles/contributors, which the destination in [map.md](../map.md) ("summarized by AI from the commits/diff") explicitly wants to exceed. Of the two options that produce true prose summaries (LLM API call, local Claude Code), only the **local Claude Code** option stays at $0 — the API-call option costs a small but non-zero amount (roughly $0.005–$0.03 per release) and needs a new secret (`ANTHROPIC_API_KEY`) in the repo.

**Headline conclusion for the next ticket**: if the $0 constraint is treated as hard, the two real candidates are (a) a **local Claude Code drafting step** feeding a scripted/automated tag-and-publish, or (b) **release-drafter** for structure only, understanding it won't be a true diff-content summary. If the user is willing to explicitly break $0 for a sub-cent-per-release cost, the **Anthropic Messages API step in the workflow** is the only option that gets both full CI automation and genuine prose summarization in one pipeline — the next ticket should surface this tradeoff explicitly rather than assume $0 must win by default.

**$0-cost-preference conflict flagged**: the LLM-API-in-Actions option (comparison table row 2) breaks the map's standing $0 preference. It is cheap (fractions of a cent per release) but not free, and requires explicit user sign-off per the preference's own terms ("Any AI-summarization approach must respect this or get explicit sign-off to break it" — [map.md](../map.md) Notes).
