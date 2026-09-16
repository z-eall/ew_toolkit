Type: research
Status: closed
Claimed by: Claude (this session, 2026-09-16)

## Question

A distinct failure class from the original bad-cop sweep: not a *wrong* fact, but a *true, source-verified, and functionally inert* fact stated as if it matters. Caught live this session on `basic-filter.mdx`'s proposed fix ([ticket 16](16-basic-filter-comma-semicolon-live-bug.md)) — an early draft explanation led with "the comma sets a weight of 3," true and cited, but meaningless: with exactly one required filter and no `filterLimit:` override, any positive weight clears the default limit identically, so the fact never changes the outcome. Leading with it would have taught the reader to worry about something that can't affect their script.

Sweep the wiki's existing shipped content (all `ewp/concepts/*.mdx`, `ewp/examples/*.mdx`) for the same shape: a stated fact that is accurate, verifiable, and present in the text — but doesn't change what the reader does, decides, or expects, in the context it's stated. Likely places to look first: any Aside or caution that cites a mechanism (weight, ordering, a default value) without checking whether that mechanism is actually load-bearing in the example it's attached to; any explanation that survived a "why does this work" investigation without a follow-up "does this specific fact matter here" check.

Report findings the same shape as the bad-cop sweep: a list of candidate spots, each with the inert fact currently stated and what should replace it (either cut entirely, or reframed around the actual consequence). Don't fix pages directly — this is a research/list ticket, acting on the list is new tickets.

## Notes

This ticket exists because the same failure shape is suspected to recur, not confirmed to be widespread — treat a "found nothing more" result as a valid, useful outcome, not a sign to dig harder than the evidence supports.

## Answer

**No new instances found.** A background research agent read all 31 shipped `.mdx` files under `ewp/concepts/` and `ewp/examples/` in full and mechanically re-derived every Aside/caution that cites a mechanism (weight, ordering, a default value) against the specific example it's attached to — checking what happens if the cited fact is changed or removed. Every candidate checked turned out load-bearing (changing the fact does change the example's outcome), unlike the ticket-16 calibration case. Full report, including the 6 spots specifically checked and cleared: [research_reports/ew-wiki-true-but-inert-facts-sweep-2026-09-16.md](../../../research_reports/ew-wiki-true-but-inert-facts-sweep-2026-09-16.md).

One loose end surfaced but correctly **not** filed here (different failure class): `advanced-poke-creative-systems.mdx`'s self-closing-timer case study leaves it unclear whether a bare `type: poke, autoClose` trigger excludes an `autoClose 0` value on its own, or whether `weight: 1e30` is doing that exclusion — a matching-semantics question, not a true-but-inert one. Would need `ExpandWorldPrefabs/` source checked to resolve. Carried to the map's Not yet specified rather than guessed at.

**Check reach**: no standing-rule or `AGENTS.md` change needed — this ticket was a one-time sweep (like ticket 05), not a recurring gate. Nothing to write outside this map.
