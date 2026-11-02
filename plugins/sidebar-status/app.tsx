import { definePluginApp } from "@get-bb/plugin-sdk/app";

// Moves a thread's status from the trailing indicator into the leading
// Local/Cloud icon slot, and bolds unread threads.
//
// Matches Cloudroom v139 sidebar markup with Settings → Appearance → Harness
// icons set to Off (the default). A thread row's container directly holds its
// a[data-sidebar-thread-id] link, then the title span (location icon +
// .bb-thread-title), then the trailing span with the status indicator. Status
// is read from the indicator's aria-label, which comes from Cloudroom's
// thread-list label table. If a label changes, that state falls back to
// Cloudroom's own trailing indicator.
const ROW = ":has(> a[data-sidebar-thread-id])";
const TITLE = `${ROW} > a + span`;
const TRAILING = `${ROW} > a ~ span:last-child`;

const STATES = [
  { label: "Thread working", glyph: "running" },
  { label: "Thread needs user input", glyph: "needs-you" },
  { label: "Unread thread failed", glyph: "failed" },
  { label: "Unread thread succeeded", glyph: "unread" },
] as const;

const rowIn = (label: string) => `${ROW}:has(> a ~ span:last-child [aria-label="${label}"])`;

// Every glyph fills the 14px slot the 3.5-size location icon used, so
// indentation and the tree guide line stay where they were.
const GLYPH_CSS: Record<(typeof STATES)[number]["glyph"], string> = {
  running: `
    width: 11px; height: 11px; margin: 1.5px;
    border: 1.5px solid var(--color-blue-400, #60a5fa);
    border-top-color: transparent;
    border-radius: 50%;
    animation: sidebar-status-spin 0.9s linear infinite;`,
  "needs-you": `
    content: "?";
    border: 1.25px solid var(--color-warning-text, #f59e0b);
    border-radius: 50%;
    color: var(--color-warning-text, #f59e0b);
    font: 700 9px/1 system-ui, sans-serif;`,
  failed: `
    content: "\\00d7";
    border: 1.25px solid var(--color-destructive-text, #ef4444);
    border-radius: 50%;
    color: var(--color-destructive-text, #ef4444);
    font: 700 11px/1 system-ui, sans-serif;`,
  unread: `
    width: 6px; height: 6px; margin: 4px;
    border-radius: 50%;
    background: var(--color-foreground);`,
};

const SIDEBAR_STATUS_CSS = `
@keyframes sidebar-status-spin { to { transform: rotate(360deg); } }

${TITLE} > [aria-label="Local thread"] { display: none !important; }
${TITLE}:has(> [aria-label="Local thread"])::before,
${STATES.map(({ label }) => `${rowIn(label)} > a + span::before`).join(",\n")} {
  content: "";
  flex: none;
  box-sizing: border-box;
  width: 14px;
  height: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

${STATES.map(({ label }) => `${rowIn(label)} > a + span > [aria-label="Cloud thread"]`).join(",\n")},
${STATES.map(({ label }) => `${TRAILING} [aria-label="${label}"]`).join(",\n")} {
  display: none !important;
}

${STATES.map(({ label, glyph }) => `${rowIn(label)} > a + span::before {${GLYPH_CSS[glyph]}\n}`).join("\n")}

@media (prefers-reduced-motion: reduce) {
  ${rowIn("Thread working")} > a + span::before { animation: none; }
}

${ROW}:has(> a ~ span:last-child [aria-label^="Unread thread"]) .bb-thread-title {
  font-weight: 600;
  color: var(--color-foreground);
}
`;

export default definePluginApp((app) => {
  app.contentScripts.register({
    id: "sidebar-status",
    mount: () => {
      const style = document.createElement("style");
      style.textContent = SIDEBAR_STATUS_CSS;
      document.head.append(style);
      return () => style.remove();
    },
  });
});
