Type: grilling
Status: resolved

## Question

Add 3 bad-cop (WRONG/CORRECT) examples, all the same root concept — a prefab id's own underscores break parameter splitting unless wrapped in `<safeprefab>` — from the bad-cop sweep ([full report](../../../../research_reports/ew-wiki-bad-cop-sweep-2026-09-12.md)):

1. **`basic-functions.mdx`** — Wrong pattern: `command: s <upper_<prefab>>` on `piece_workbench` — the underscores in the prefab id get misread as extra parameters instead of using `<safeprefab>`. Page states the rule and shows only the correct form; no paired broken example.
2. **`bee-ecosystem.mdx`** — Wrong pattern: `weight: <mul_<par2>_<chanceTurnSilentFactor>>` (missing underscore, `par2` not `par_2`) vs. the correct `<mul_<par_2>_<chanceTurnSilentFactor>>`. Already called out verbatim in the page's own Aside as "easy typo to make" — reformat into the fenced convention.
3. **`world-progression.mdx`** — Wrong pattern: `<progressionWard_gd_king>` (the real, underscored prefab id `gd_king` pasted directly into the function name) instead of `<progressionWard_<safeprefab>>` — misparses into extra parameters and the lookup misses. Page already shows the correct form and explains why via a Tip aside; the broken version is described but not shown as code.

Follow the wiki's WRONG/CORRECT convention and the "Don't do this:" caution-Aside convention.

## Answer

`basic-functions.mdx` and `world-progression.mdx` pairs added as scoped. `bee-ecosystem.mdx` did NOT get a WRONG/CORRECT pair — the original plan (`<par2>` "fails to resolve") was checked against `Functions.cs`'s `GetGeneralFunction` switch and found false: `par0`-`par9` are real hardcoded shortcuts, identical to `<par_0>`-`<par_9>` for indices 0-9. Replaced with an accurate note instead of a fake bad-cop pair; correction cited in `ew_wiki/docs/sources.md`.
