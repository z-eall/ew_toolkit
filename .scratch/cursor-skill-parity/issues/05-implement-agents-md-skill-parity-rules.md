# Implement AGENTS.md standing rules for Cursor skill parity

Type: task
Status: resolved

## Question

Write the decided standing rules into `AGENTS.md` (and `.cursor/rules/` if ticket 01 recommends it). Verify: next `/grilling` session uses ❓/➡️, next `/wayfinder` chart auto-claims frontier, prototype shutdown rule is complete, orphan terminal check documented.

Kill any orphan dev servers found during this ticket.

## Answer

**Done.** `AGENTS.md` updated:

- Added **When a skill is active** section (read skill first; grilling format; wayfinder auto-advance guidance; background process judgment).
- Removed niche **Wayfinder workflow** and **Prototype workflow** sections.
- Scoped plain-chat rules to normal chat only.

No `.cursor/rules/` files — `AGENTS.md` is sufficient per ticket 01.

Orphan Vite on port 5174 killed earlier this session (PID 29076).
