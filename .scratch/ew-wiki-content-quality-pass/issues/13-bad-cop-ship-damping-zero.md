Type: grilling
Status: resolved

## Question

Add 1 bad-cop (WRONG/CORRECT) example, from the bad-cop sweep ([full report](../../../../research_reports/ew-wiki-bad-cop-sweep-2026-09-12.md)):

**`custom-ship-data.mdx`** — never set a ship's damping field to exactly `0`. Wrong pattern: `Ship.m_damping, 0` (or `m_dampingSideway`/`m_dampingForward` at `0`) meant to remove drag entirely — reported to make the ship uncontrollable/prone to flipping; the fix is any small value above `0` (e.g. `0.001`). Already stated as a caution, no fenced pair.

Follow the wiki's WRONG/CORRECT convention and the "Don't do this:" caution-Aside convention.

## Answer

Pair added on `custom-ship-data.mdx`. Maintainer flagged the first draft's "reported... unconfirmed but not worth risking" as internal-facing hedge language — rewritten to state the uncontrollable/flipping consequence as a plain fact, no hedge.
