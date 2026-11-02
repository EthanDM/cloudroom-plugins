import { definePluginApp } from "@get-bb/plugin-sdk/app";

// Scales Cloudroom by raising the root font size instead of zooming. Text,
// spacing, and icons are rem-based, so about 90% of the UI grows with it;
// labels Cloudroom sizes in px (some 10–13px badges) stay put. Unlike browser
// zoom it renders identically in the desktop app (Chromium zoom steps 110%,
// and the app resets zoom on every load) and Safari (steps 115%).
//
// CSS `zoom` would scale the px labels too, but on <html> it overflows the
// full-height shell and misplaces popovers, so it's avoided.
//
// Phones keep their own size: Cloudroom already enlarges text for coarse
// pointers below 768px.
const SCALE = "110%";

const UI_SCALE_CSS = `
@media (min-width: 768px), (pointer: fine) {
  html { font-size: ${SCALE}; }
}
`;

export default definePluginApp((app) => {
  app.contentScripts.register({
    id: "ui-scale",
    mount: () => {
      const style = document.createElement("style");
      style.textContent = UI_SCALE_CSS;
      document.head.append(style);
      return () => style.remove();
    },
  });
});
