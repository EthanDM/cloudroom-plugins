import { useEffect, useState } from "react";
import { definePluginApp, useRpc } from "@get-bb/plugin-sdk/app";
import type { rpcContract } from "./server";
import { startCollapseMotion } from "./collapse-motion";
import { GLYPH_CSS, PROGRESS_ATTRIBUTE, RING_ARC, RING_MASK, RING_TRACK, STATES, progressBucket } from "./thread-status";
import { MOBILE_RECENTS_CSS, RECENTS, clearMobileRecentAttributes, tagMobileRecentRows } from "./mobile-recents";

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

const rowIn = (label: string) => `${ROW}:has(> a ~ span:last-child [aria-label="${label}"])`;
const ATTENTION_STATES = STATES.map(({ label }) => `:has(> a ~ span:last-child [aria-label="${label}"])`).join(", ");

// Idle Local threads show a muted ring filled to their Cloudroom purpose
// "% done". The ThreadRowHints overlay writes a 10-step bucket ("none",
// "0" … "100") onto each row container; CSS draws the ring from it.
const PROGRESS_POLL_MS = 60_000;
const idleLocalRow = (progress = "") =>
  `${ROW}[${PROGRESS_ATTRIBUTE}${progress && `="${progress}"`}]:not(${ATTENTION_STATES}):has(> a + span > [aria-label="Local thread"])`;

// Threads idle for STALE_AFTER_DAYS or more show their age ("4d", "2w") in
// the trailing slot, a nudge to archive. The overlay writes the label onto
// the trailing span, since CSS attr() only reads the element it draws on.
const AGE_ATTRIBUTE = "data-sidebar-status-age";
const STALE_AFTER_DAYS = 3;
const DAY_MS = 86_400_000;
// The trailing slot is empty on idle rows: Cloudroom renders a
// [data-sidebar-thread-trailing-indicator] there only for other states, and
// swaps the slot for a shortcut pill while a modifier key is held.
const STALE_ROW = `${ROW}:not(${ATTENTION_STATES}):not(:has([data-sidebar-thread-trailing-indicator])):has(> a ~ span:last-child [data-sidebar-hover-actions-mobile])`;

const SIDEBAR = ":is([data-sidebar-sticky-project-item], [data-sidebar-section-id])";
const LABEL_TIER = '[data-sidebar-sticky-tier="label"]';
// Project groups carry no section id (only Pinned and similar sections do),
// so match the sticky group directly under the project item.
const PROJECT_SECTION = "[data-sidebar-sticky-project-item] > [data-sidebar-sticky-group]";
const PROJECT_HEADER = `${PROJECT_SECTION} > ${LABEL_TIER}`;
// An expanded project with no threads shows one message in its children slot:
// "No threads", "All threads pinned", or "Threads unavailable" (load failed),
// with identical markup. Only the first two mean empty, so the overlay tags
// the project item by exact text. Anything else, including the load error, a
// loading skeleton, or reworded copy, stays visible.
const EMPTY_ATTRIBUTE = "data-sidebar-status-empty";
const EMPTY_MESSAGES = new Set(["No threads", "All threads pinned"]);
const EMPTY_PROJECT_ITEM = `[data-sidebar-sticky-project-item][${EMPTY_ATTRIBUTE}]`;
const EMPTY_PROJECT = `${EMPTY_PROJECT_ITEM} > [data-sidebar-sticky-group]`;

