import { definePluginApp } from "@get-bb/plugin-sdk/app";
import { mountRightPanelSwipe } from "./right-panel-swipe";

// Phone-width fixes against Cloudroom v139 markup.
//
// Safe area: on phones a picker opens as a bottom sheet whose content div pads
// itself past the home indicator, but pickers such as Environment pass `p-0`,
// which tailwind-merge lets override that padding. Re-adding it only on `p-0`
// content avoids doubling it on sheets that kept theirs.
//
// New-thread home: the recents scroller's top is set inline from JS so it shows
// only ~5.5 rows above the composer, leaving the top of the screen empty.
// Pinning it under the header and growing the offset spacer instead keeps a
// short list resting on the composer while a long one fills the screen.
//
// Home footer: it only holds the Claude connect button, which renders null once
// connected, yet the row keeps its own safe-area padding on top of the app
// shell's. Drop it when empty; otherwise pad only for spacing.
//
// Floating Side chat button: on phones it floats over the timeline and its
// panel action never opens the compact drawer (v139), so each tap creates a
// hidden side chat. The per-message Side chat action still works there.
const COMPACT_HOME = '[data-testid="root-compose-compact-home"]';
const COMPACT_HOME_SCROLLER = '[data-testid="root-compose-compact-scroll-viewport"]';
const COMPACT_HOME_FOOTER = `div:has(> ${COMPACT_HOME}) + div`;
const MOBILE_FIXES_CSS = `
[data-persistent-drawer-content] > .p-0:last-child {
  padding-bottom: env(safe-area-inset-bottom) !important;
}
${COMPACT_HOME_SCROLLER} {
  top: 56px !important;
  display: flex;
  flex-direction: column;
}
${COMPACT_HOME_SCROLLER} > * { flex-shrink: 0; }
${COMPACT_HOME_SCROLLER} > [data-testid="root-compose-compact-recents-offset"] {
  flex: 1 0 0px;
  height: auto !important;
}
${COMPACT_HOME_FOOTER}:empty { display: none; }
${COMPACT_HOME_FOOTER} { padding-bottom: 0.5rem !important; }
@media (max-width: 767px) {
  [data-thread-header-pane-actions] button[aria-label="Side chat"] { display: none !important; }
}
`;

export default definePluginApp((app) => {
  app.contentScripts.register({
    id: "mobile-fixes",
    mount: () => {
      const style = document.createElement("style");
      style.textContent = MOBILE_FIXES_CSS;
      document.head.append(style);
      const unmountSwipe = mountRightPanelSwipe();
      return () => {
        unmountSwipe();
        style.remove();
      };
    },
  });
});
