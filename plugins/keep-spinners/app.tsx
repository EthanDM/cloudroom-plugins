import { definePluginApp } from "@get-bb/plugin-sdk/app";

// Cloudroom pauses looping animations while the desktop window is unfocused by
// setting this attribute on <html>; only its CSS reads it. Removing it as soon
// as it appears keeps spinners moving on a second monitor. If Cloudroom renames
// the attribute, this plugin silently stops working.
const BLURRED_ATTRIBUTE = "data-window-blurred";

export default definePluginApp((app) => {
  app.contentScripts.register({
    id: "keep-spinners",
    mount: () => {
      const root = document.documentElement;
      const clear = () => root.removeAttribute(BLURRED_ATTRIBUTE);
      const observer = new MutationObserver(clear);
      observer.observe(root, { attributes: true, attributeFilter: [BLURRED_ATTRIBUTE] });
      clear();
      return () => observer.disconnect();
    },
  });
});
