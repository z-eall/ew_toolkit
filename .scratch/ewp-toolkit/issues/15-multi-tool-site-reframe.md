# Reframe: is EW Toolkit a single tool or a multi-tool site?

Type: grilling
Status: resolved
Blocked by: (none)

## Question

The user realized the site could be more than the EWP YAML validator — a home
that hosts multiple tools for Jere Kuusela's Valheim mods, with the validator as
tool #1. Does the current map's Destination formally widen to "a multi-tool
site", or does it stay scoped to the single validator? Settle the reframe before
executing the `ew_toolkit` rename ([ticket 14](14-rebrand-to-ew-toolkit.md)),
since the reframe shapes what "EW Toolkit" even points at.

## Answer

Settled via a `/grilling` pass (2026-08-17). Five decisions:

1. **This map stays frozen at the EWP validator; the multi-tool hub gets its own
   new map.** The validator is essentially built and shipping — retroactively
   ballooning a near-complete map violates wayfinder's "don't chart what you
   can't see." The umbrella name is adopted now (worth one rename), but the hub
   is genuinely new work deserving its own destination + grilling.

2. **Umbrella scope is tiered:**
   - *Now / near-term:* Jere Kuusela's mods — the **ExpandWorld family**
     (flagship) plus his other world-editing / hack mods that aren't EW-named
     (**WEC**, **SDC**, …).
   - *Future, only-if-required:* widen "EW" to mean **Valheim World Editing**
     generally — any mod doing Valheim hacks / world editing / custom content,
     potentially beyond Jere. Explicitly speculative; not pre-built for.

3. **Name: keep `ew_toolkit` / "EW Toolkit", branded after the flagship line.**
   "EW" = ExpandWorld; the site is named after its anchor product line even
   though non-EW Jere mods ride along (as a company keeps its first product's
   name). `ewp_toolkit` is already wrong today (scope > EWP); `ew_toolkit` is
   correct for the near-and-medium scope. The far-future general-VWE scope, if
   it ever arrives, is a big enough pivot to earn its own deliberate rebrand
   then — not pre-paid now (YAGNI). Confirms ticket 14's rename target.

4. **This map ships the validator as a standalone page.** The hub shell /
   landing / navigation (validator as one tool among several) belongs entirely
   to the new hub map, not here. This map's only reframe-driven change is the
   rename (ticket 14).

5. **The hub map gets charted AFTER the validator ships + deploys**, in a fresh
   chat via `/handoff`. The hub's destination reasons better against a real,
   shipped tool #1, and the multi-tool build isn't urgent. Recorded as a future
   effort in the map's Out of scope (out of scope for *this* map, not abandoned).

Domain vocabulary added to the map's Notes: **EW Toolkit** (umbrella/site),
**Tool** (a discrete utility on the site; the EWP validator is tool #1), and the
tiered scope definition above.
