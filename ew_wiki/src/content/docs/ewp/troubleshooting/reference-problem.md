---
title: "Troubleshooting: Reference problem"
description: One representative diagnosis-category page from Troubleshooting.
---

Troubleshooting is organized by the validator's own diagnosis-category vocabulary, so wording here and in the validator's Problems panel never diverge.

## Reference problem

Raised by [[Reference validation]] when a `data:`/`addItems:`/`removeItems:`/`drops:` value points at a `data.yaml` identifier that no `name:` entry in your loaded files actually defines.

**What this probably means**: the referenced name is misspelled, or the file that defines it wasn't loaded alongside this one.

**Smallest fix**:

1. Check the spelling of the referenced name against the `name:` entry that should define it.
2. If the defining file is separate, load it into the same batch — reference checking only sees files that are loaded together.
3. If the name really is defined by another mod or a console command outside your batch, this is a false positive you can ignore for now.

A defined-but-never-used `name:` entry is a low-severity hint, not an error — it isn't wrong, just possibly dead.

This is one of several diagnosis categories (others include Structural problems and Custom-saved-key notices); a full Troubleshooting section would carry one page per category.
