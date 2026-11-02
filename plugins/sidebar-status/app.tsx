import { useEffect, useState } from "react";
import { definePluginApp, useRpc } from "@get-bb/plugin-sdk/app";
import type { rpcContract } from "./server";
import { startCollapseMotion } from "./collapse-motion";

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
const ATTENTION_STATES = STATES.map(({ label }) => `:has(> a ~ span:last-child [aria-label="${label}"])`).join(", ");

// Idle Local threads show a muted ring filled to their Cloudroom purpose
// "% done". The ThreadProgressRings overlay writes a 10-step bucket ("none",
// "0" … "100") onto each row container; CSS draws the ring from it.
const PROGRESS_ATTRIBUTE = "data-sidebar-status-progress";
const PROGRESS_POLL_MS = 60_000;
// Kept faint on purpose: rings are an anchor and a glance-level hint, and
// must stay quieter than the attention glyphs above.
const RING_TRACK = "color-mix(in oklab, var(--muted-foreground) 15%, transparent)";
const RING_ARC = "color-mix(in oklab, var(--muted-foreground) 38%, transparent)";
// Cuts the conic fill down to a 1.5px stroke.
const RING_MASK = "radial-gradient(farthest-side, transparent calc(100% - 1.5px), #000 calc(100% - 1.5px))";
const idleLocalRow = (progress = "") =>
  `${ROW}[${PROGRESS_ATTRIBUTE}${progress && `="${progress}"`}]:not(${ATTENTION_STATES}):has(> a + span > [aria-label="Local thread"])`;

const LABEL_TIER = '[data-sidebar-sticky-tier="label"]';
// Project groups carry no section id (only Pinned and similar sections do),
// so match the sticky group directly under the project item.
const PROJECT_SECTION = "[data-sidebar-sticky-project-item] > [data-sidebar-sticky-group]";
const PROJECT_HEADER = `${PROJECT_SECTION} > ${LABEL_TIER}`;
const EMPTY_PROJECT = `${PROJECT_SECTION}:has(> ${LABEL_TIER} button[aria-expanded="true"]):not(:has(a[data-sidebar-thread-id]))`;

// Colors use Cloudroom's raw theme variables (--foreground, --warning-text…).
// Its Tailwind `@theme inline` block compiles --color-* names away, so those
// are undefined at runtime and would render transparent.
//
// Every glyph fills the 14px slot the 3.5-size location icon used, so
// indentation and the tree guide line stay where they were.
const GLYPH_CSS: Record<(typeof STATES)[number]["glyph"], string> = {
  running: `
    width: 11px; height: 11px; margin: 1.5px;
    border: 1.5px solid #60a5fa;
    border-top-color: transparent;
    border-radius: 50%;
    animation: sidebar-status-spin 0.9s linear infinite;`,
  "needs-you": `
    content: "?";
    border: 1.25px solid var(--warning-text);
    border-radius: 50%;
    color: var(--warning-text);
    font: 700 9px/1 system-ui, sans-serif;`,
  failed: `
    content: "\\00d7";
    border: 1.25px solid var(--destructive-text);
    border-radius: 50%;
    color: var(--destructive-text);
    font: 700 11px/1 system-ui, sans-serif;`,
  unread: `
    width: 6px; height: 6px; margin: 4px;
    border-radius: 50%;
    background: var(--foreground);`,
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
  color: var(--foreground);
}

/* Idle threads recede so projects and threads that need attention lead. */
${ROW}:not(.bb-sidebar-selected-row):not(:hover):not(${ATTENTION_STATES}) .bb-thread-title {
  color: color-mix(in oklab, var(--sidebar-foreground) 62%, transparent);
}

${idleLocalRow()} > a + span::before {
  width: 10px; height: 10px; margin: 2px;
  border-radius: 50%;
  background: conic-gradient(${RING_ARC} var(--sidebar-status-progress, 0%), ${RING_TRACK} 0);
  -webkit-mask: ${RING_MASK};
  mask: ${RING_MASK};
}
${[10, 20, 30, 40, 50, 60, 70, 80, 90]
  .map((percent) => `${idleLocalRow(String(percent))} > a + span::before { --sidebar-status-progress: ${percent}%; }`)
  .join("\n")}
