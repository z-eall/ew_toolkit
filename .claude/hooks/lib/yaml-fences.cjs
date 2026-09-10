// Shared by any hook that needs to pull EWP-script YAML examples out of
// Markdown/MDX doc content: extract ```yaml fences, and undo whatever base
// indent the surrounding Markdown container (a numbered <Steps> item, a
// blockquote) added on top of the YAML's own.

// Extracts ```yaml fenced blocks from Markdown/MDX. Returns an array of
// block text, one per fence, so each example can be checked independently.
function extractYamlFences(mdText) {
  const fenceRe = /```ya?ml\r?\n([\s\S]*?)```/g;
  const blocks = [];
  let m;
  while ((m = fenceRe.exec(mdText))) {
    blocks.push(m[1]);
  }
  return blocks;
}

// A fenced ```yaml block quoted inside a numbered <Steps> item (or any
// blockquote/list) carries whatever base indent that container adds on top
// of the YAML's own — e.g. 3 extra spaces inside "1. ...\n\n   ```yaml".
// Strip the common leading whitespace across all non-blank lines first, so
// indent 0/2/4 always mean the same thing regardless of how deep the fence
// itself sits in the surrounding Markdown.
function dedent(text) {
  const lines = text.split("\n");
  let minIndent = Infinity;
  for (const line of lines) {
    if (line.trim() === "") continue;
    const indent = line.length - line.trimStart().length;
    if (indent < minIndent) minIndent = indent;
  }
  if (!isFinite(minIndent) || minIndent === 0) return text;
  return lines.map((l) => (l.trim() === "" ? l : l.slice(minIndent))).join("\n");
}

module.exports = { extractYamlFences, dedent };
