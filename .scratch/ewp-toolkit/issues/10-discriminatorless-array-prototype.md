# Prototype the top-level oneOf union for EWP/WEC's discriminator-less array

Type: prototype
Status: open
Blocked by: (none)

## Question

Ticket 02 confirmed EWP script files are one YAML array mixing four shapes with no tag field: EWP rule entries, WEC data entries, value entries, and value groups (see [[Discriminator-less array]] in CONTEXT.md). The schema needs a `oneOf`/`anyOf` union across these shapes, which JSON Schema validators are historically bad at producing readable errors for (a malformed entry can get reported against every branch it didn't match, rather than the one branch it was clearly attempting).

Build a small throwaway prototype: a `oneOf` JSON Schema covering the four shapes, tested against real mixed-content example files from the EWP repo (`examples_bosses.md` etc.) via monaco-yaml, including deliberately broken entries (typo'd key, wrong type). Evaluate whether monaco-yaml's error output is usable as-is, or whether the union needs restructuring (e.g. a cheap structural pre-check to pick the likely-intended branch before delegating to its full schema) to keep error messages pointing at the right thing.

Link the prototype as an asset when resolving.
