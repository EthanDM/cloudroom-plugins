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

// The longest lease the server allows; the tab keeps working for an hour.
const PREVIEW_LEASE_TTL_MS = 60 * 60 * 1000;

/** A file-preview lease URL for the file. Leases are readable without the
 * app's session (the thread `files/raw` URL is not), so they load in an
 * external browser, and rooting one at the file's folder lets the page's
 * relative CSS, scripts and images load too. */
async function createPreviewUrl(path: string): Promise<string> {
  const slash = path.lastIndexOf("/");
  const response = await fetch("/api/v1/files/previews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rootPath: path.slice(0, slash) || "/", ttlMs: PREVIEW_LEASE_TTL_MS }),
  });
  if (!response.ok) throw new Error(`Preview lease failed: HTTP ${response.status}`);
  const { baseUrl } = (await response.json()) as { baseUrl: string };
  return new URL(`${baseUrl}/${encodeURIComponent(path.slice(slash + 1))}`, location.href).toString();
}

/** Mirrors the app's openUrlInExternalBrowser: the desktop app hands the URL
 * to the OS browser; a browser opens a tab where the user is viewing from.
 * That tab opens before the lease request so Safari doesn't treat it as an
 * unprompted popup. */
function openInBrowser(path: string): void {
  const openExternalUrl = window.bbDesktop?.openExternalUrl;
  const tab = openExternalUrl ? null : window.open("", "_blank");
  if (tab) tab.opener = null;
  createPreviewUrl(path).then(
    (url) => (openExternalUrl ? openExternalUrl(url) : tab?.location.replace(url)),
    (error: unknown) => {
      tab?.close();
      console.error("[file-link-menu]", error);
    },
  );
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
  if (HTML_FILE.test(path)) rows.push({ label: "Open in Browser", run: () => openInBrowser(path) });
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
