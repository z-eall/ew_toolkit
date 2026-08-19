// Plain-language translations for the `yaml` npm package's parser
// errors/warnings, requested per the message-quality effort following the
// Schema Source Audit map: a raw error like "Nested mappings are not allowed
// in compact mappings at line 2, column 9" is accurate but unreadable to a
// non-coding scripter.
//
// `ErrorCode` (node_modules/yaml/dist/errors.d.ts) is a CLOSED union of 23
// values, so this table can cover all of them by construction — no targeted
// subset, no risk of missing a case that shows up later. `translateYamlError`
// still falls back to a friendly-but-generic wrapper for any code this table
// doesn't recognize (a future `yaml` upgrade adding a 24th code, for
// instance), so the raw technical message is never shown completely bare.
import type { ErrorCode } from "yaml";

// Keep in the same order as errors.d.ts's union, so a future diff against
// that file is a straightforward side-by-side read.
const YAML_ERROR_MESSAGES: Record<ErrorCode, string> = {
  ALIAS_PROPS: "A YAML alias (`*name`) can't carry its own properties. Remove the anchor/alias shorthand and write the value directly.",
  BAD_ALIAS: "This alias (`*name`) doesn't match any anchor (`&name`) defined earlier in the file. Check the spelling, or write the value directly instead of using an alias.",
  BAD_DIRECTIVE: "This line looks like a YAML directive (starts with `%`), which isn't valid here. Remove the leading `%`, or check for a stray character at the start of the line.",
  BAD_DQ_ESCAPE: 'This double-quoted text has an invalid `\\` escape sequence. Check the backslash, or switch to single quotes if you don\'t need an escape.',
  BAD_INDENT: "This line's indentation doesn't line up with the rest of its block. Make sure it uses the same number of spaces as its sibling lines — YAML is indentation-sensitive, and mixing tabs with spaces is a common cause.",
  BAD_PROP_ORDER: "An anchor (`&name`) and a tag (`!!type`) are in the wrong order on this line — the tag has to come before the anchor.",
  BAD_SCALAR_START: "This value starts with a character YAML treats as special (like `@`, a backtick, or a stray quote). Wrap the value in quotes, or remove/escape the special character.",
  BLOCK_AS_IMPLICIT_KEY: "A multi-line value is being used as a mapping key, which YAML doesn't allow. Move the multi-line content to the value side instead, or keep the key on one line.",
  BLOCK_IN_FLOW: "A multi-line (block-style) value was found inside a `{ }`/`[ ]` flow-style mapping or list. Keep everything inside `{ }`/`[ ]` on one line, or rewrite it using `-`/`key:` block style instead.",
  DUPLICATE_KEY: "This key appears more than once in the same entry. YAML only keeps the last one — remove or rename the duplicate.",
  IMPOSSIBLE: "Something about this file's structure couldn't be parsed. Try simplifying the surrounding lines, or double-check the indentation and punctuation nearby.",
  KEY_OVER_1024_CHARS: "This key is unusually long (over 1024 characters), which plain YAML keys don't support. Shorten it, or use the explicit `? key` / `: value` form.",
  MISSING_CHAR: "A character YAML needs here is missing — often an unclosed quote or bracket, or a missing `:` after a key. Check the punctuation around this spot.",
  MULTILINE_IMPLICIT_KEY: "A mapping key spans multiple lines, which isn't allowed for a plain key. Put the key on a single line, or quote it.",
  MULTIPLE_ANCHORS: "This value has more than one anchor (`&name`) attached. Only one anchor is allowed per value — remove the extra one.",
  MULTIPLE_DOCS: "This file contains more than one YAML document (separated by `---`), but only one is expected here. Remove the extra `---` separator, or move the second document to its own file.",
  MULTIPLE_TAGS: "This value has more than one tag (`!!type`) attached. Only one tag is allowed per value — remove the extra one.",
  NON_STRING_KEY: "This mapping key isn't plain text (it looks like a nested list or object). Use a plain word or a quoted string as the key instead.",
  RESOURCE_EXHAUSTION: "This file is too large or too deeply nested for the parser to process safely. Try splitting it into smaller files, or simplifying deeply nested structures.",
  TAB_AS_INDENT: "A tab character was used for indentation. YAML requires spaces for indentation — replace the tab(s) with spaces.",
  TAG_RESOLVE_FAILED: "This custom tag (`!...`) couldn't be resolved. Remove the tag, or check that it's spelled correctly.",
  UNEXPECTED_TOKEN: "There's a character or symbol here that doesn't fit valid YAML syntax at this point. Check the nearby punctuation — colons, dashes, quotes, and brackets are the usual culprits.",
  BAD_COLLECTION_TYPE: "A list (`- item`) and a mapping (`key: value`) got mixed together in a way YAML can't reconcile. Make sure this entry is consistently either a list or a set of `key: value` pairs.",
};

/**
 * A plain-language rewrite of a `yaml` package parse error/warning. Always
 * returns a readable sentence — even for a `code` this table doesn't
 * recognize, the raw library message is folded into a friendly wrapper
 * rather than shown bare.
 */
export function translateYamlError(err: { code?: string; message: string }): string {
  const known = err.code && Object.prototype.hasOwnProperty.call(YAML_ERROR_MESSAGES, err.code)
    ? YAML_ERROR_MESSAGES[err.code as ErrorCode]
    : undefined;
  if (known) return known;
  return `This file has a YAML formatting problem here (${err.message}). Check the indentation, quotes, and punctuation around this spot.`;
}
