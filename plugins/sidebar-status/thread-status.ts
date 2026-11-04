// Shared status shapes keep the sidebar and mobile Recents visually consistent.

export const STATES = [
  { label: "Thread working", glyph: "running" },
  { label: "Thread needs user input", glyph: "needs-you" },
  { label: "Unread thread failed", glyph: "failed" },
  { label: "Unread thread succeeded", glyph: "unread" },
] as const;

// Kept faint on purpose: rings are an anchor and a glance-level hint, and
// must stay quieter than the attention glyphs above.
export const RING_TRACK = "color-mix(in oklab, var(--muted-foreground) 15%, transparent)";
export const RING_ARC = "color-mix(in oklab, var(--muted-foreground) 38%, transparent)";
// Cuts the conic fill down to a 1.5px stroke.
export const RING_MASK = "radial-gradient(farthest-side, transparent calc(100% - 1.5px), #000 calc(100% - 1.5px))";

export const GLYPH_CSS: Record<(typeof STATES)[number]["glyph"], string> = {
  running: `
    width: 0.6875rem; height: 0.6875rem; margin: 0.09375rem;
    border: 1.5px solid #60a5fa;
    border-top-color: transparent;
    border-radius: 50%;
    animation: sidebar-status-spin 0.9s linear infinite;`,
  "needs-you": `
    content: "?";
    border: 1.25px solid var(--warning-text);
    border-radius: 50%;
    color: var(--warning-text);
    font: 700 0.5625rem/1 system-ui, sans-serif;`,
  // Two drawn diagonal strokes, not a "×" character: that glyph sits on the
  // font's math axis, below the circle's center in some engine/font pairs.
  failed: `
    border: 1.25px solid var(--destructive-text);
    border-radius: 50%;
    background:
      linear-gradient(45deg, transparent calc(50% - 0.75px), var(--destructive-text) 0 calc(50% + 0.75px), transparent 0) center / 0.375rem 0.375rem no-repeat,
      linear-gradient(-45deg, transparent calc(50% - 0.75px), var(--destructive-text) 0 calc(50% + 0.75px), transparent 0) center / 0.375rem 0.375rem no-repeat;`,
  unread: `
    width: 0.375rem; height: 0.375rem; margin: 0.25rem;
    border-radius: 50%;
    background: var(--foreground);`,
};

export const PROGRESS_ATTRIBUTE = "data-sidebar-status-progress";

/** Null means Cloudroom has not summarized the thread yet. */
export function progressBucket(percent: number | null): string {
  return percent === null ? "none" : String(Math.round(percent / 10) * 10);
}