// Colors use Cloudroom's raw theme variables (--foreground, --warning-text…).
// Its Tailwind `@theme inline` block compiles --color-* names away, so those
// are undefined at runtime and would render transparent.
//
// Sizes are in rem (16px base) so they follow ui-scale or any root font
// size the way Cloudroom's own rem-based UI does.
//
// Every glyph fills the 0.875rem slot the size-3.5 location icon used, so
// indentation and the tree guide line stay where they were.
const SIDEBAR_STATUS_CSS = `
@keyframes sidebar-status-spin { to { transform: rotate(360deg); } }

${TITLE} > [aria-label="Local thread"] { display: none !important; }
${TITLE}:has(> [aria-label="Local thread"])::before,
${STATES.map(({ label }) => `${rowIn(label)} > a + span::before`).join(",\n")} {
  content: "";
  flex: none;
  box-sizing: border-box;
  width: 0.875rem;
  height: 0.875rem;
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
/* An idle Cloud thread keeps its cloud icon, in the rings' grey: the shape
   still tells Cloud from Local, while color stays reserved for status. */
${ROW}:not(${ATTENTION_STATES}) > a + span > [aria-label="Cloud thread"] {
  color: ${RING_ARC};
}

${idleLocalRow()} > a + span::before {
  width: 0.625rem; height: 0.625rem; margin: 0.125rem;
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
  width: 0.875rem; height: 0.875rem; margin: 0;
  color: ${RING_ARC};
  font: 700 0.5625rem/1 system-ui, sans-serif;
}

/* Stale age sits in the empty trailing slot, so it costs no title width. It
   gives way to the hover actions, and is left off phones, where the actions
   menu is always shown in that slot. */
${STALE_ROW} > a ~ span:last-child[${AGE_ATTRIBUTE}] { position: relative; }
${STALE_ROW} > a ~ span:last-child[${AGE_ATTRIBUTE}]::before {
  content: attr(${AGE_ATTRIBUTE});
  position: absolute;
  right: 6px;
  top: 50%;
  translate: 0 -50%;
  pointer-events: none;
  font: 400 0.6875rem/1 system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  color: ${RING_ARC};
}
${ROW}:is(:hover, :focus-within, :has([data-sidebar-hover-actions-open="true"])) > a ~ span:last-child::before {
  visibility: hidden;
}
@media (max-width: 767px) and (pointer: coarse) {
  ${STALE_ROW} > a ~ span:last-child[${AGE_ATTRIBUTE}]::before { content: none; }
}

/* Project headers outrank idle threads (Cloudroom draws them 12px and dim).
   Medium weight keeps bold for unread threads alone; brightness carries the
   hierarchy instead. */
${PROJECT_HEADER} {
  font-size: 0.8125rem;
  font-weight: 500;
  color: color-mix(in oklab, var(--foreground) 88%, transparent);
}
${PROJECT_HEADER} button[aria-expanded].bb-sidebar-hover-actions {
  opacity: 0.45;
  pointer-events: auto;
}

/* Tree guide lines use --border-hairline, a mix of the theme's ink and canvas
   that tinted themes carry into the lines (olive under a warm canvas).
   Repaint them in the muted grey the rings use so color stays reserved for
   status. Covers the project group line (a ::before) and the child-thread
   group line (a span). */
${SIDEBAR} [class*="before:bg-border-hairline"]::before,
${SIDEBAR} span.w-px.bg-border-hairline {
  background-color: color-mix(in oklab, var(--muted-foreground) 30%, transparent);
}
/* The sidebar's right edge (--border-seam) carries the same tint. */
[data-sidebar="panel"] {
  border-right-color: color-mix(in oklab, var(--muted-foreground) 22%, var(--sidebar));
}
/* Cloudroom puts a child-group line's left edge at row padding + 8px (px,
   set inline), so the 1px line centers at +8.5px, while the 0.875rem glyph
   slot above it centers at +0.4375rem (7px at the default size). Shift the
   line by the difference so it sits under the parent's glyph at any root
   font size. */
${SIDEBAR} span.w-px.bg-border-hairline { translate: calc(0.4375rem - 8.5px) 0; }

/* Empty projects (tagged by the overlay, see EMPTY_ATTRIBUTE): drop the
   "No threads" / "All threads pinned" row and dim the header. The dim is a
   fraction of --foreground, below idle threads: dark themes set
   --muted-foreground nearly as bright as --foreground, which would leave
   empty headers brighter than the 88% ones. */
${EMPTY_PROJECT} > ${LABEL_TIER} + div { display: none; }
${EMPTY_PROJECT} > ${LABEL_TIER} {
  color: color-mix(in oklab, var(--foreground) 50%, transparent);
}
/* Back-to-back empty projects stack at about thread-row spacing instead of
   Cloudroom's 1rem section gap (space-y-4 on the project list). The negative
   margin collapses with that 1rem bottom margin, leaving 4px. */
${EMPTY_PROJECT_ITEM} + ${EMPTY_PROJECT_ITEM} { margin-top: calc(4px - 1rem); }
`;

interface SidebarThread {
  percent: number | null;
  lastActiveAt: number;
}
type SidebarThreads = ReadonlyMap<string, SidebarThread>;

