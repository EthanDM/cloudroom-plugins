import { definePluginApp } from "@get-bb/plugin-sdk/app";

// Thread header extras in v139. Report a bug has no stable label (it is
// labeled only when icon-only), so it is matched by its Bug icon. Share is
// hidden only while unshared: once shared, the button reads "Shared" and is
// the only way to manage or stop the link.
const HIDE_HEADER_ACTIONS_CSS = `
[data-thread-header-workflow-actions] > button:has(> [data-icon="Bug"]),
[data-thread-header-workflow-actions] button[aria-label="Share thread"] {
  display: none !important;
}
`;

export default definePluginApp((app) => {
  app.contentScripts.register({
    id: "hide-header-actions",
    mount: () => {
      const style = document.createElement("style");
      style.textContent = HIDE_HEADER_ACTIONS_CSS;
      document.head.append(style);
      return () => style.remove();
    },
  });
});
