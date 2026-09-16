# Troubleshooting section: build it, or is it duplicate work against the validator?

Type: grilling
Status: resolved

## Question

The map's fog had a "Troubleshooting section" parked pending the validator's own diagnosis-category vocabulary. Original intent: a "why isn't my script working" wiki page using the *same wording* as the validator's live error messages, so a reader hits consistent vocabulary whether reading the wiki or staring at a validator error. Given the validator already catches and explains mistakes live, at the point of error, does a separate static wiki page add enough to justify building it, or is it largely duplicate effort?

## Answer

**Don't build it** (maintainer, 2026-09-14). The validator already is the troubleshooting tool for anything it catches — a static page repeating the same wording live moments after typing is genuinely duplicate. The one thing a static page could still do that the validator can't — explain mistakes the validator doesn't catch (silent runtime behavior) — is already being served by the content-quality-pass's WRONG/CORRECT bad-cop pattern, added directly on the page where the silent mistake happens rather than centralized in a separate section. Keep extending bad-cop examples where real gaps are found (per the content-quality-pass map and its sweep-report follow-up) instead of building a standalone Troubleshooting section.