/** "4d", "2w", "3mo" once a thread has been idle STALE_AFTER_DAYS; null before. */
function staleAge(lastActiveAt: number, now: number): string | null {
  const days = Math.floor((now - lastActiveAt) / DAY_MS);
  if (days < STALE_AFTER_DAYS) return null;
  if (days < 14) return `${days}d`;
  if (days < 60) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
}

function setOrRemoveAttribute(element: Element, name: string, value: string | null): void {
  if (value === null) element.removeAttribute(name);
  else if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

/** Progress and last activity per open thread, refreshed every minute while the page is visible. */
function useSidebarThreads(): SidebarThreads {
  const rpc = useRpc<typeof rpcContract>();
  const [threads, setThreads] = useState<SidebarThreads>(() => new Map());

  useEffect(() => {
    let cancelled = false;
    let latestRequest = 0;
    const load = () => {
      if (document.hidden) return;
      const request = ++latestRequest;
      rpc.call("sidebarThreads").then(
        (result) => {
          if (cancelled || request !== latestRequest) return;
          setThreads(new Map(result.threads.map(({ id, ...thread }) => [id, thread])));
        },
        // Keep the last rings and ages; the next poll retries.
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

  return threads;
}

/**
 * Tags sidebar and mobile Recent rows with progress, separates Recent
 * metadata, and marks stale/empty sidebar items. Rows can mount after the
 * overlay; native labels and timestamps also change without remounting. React
 * leaves attributes it does not own alone on elements it keeps.
 */
function useRowAttributes(threads: SidebarThreads): void {
  useEffect(() => {
    const tagRows = () => {
      const now = Date.now();
      for (const link of document.querySelectorAll<HTMLElement>("a[data-sidebar-thread-id]")) {
        const row = link.parentElement;
        const thread = threads.get(link.dataset.sidebarThreadId ?? "");
        if (!row) continue;
        setOrRemoveAttribute(row, PROGRESS_ATTRIBUTE, thread ? progressBucket(thread.percent) : null);
        const trailing = row.lastElementChild;
        if (trailing && trailing !== link) {
          setOrRemoveAttribute(trailing, AGE_ATTRIBUTE, thread ? staleAge(thread.lastActiveAt, now) : null);
        }
      }
      tagMobileRecentRows(threads);
      for (const item of document.querySelectorAll("[data-sidebar-sticky-project-item]")) {
        const message = item.querySelector(`:scope > [data-sidebar-sticky-group] > ${LABEL_TIER} + div`)?.textContent?.trim();
        setOrRemoveAttribute(item, EMPTY_ATTRIBUTE, message && EMPTY_MESSAGES.has(message) ? "" : null);
      }
    };

    let frame = 0;
    const observer = new MutationObserver((records) => {
      if (frame) return;
      const touchesThreadLists = records.some(({ target, addedNodes }) => {
        const element = target instanceof Element ? target : target.parentElement;
        return element?.closest(`[data-sidebar-sticky-project-item], [data-sidebar-section-id], ${RECENTS}`) ||
          [...addedNodes].some((node) => node instanceof Element && (node.matches(RECENTS) || node.querySelector(RECENTS)));
      });
      if (touchesThreadLists) frame = requestAnimationFrame(() => {
        frame = 0;
        tagRows();
      });
    });
    tagRows();
    observer.observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["title", "href"] });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      clearMobileRecentAttributes();
      for (const element of document.querySelectorAll(`[${PROGRESS_ATTRIBUTE}], [${AGE_ATTRIBUTE}], [${EMPTY_ATTRIBUTE}]`)) {
        element.removeAttribute(PROGRESS_ATTRIBUTE);
        element.removeAttribute(AGE_ATTRIBUTE);
        element.removeAttribute(EMPTY_ATTRIBUTE);
      }
    };
  }, [threads]);
}

function ThreadRowHints() {
  useRowAttributes(useSidebarThreads());
  return null;
}

export default definePluginApp((app) => {
  app.slots.experimental_appOverlay({ id: "thread-progress-rings", component: ThreadRowHints });
  app.contentScripts.register({
    id: "sidebar-status",
    mount: () => {
      const style = document.createElement("style");
      style.textContent = SIDEBAR_STATUS_CSS + MOBILE_RECENTS_CSS;
      document.head.append(style);
      return () => style.remove();
    },
  });
  app.contentScripts.register({ id: "collapse-motion", mount: startCollapseMotion });
});
