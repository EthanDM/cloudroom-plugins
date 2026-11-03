import { definePluginApp } from "@get-bb/plugin-sdk/app";

const REVEAL_URL = "/api/v1/plugins/reveal-in-finder/http/reveal";
const REVEAL_ATTRIBUTE = "data-reveal-in-finder";
const ANCHOR_ITEM_LABEL = "Copy file path";
// The context menu opens right after the right-click; older captures are stale.
const SOURCE_MAX_AGE_MS = 2000;

/** Adds a top-level "Reveal in Finder" row to v139's file link context menu.
 *
 * Plugins can't contribute items to that menu, so this clones the native
 * "Copy file path" row for its styling and prepends it. Radix never registers
 * the clone: it is clickable but not reachable with arrow keys. Absolute-path
 * links render as `file://` anchors, which is where the path comes from;
 * relative links get no row.
 */
function mountRevealInFinder(): () => void {
  let source: { path: string; capturedAt: number } | null = null;

  const captureSource = (event: MouseEvent) => {
    const anchor = event.target instanceof Element ? event.target.closest('a[href^="file:///"]') : null;
    source = anchor ? { path: decodeURIComponent(new URL(anchor.getAttribute("href")!).pathname), capturedAt: performance.now() } : null;
  };

  const closeMenu = (menu: Element) => {
    menu.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  };

  const buildRow = (template: Element, menu: Element, path: string) => {
    const row = template.cloneNode(true) as HTMLElement;
    row.setAttribute(REVEAL_ATTRIBUTE, "");
    row.removeAttribute("data-radix-collection-item");
    row.removeAttribute("data-highlighted");
    row.textContent = "Reveal in Finder";
    // Native rows highlight through :focus, which Radix moves on hover.
    row.addEventListener("pointermove", () => row.focus());
    row.addEventListener("click", () => {
      void fetch(REVEAL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
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
      if (!menu || menu.getAttribute("data-state") === "closed" || menu.querySelector(`[${REVEAL_ATTRIBUTE}]`)) continue;
      const separator = menu.querySelector('[role="separator"]')?.cloneNode(true) as Element | undefined;
      separator?.setAttribute(REVEAL_ATTRIBUTE, "");
      menu.prepend(...[buildRow(template, menu, path), separator].filter((node): node is Element => !!node));
      source = null;
    }
  };

  const observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener("contextmenu", captureSource, true);
  return () => {
    observer.disconnect();
    document.removeEventListener("contextmenu", captureSource, true);
    for (const row of Array.from(document.querySelectorAll(`[${REVEAL_ATTRIBUTE}]`))) row.remove();
  };
}

export default definePluginApp((app) => {
  app.contentScripts.register({ id: "reveal-in-finder", mount: mountRevealInFinder });
});
