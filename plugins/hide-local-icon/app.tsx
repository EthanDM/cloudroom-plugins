import { definePluginApp } from "@get-bb/plugin-sdk/app";

// Matches the Local/Cloud icon by its v139 aria-label, scoped to sidebar rows
// (a row's container directly holds its a[data-sidebar-thread-id] link) so the
// thread palette keeps its icons. Cloud and teleport icons stay visible. If
// Cloudroom renames the label, the laptop icon reappears.
const HIDE_LOCAL_ICON_CSS = ':has(> a[data-sidebar-thread-id]) [aria-label="Local thread"] { display: none !important; }';

export default definePluginApp((app) => {
  app.contentScripts.register({
    id: "hide-local-icon",
    mount: () => {
      const style = document.createElement("style");
      style.textContent = HIDE_LOCAL_ICON_CSS;
      document.head.append(style);
      return () => style.remove();
    },
  });
});
