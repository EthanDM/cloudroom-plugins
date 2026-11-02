import { definePluginApp } from "@get-bb/plugin-sdk/app";

// Phone-width fixes against Cloudroom v139 markup.
//
// Safe area: on phones a picker opens as a bottom sheet whose content div pads
// itself past the home indicator, but pickers such as Environment pass `p-0`,
// which tailwind-merge lets override that padding. Re-adding it only on `p-0`
// content avoids doubling it on sheets that kept theirs.
const MOBILE_FIXES_CSS = `
[data-persistent-drawer-content] > .p-0:last-child {
  padding-bottom: env(safe-area-inset-bottom) !important;
}
`;

export default definePluginApp((app) => {
  app.contentScripts.register({
    id: "mobile-fixes",
    mount: () => {
      const style = document.createElement("style");
      style.textContent = MOBILE_FIXES_CSS;
      document.head.append(style);
      return () => style.remove();
    },
  });
});