/* Done: a bare muted check, a hint that the thread can be archived. */
${idleLocalRow("100")} > a + span::before {
  content: "\\2713";
  background: none;
  -webkit-mask: none;
  mask: none;
  width: 14px; height: 14px; margin: 0;
  color: ${RING_ARC};
  font: 700 9px/1 system-ui, sans-serif;
}

/* Project headers outrank idle threads (Cloudroom draws them 12px and dim)
   but stay below unread threads, which are the only full-white bold rows. */
${PROJECT_HEADER} {
  font-size: 13px;
  font-weight: 600;
  color: color-mix(in oklab, var(--foreground) 75%, transparent);
}
${PROJECT_HEADER} button[aria-expanded].bb-sidebar-hover-actions {
  opacity: 0.45;
  pointer-events: auto;
}

/* Empty projects: an expanded project with no thread links. Drop its
   children (the "No threads" row, or "All threads pinned" / "Threads
   unavailable", which share that slot) and dim the header. Collapsed projects
   also have no links in the DOM, hence the aria-expanded check. */
${EMPTY_PROJECT} > ${LABEL_TIER} + div { display: none; }
${EMPTY_PROJECT} > ${LABEL_TIER} {
  font-weight: 500;
  color: var(--muted-foreground);
}
`;

type ThreadProgress = ReadonlyMap<string, number | null>;

function progressBucket(percent: number | null): string {
  return percent === null ? "none" : String(Math.round(percent / 10) * 10);
}

/** Purpose percent per open thread, refreshed every minute while the page is visible. */
function useThreadProgress(): ThreadProgress {
  const rpc = useRpc<typeof rpcContract>();
  const [progress, setProgress] = useState<ThreadProgress>(() => new Map());

  useEffect(() => {
    let cancelled = false;
    let latestRequest = 0;
    const load = () => {
      if (document.hidden) return;
      const request = ++latestRequest;
      rpc.call("threadProgress").then(
        ({ threads }) => {
          if (cancelled || request !== latestRequest) return;
          setProgress(new Map(threads.map((thread) => [thread.id, thread.percent])));
        },
        // Keep the last rings; the next poll retries.
        () => {},
      );
    };
    load();
    const timer = window.setInterval(load, PROGRESS_POLL_MS);
    document.addEventListener("visibilitychange", load);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [rpc]);

  return progress;
}

/**
 * Tags sidebar row containers with their progress bucket. Rows remount as the
 * list changes, so a MutationObserver re-tags after sidebar DOM changes.
 * React leaves attributes it doesn't own alone on rows it keeps.
 */
function useRowProgressAttributes(progress: ThreadProgress): void {
  useEffect(() => {
    const tagRows = () => {
      for (const link of document.querySelectorAll<HTMLElement>("a[data-sidebar-thread-id]")) {
        const row = link.parentElement;
        const threadId = link.dataset.sidebarThreadId;
        if (!row || !threadId) continue;
        if (!progress.has(threadId)) {
          row.removeAttribute(PROGRESS_ATTRIBUTE);
          continue;
        }
        const bucket = progressBucket(progress.get(threadId) ?? null);
        if (row.getAttribute(PROGRESS_ATTRIBUTE) !== bucket) row.setAttribute(PROGRESS_ATTRIBUTE, bucket);
      }
    };

    let frame = 0;
    const observer = new MutationObserver((records) => {
      if (frame) return;
      const touchesSidebar = records.some(
        (record) => record.target instanceof Element && record.target.closest("[data-sidebar-sticky-project-item], [data-sidebar-section-id]"),
      );
      if (touchesSidebar) frame = requestAnimationFrame(() => {
        frame = 0;
        tagRows();
      });
    });
    tagRows();
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      for (const row of document.querySelectorAll(`[${PROGRESS_ATTRIBUTE}]`)) row.removeAttribute(PROGRESS_ATTRIBUTE);
    };
  }, [progress]);
}

function ThreadProgressRings() {
  useRowProgressAttributes(useThreadProgress());
  return null;
}

export default definePluginApp((app) => {
  app.slots.experimental_appOverlay({ id: "thread-progress-rings", component: ThreadProgressRings });
  app.contentScripts.register({
    id: "sidebar-status",
    mount: () => {
      const style = document.createElement("style");
      style.textContent = SIDEBAR_STATUS_CSS;
      document.head.append(style);
      return () => style.remove();
    },
  });
  app.contentScripts.register({ id: "collapse-motion", mount: startCollapseMotion });
});
