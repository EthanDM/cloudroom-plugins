import { definePluginApp } from "@get-bb/plugin-sdk/app";

const REVEAL_URL = "/api/v1/plugins/file-link-menu/http/reveal";
const ROW_ATTRIBUTE = "data-file-link-menu";
const ANCHOR_ITEM_LABEL = "Copy file path";
// The context menu opens right after the right-click; older captures are stale.
const SOURCE_MAX_AGE_MS = 2000;
const HTML_FILE = /\.html?$/i;

declare global {
  interface Window {
    bbDesktop?: { openExternalUrl?: (url: string) => void } | null;
  }
}

type Row = { label: string; run: () => void };

/** The same URL the HTML preview's "Open in external browser" button opens.
 * The thread comes from the route, so a split view uses the focused thread. */
function htmlPreviewUrl(path: string): string | null {
  const threadId = location.pathname.match(/\/threads\/(thr_[\w-]+)/)?.[1];
  if (!threadId) return null;
  return new URL(`/api/v1/threads/${threadId}/files/raw?path=${encodeURIComponent(path)}`, location.href).toString();
}

/** Mirrors the app's openUrlInExternalBrowser: the desktop app hands the URL
 * to the OS; a browser opens a tab where the user is viewing from. */
function openExternally(url: string): void {
  if (window.bbDesktop?.openExternalUrl) window.bbDesktop.openExternalUrl(url);
  else window.open(url, "_blank", "noopener,noreferrer");
}

function rowsFor(path: string): Row[] {
  const rows: Row[] = [{
    label: "Reveal in Finder",
    run: () => void fetch(REVEAL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    }),
  }];
  const browserUrl = HTML_FILE.test(path) ? htmlPreviewUrl(path) : null;
  if (browserUrl) rows.push({ label: "Open in Browser", run: () => openExternally(browserUrl) });
  return rows;
}

/** Adds top-level rows to v139's file link context menu.
 *
 * Plugins can't contribute items to that menu, so each row is a clone of the
 * native "Copy file path" row, prepended above "Open in". Radix never registers
 * the clones: they are clickable but not reachable with arrow keys.
 * Absolute-path links render as `file://` anchors, which is where the path
 * comes from; relative links get no rows.
 */
function mountFileLinkMenu(): () => void {
  let source: { path: string; capturedAt: number } | null = null;

  const captureSource = (event: MouseEvent) => {
    const anchor = event.target instanceof Element ? event.target.closest('a[href^="file:///"]') : null;
    source = anchor ? { path: decodeURIComponent(new URL(anchor.getAttribute("href")!).pathname), capturedAt: performance.now() } : null;
  };

  const closeMenu = (menu: Element) => {
    menu.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  };

  const buildRow = (template: Element, menu: Element, { label, run }: Row) => {
    const row = template.cloneNode(true) as HTMLElement;
    row.setAttribute(ROW_ATTRIBUTE, "");
    row.removeAttribute("data-radix-collection-item");
    row.removeAttribute("data-highlighted");
    row.textContent = label;
    // Native rows highlight through :focus, which Radix moves on hover.
    row.addEventListener("pointermove", () => row.focus());
    row.addEventListener("click", () => {
      run();
      closeMenu(menu);
    });
    return row;
  };

  const sync = () => {
    if (!source || performance.now() - source.capturedAt > SOURCE_MAX_AGE_MS) return;
    const { path } = source;
    for (const template of Array.from(document.querySelectorAll('[role="menuitem"]'))) {
      if (template.textContent?.trim() !== ANCHOR_ITEM_LABEL) continue;
      const menu = template.closest('[role="menu"]');
      if (!menu || menu.getAttribute("data-state") === "closed" || menu.querySelector(`[${ROW_ATTRIBUTE}]`)) continue;
      const separator = menu.querySelector('[role="separator"]')?.cloneNode(true) as Element | undefined;
      separator?.setAttribute(ROW_ATTRIBUTE, "");
      const rows = rowsFor(path).map((row) => buildRow(template, menu, row));
      menu.prepend(...rows, ...(separator ? [separator] : []));
      source = null;
    }
  };

  const observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener("contextmenu", captureSource, true);
  return () => {
    observer.disconnect();
    document.removeEventListener("contextmenu", captureSource, true);
    for (const row of Array.from(document.querySelectorAll(`[${ROW_ATTRIBUTE}]`))) row.remove();
  };
}

export default definePluginApp((app) => {
  app.contentScripts.register({ id: "file-link-menu", mount: mountFileLinkMenu });
});
