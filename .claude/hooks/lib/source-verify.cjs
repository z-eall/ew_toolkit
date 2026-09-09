// Shared logic for "was a trusted source touched recently" hooks.
// Data-driven: patterns come from each Tool's own docs/sources.md, never
// hardcoded here, so a new Tool (different mod, different sources) needs
// zero changes to this file — just its own sources.md and one config-table
// entry in the hook that uses this. See docs/agents/hooks-vs-rules.md.
const fs = require("fs");

// Pull evidence patterns out of a sources.md: every URL's hostname (so a
// fetch to any path on that host counts), plus every backtick-quoted
// filename that looks like a real source file (.cs/.json/.md) - covers both
// "fetched the mod's GitHub repo" and "read the local schema file" evidence.
function extractPatternsFromSourcesFile(sourcesFilePath) {
  if (!sourcesFilePath || !fs.existsSync(sourcesFilePath)) return [];

  let text = "";
  try {
    text = fs.readFileSync(sourcesFilePath, "utf8");
  } catch (e) {
    return [];
  }

  const patterns = new Set();

  const urlRe = /https?:\/\/([a-z0-9.-]+)/gi;
  let m;
  while ((m = urlRe.exec(text))) {
    patterns.add(m[1].toLowerCase());
  }

  const fileRe = /`([\w./-]+\.(cs|json|md))`/g;
  while ((m = fileRe.exec(text))) {
    patterns.add(m[1]);
  }

  return Array.from(patterns).map(
    (p) => new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
  );
}

// Only the last N transcript lines count - an old fetch from much earlier
// in a long session shouldn't silently cover a totally unrelated edit later.
function recentTranscriptText(transcriptPath, windowSize) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return "";
  try {
    const lines = fs
      .readFileSync(transcriptPath, "utf8")
      .split("\n")
      .filter((l) => l.trim().length > 0);
    return lines.slice(-windowSize).join("\n");
  } catch (e) {
    return "";
  }
}

function checkRecentSourceEvidence({ transcriptPath, sourcesFilePath, windowSize }) {
  const patterns = extractPatternsFromSourcesFile(sourcesFilePath);
  const recentText = recentTranscriptText(transcriptPath, windowSize || 15);
  const matched = patterns.filter((re) => re.test(recentText));
  return { patterns, matched, up: matched.length > 0 };
}

module.exports = {
  extractPatternsFromSourcesFile,
  recentTranscriptText,
  checkRecentSourceEvidence,
};
