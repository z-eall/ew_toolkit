Type: research
Status: resolved

## Question

Given the $0-cost constraint (GitHub free tier only, no paid hosting/services — see map Notes), what are the feasible ways to produce an AI-summarized changelog entry from commits/diff, and what does each cost/require?

Specifically survey and compare:

- **GitHub's built-in `--generate-notes`** (`gh release create --generate-notes` / the Releases UI's auto-generate button) — free, but summarizes from PR titles/labels, not true AI summarization of the diff content. Is this "good enough" to count as summarized, or does it just list PR titles?
- **Calling an LLM API (e.g. Anthropic's) from within a GitHub Actions workflow** — requires an API key stored as a repo secret, incurs per-call cost (breaks the $0 standing preference unless the user explicitly signs off on a small cost). What would a minimal workflow step look like, and roughly what would it cost per release?
- **Running Claude Code locally** (as the user is already doing in this session) to draft the summary before tagging, with the tag/release creation itself staying free/scripted. No new cost, but requires a manual local step each release instead of full CI automation.
- Any other $0 GitHub-native mechanism worth knowing about (e.g. GitHub Actions' own release-drafter-style actions, Dependabot-adjacent tooling, etc.) that could plausibly produce human-readable summaries without a paid API call.

Report findings as a comparison the next ticket (deciding the actual mechanism) can act on directly: what's free vs. not, what's fully automated vs. requires a manual trigger step, and what the resulting release-notes quality looks like for each option.

## Answer

All four options were researched against primary sources. Neither $0 GitHub-native mechanism (`gh release create --generate-notes` / Releases UI button, or the `release-drafter` Action) produces true AI prose summarization — both generate a categorized list of merged PR titles plus a contributor list, not a summary of diff/commit content. Of the two options that do produce genuine prose summaries, only running Claude Code locally before tagging stays at $0 (manual step, no CI automation); calling the Anthropic Messages API from a workflow step gets full CI automation but costs a small, non-zero amount (roughly $0.005–$0.03 per release at current Haiku/Sonnet pricing) and requires a new `ANTHROPIC_API_KEY` repo secret — this breaks the map's standing $0-cost preference and needs explicit user sign-off per that preference's own terms. Full comparison table, citations, and recommendation: [../research/01-summarization-mechanism.md](../research/01-summarization-mechanism.md).
