// Single source of truth for every icon glyph across the Hub — the Landing
// page and every Tool import from here instead of hand-copying path data
// (see ew_toolkit/map.md's message-quality checklist item 8). Outline-only:
// no fill, currentColor stroke, viewBox 24 — the Hub's "minimalist dark
// chrome" identity. A Tool that only needs a handful of these can just
// import the keys it uses; unused entries tree-shake away.
export const ICON_PATHS = {
  // Notepad with a folded corner + ruled lines. Doubles as the nav's
  // ewp_validator Tool icon and the validator's own generic "file" glyph.
  file: '<path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M15 3v4h4"/><path d="M8 11h3"/><path d="M8 14h6"/><path d="M8 17h4"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  // Upload glyphs: the document/folder outline with the "+" drawn as part of the
  // same stroke (currentColor), so the plus reads as one with the icon rather
  // than a tacked-on blue superscript. Used identically in the toolbar and the
  // drag-and-drop empty state.
  filePlus:
    '<path d="M15 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7z"/><path d="M15 3v4h4"/><path d="M12 11v6"/><path d="M9 14h6"/>',
  folderPlus:
    '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 10v6"/><path d="M9 13h6"/>',
  funnel: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  dragArrow: '<path d="M9 10 4 15l5 5"/><path d="M4 15h11a5 5 0 0 0 5-5V4"/>',
  arrowUp: '<path d="M12 20V6"/><path d="m6 12 6-6 6 6"/>',
  arrowDown: '<path d="M12 4v14"/><path d="m6 12 6 6 6-6"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  close: '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
  // Circular two-arrow refresh — the "reset to default" affordance (clearer than
  // a bare × for "put this back the way it was").
  reset: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>',
  // Two stacked sheets — the universal "copy to clipboard" glyph.
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M6 15a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1"/>',
  // Ladybird beetle: antennae, a split domed shell, and four spots — the
  // "file a report" affordance (bug report).
  ladybug:
    '<path d="M12 6c1.4 0 2.6.9 3.1 2.2"/><path d="M12 6c-1.4 0-2.6.9-3.1 2.2"/><path d="m6 8-1.8-1.4"/><path d="m18 8 1.8-1.4"/><ellipse cx="12" cy="13.5" rx="6.5" ry="7"/><path d="M12 7v13"/><circle cx="8.6" cy="12" r=".7"/><circle cx="15.4" cy="12" r=".7"/><circle cx="8.9" cy="16.5" r=".7"/><circle cx="15.1" cy="16.5" r=".7"/>',
  // Classic floppy disk: shutter notch at the top, label at the bottom.
  save: '<path d="M5 4h11l3 3v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M8 4v5h6V4"/><path d="M8 13h8v6H8z"/>',
  // Arrow leaving an open tray upward — the standard "export" glyph, deliberately
  // the mirror of a "download into tray" icon rather than the save-to-disk metaphor.
  export: '<path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-9"/><path d="M9.5 20v-6h5v6"/>',
  // "Buy me a coffee" cup — the donation convention, matching what the
  // Support page actually links to.
  support:
    '<path d="M5 9h12v7a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V9z"/><path d="M17 10.5h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M9 3c0 1-1 1-1 2s1 1 1 2"/><path d="M13 3c0 1-1 1-1 2s1 1 1 2"/>',
  // Toolbox — the fallback for a Tool with no hand-picked nav icon.
  toolbox:
    '<rect x="2" y="7" width="20" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M2 13h20"/><path d="M10 13v1a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-1"/>',
};

export type IconKey = keyof typeof ICON_PATHS;

// Wraps raw path data in the Hub's standard outline-icon shell. `extra` is
// passed through verbatim for one-off attributes a call site needs (e.g. a
// class for CSS-driven sizing/rotation).
export function svgIcon(paths: string, extra = ""): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ${extra}>${paths}</svg>`;
}

export function icon(key: IconKey, extra = ""): string {
  return svgIcon(ICON_PATHS[key], extra);
}
