import { GLYPH_CSS, PROGRESS_ATTRIBUTE, RING_ARC, RING_MASK, RING_TRACK, STATES, progressBucket } from "./thread-status";

// v139's native links retain navigation, indentation, child controls and their
// status labels. Only styling and plugin-owned attributes change; React keeps
// ownership of every text node, including the periodically refreshed timestamp.
export const RECENTS = "[data-root-compose-mobile-recents]";
const LINK = `${RECENTS} > ul > li > a`;
const BODY = `${LINK} > span:nth-child(2)`;
const TITLE = `${BODY} > span:first-child > span`;
const METADATA = `${BODY} > span[title]`;
const STATUS = `${LINK} > span:nth-child(3)`;
const CONTEXT_ATTRIBUTE = "data-recent-thread-context";
const TIME_ATTRIBUTE = "data-recent-thread-time";
const stateLink = (label: string) => `${LINK}:has(> span:nth-child(3) [aria-label="${label}"])`;
const IDLE = `${LINK}:not(:has(> span:nth-child(3)))`;

export const MOBILE_RECENTS_CSS = `
@media (max-width: 767px) {
  ${LINK} {
    display: grid;
    grid-template-columns: 0.875rem minmax(0, 1fr);
    column-gap: 0.625rem;
    align-content: center;
    align-items: start;
  }
  ${LINK} > span:first-child { display: none; }
  ${BODY} { grid-column: 2; grid-row: 1; min-width: 0; }
  ${TITLE} {
    font-size: 1rem;
    line-height: 1.3125rem;
    font-weight: 400;
  }
  ${RECENTS} li:not(.bg-surface-selected) > a:not(:has(> span:nth-child(3))):not(:focus-visible) > span:nth-child(2) > span:first-child > span {
    color: color-mix(in oklab, var(--foreground) 62%, transparent);
  }
  ${LINK}:has([aria-label^="Unread thread"]) > span:nth-child(2) > span:first-child > span {
    font-weight: 600;
    color: var(--foreground);
  }
  ${METADATA} {
    margin-top: 0.3125rem;
    font-size: 0.75rem;
    line-height: 1rem;
  }
  ${METADATA}[${CONTEXT_ATTRIBUTE}] { gap: 0.75rem; }
  ${METADATA}[${CONTEXT_ATTRIBUTE}] > * { display: none; }
  ${METADATA}[${CONTEXT_ATTRIBUTE}]::before {
    content: attr(${CONTEXT_ATTRIBUTE});
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  ${METADATA}[${TIME_ATTRIBUTE}]::after {
    content: attr(${TIME_ATTRIBUTE});
    flex: none;
    font-size: 0.6875rem;
    font-variant-numeric: tabular-nums;
  }
  ${STATUS} {
    grid-column: 1;
    grid-row: 1;
    width: 0.875rem;
    height: 1.3125rem;
  }
  ${STATUS} [data-icon] { width: 0.875rem; height: 0.875rem; }
  ${IDLE}::before,
  ${STATES.map(({ label }) => `${stateLink(label)}::before`).join(",\n  ")} {
    content: "";
    grid-column: 1;
    grid-row: 1;
    align-self: start;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 0.875rem;
    height: 0.875rem;
    margin-top: 0.21875rem;
  }
  ${STATES.map(({ label, glyph }) => `${stateLink(label)}::before { ${GLYPH_CSS[glyph]} }`).join("\n  ")}
  ${stateLink("Thread working")}::before { margin-top: 0.3125rem; }
  ${stateLink("Unread thread succeeded")}::before { margin-top: 0.46875rem; }
  ${STATES.map(({ label }) => `${stateLink(label)} > span:nth-child(3)`).join(",\n  ")} { visibility: hidden; }
  ${IDLE}::before {
    width: 0.625rem;
    height: 0.625rem;
    margin: 0.34375rem 0.125rem 0;
    border-radius: 50%;
    background: conic-gradient(${RING_ARC} var(--sidebar-status-progress, 0%), ${RING_TRACK} 0);
    -webkit-mask: ${RING_MASK};
    mask: ${RING_MASK};
  }
  ${[10, 20, 30, 40, 50, 60, 70, 80, 90].map((percent) =>
    `${RECENTS} li[${PROGRESS_ATTRIBUTE}="${percent}"] { --sidebar-status-progress: ${percent}%; }`,
  ).join("\n  ")}
  ${RECENTS} li[${PROGRESS_ATTRIBUTE}="100"] > a:not(:has(> span:nth-child(3)))::before {
    content: "\\2713";
    width: 0.875rem;
    height: 0.875rem;
    margin: 0.21875rem 0 0;
    background: none;
    -webkit-mask: none;
    mask: none;
    border-radius: 0;
    color: ${RING_ARC};
    font: 700 0.5625rem/1 system-ui, sans-serif;
  }
  /* An idle Cloud thread keeps its location cue, just as in the sidebar. */
  ${IDLE}:has(> span:nth-child(2) > span[title] > [data-icon="Cloud"])::before {
    width: 0.875rem;
    height: 0.875rem;
    margin: 0.21875rem 0 0;
    content: "";
    background: ${RING_ARC};
    -webkit-mask: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 16a4 4 0 0 0-1-7.9A7 7 0 1 0 5 17h14" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>') center / contain no-repeat;
    mask: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 16a4 4 0 0 0-1-7.9A7 7 0 1 0 5 17h14" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>') center / contain no-repeat;
  }
}
@media (max-width: 767px) and (prefers-reduced-motion: reduce) {
  ${stateLink("Thread working")}::before { animation: none; }
}
`;

/** Split v139's project · workspace · time label without editing native text. */
export function tagMobileRecentRows(threads: ReadonlyMap<string, { percent: number | null }>): void {
  for (const link of document.querySelectorAll<HTMLAnchorElement>(LINK)) {
    const id = new URL(link.href).pathname.split("/").at(-1) ?? "";
    const row = link.parentElement;
    const thread = threads.get(id);
    if (row) {
      const bucket = progressBucket(thread?.percent ?? null);
      if (row.getAttribute(PROGRESS_ATTRIBUTE) !== bucket) row.setAttribute(PROGRESS_ATTRIBUTE, bucket);
    }
    const metadata = link.querySelector<HTMLElement>(":scope > span:nth-child(2) > span[title]");
    if (!metadata) continue;
    const parts = metadata.title.split(" · ");
    const time = parts.pop() ?? "";
    // Only the unambiguous three-part form drops the usual main workspace.
    if (parts.length === 2 && parts[1] === "main") parts.pop();
    metadata.setAttribute(CONTEXT_ATTRIBUTE, parts.join(" · "));
    metadata.setAttribute(TIME_ATTRIBUTE, time);
  }
}

export function clearMobileRecentAttributes(): void {
  for (const metadata of document.querySelectorAll(`${RECENTS} [${CONTEXT_ATTRIBUTE}]`)) {
    metadata.removeAttribute(CONTEXT_ATTRIBUTE);
    metadata.removeAttribute(TIME_ATTRIBUTE);
  }
}
