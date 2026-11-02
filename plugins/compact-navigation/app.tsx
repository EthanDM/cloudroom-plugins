import { definePluginApp } from "@get-bb/plugin-sdk/app";
import type { ComponentType, SyntheticEvent } from "react";

// v139's runtime SDK 0.6.50 has this slot, but npm publishes 0.6.49 without
// its types. This is the subset used here, verified against app-contract.ts.
// engines.bbPluginSdk keeps older runtimes from installing the plugin.
type NativeNavigationProps = { experimental_Original: ComponentType };
type NavigationSlots = {
  experimental_sidebarNavigation(registration: {
    id: string;
    title: string;
    description: string;
    component: ComponentType<NativeNavigationProps>;
  }): void;
};

const SCOPE = ".compact-sidebar-navigation";
const TOOLBAR = `${SCOPE} [data-testid="plugin-nav-sidebar-items"]:not([data-sidebar-navigation-customize-mode])`;
const BUTTONS = `${TOOLBAR} [data-sidebar-navigation-item] > button, ${TOOLBAR} [data-testid="sidebar-navigation-more-trigger"]`;
const LABEL = "data-compact-navigation-label";
const TOOLTIP = "data-compact-navigation-tooltip";
const CSS = `
${SCOPE} { display: contents; }
${TOOLBAR} {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
}
${TOOLBAR} > [data-sidebar-navigation-item],
${TOOLBAR} > [data-testid="sidebar-navigation-more-row"] {
  flex: 0 0 auto;
  width: 2.25rem;
  margin: 0 !important;
}
${TOOLBAR} [data-sidebar-navigation-item] > button,
${TOOLBAR} [data-testid="sidebar-navigation-more-trigger"] {
  position: relative;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0 !important;
  gap: 0;
  overflow: visible;
}
/* Keep label text in the accessibility tree while displaying just the icon. */
${TOOLBAR} [data-sidebar-navigation-item] > button > :not([data-icon-root]):not([data-compact-navigation-tooltip]),
${TOOLBAR} [data-testid="sidebar-navigation-more-trigger"] > :not([data-icon-root]):not([data-compact-navigation-tooltip]) {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
/* Per-panel hover controls do not fit an icon button; its context menu remains. */
${TOOLBAR} [data-sidebar-navigation-item] > :not(button) { display: none; }
${TOOLBAR} [data-sidebar-navigation-item="__bb__/new-thread"] > button {
  background: color-mix(in srgb, var(--foreground) 6%, transparent);
}
${TOOLBAR} button[${LABEL}] > [${TOOLTIP}] {
  display: none;
  position: absolute;
  z-index: 80;
  bottom: calc(100% + 0.375rem);
  left: 0;
  width: max-content;
  max-width: 14rem;
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  background: var(--popover, var(--background));
  color: var(--foreground);
  font-size: 0.6875rem;
  font-weight: 400;
  line-height: 1.4;
  white-space: normal;
  pointer-events: none;
}
${TOOLBAR} button[${LABEL}]:is(:hover, :focus-visible) > [${TOOLTIP}] { display: block; }
${TOOLBAR} [data-testid="sidebar-navigation-more-trigger"] > [${TOOLTIP}] { left: auto; right: 0; }
@media (pointer: coarse) {
  ${TOOLBAR} { gap: 0.125rem; }
  ${TOOLBAR} > [data-sidebar-navigation-item],
  ${TOOLBAR} > [data-testid="sidebar-navigation-more-row"] { width: 2.5rem; }
  ${TOOLBAR} [data-sidebar-navigation-item] > button,
  ${TOOLBAR} [data-testid="sidebar-navigation-more-trigger"] { width: 2.5rem; height: 2.5rem; }
  ${TOOLBAR} button[${LABEL}]:hover:not(:focus-visible) > [${TOOLTIP}] { display: none; }
}
`;

/** Reordering belongs in the native Customize sidebar editor, whose vertical
 *  sorting geometry remains intact. Click, context menu, and modifier-click
 *  activation still belong to the native buttons. Pointer-down is deliberately
 *  untouched: it starts Radix touch/pen context menus and native split drags. */
function preventToolbarDrag(event: SyntheticEvent<HTMLDivElement>): void {
  if (!(event.target instanceof Element) || !event.currentTarget.contains(event.target)) return;
  const toolbar = event.target.closest('[data-testid="plugin-nav-sidebar-items"]');
  if (toolbar && !toolbar.hasAttribute("data-sidebar-navigation-customize-mode")
    && event.target.closest("[data-sidebar-navigation-item]")) event.stopPropagation();
}

function CompactNavigation({ experimental_Original: Original }: NativeNavigationProps) {
  return (
    <div
      className="compact-sidebar-navigation"
      onMouseDownCapture={(event) => { if (event.button === 0) preventToolbarDrag(event); }}
      onTouchStartCapture={preventToolbarDrag}
      onKeyDownCapture={(event) => { if (event.key === " ") preventToolbarDrag(event); }}
    >
      <Original />
    </div>
  );
}

/** Add tooltip copy to native buttons, including buttons remounted by routing
 *  or customization. No native labels or event handlers are replaced. */
function mountTooltips(): () => void {
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);
  const decorations = new Map<Element, { original: string | null; tooltip: HTMLElement }>();
  const restore = (button: Element, decoration: { original: string | null; tooltip: HTMLElement }) => {
    if (decoration.original === null) button.removeAttribute(LABEL);
    else button.setAttribute(LABEL, decoration.original);
    decoration.tooltip.remove();
  };
  const sync = () => {
    for (const [button, decoration] of decorations) {
      if (button.isConnected) continue;
      restore(button, decoration);
      decorations.delete(button);
    }
    for (const button of document.querySelectorAll(BUTTONS)) {
      let decoration = decorations.get(button);
      if (!decoration) {
        const tooltip = document.createElement("span");
        tooltip.setAttribute(TOOLTIP, "");
        // The native label already names the action; this visual copy must
        // not duplicate that name in the accessibility tree.
        tooltip.setAttribute("aria-hidden", "true");
        decoration = { original: button.getAttribute(LABEL), tooltip };
        decorations.set(button, decoration);
      }
      const { tooltip } = decoration;
      const nativeText = Array.from(button.childNodes).filter((node) => node !== tooltip)
        .map((node) => node.textContent).join(" ").replace(/\s+/g, " ").trim();
      const label = button.getAttribute("aria-label") || nativeText;
      if (label && button.getAttribute(LABEL) !== label) button.setAttribute(LABEL, label);
      if (tooltip.textContent !== label) tooltip.textContent = label;
      if (tooltip.parentElement !== button) button.append(tooltip);
    }
  };
  const observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, characterData: true, subtree: true });
  sync();
  return () => {
    observer.disconnect();
    for (const [button, decoration] of decorations) restore(button, decoration);
    style.remove();
  };
}

export default definePluginApp((app) => {
  app.contentScripts.register({ id: "compact-navigation", mount: mountTooltips });
  (app.slots as typeof app.slots & NavigationSlots).experimental_sidebarNavigation({
    id: "compact-navigation",
    title: "Compact icon bar",
    description: "Native sidebar actions in one icon row, with hover and keyboard-focus labels.",
    component: CompactNavigation,
  });
});
