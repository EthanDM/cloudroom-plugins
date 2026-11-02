import { definePluginApp } from "@get-bb/plugin-sdk/app";

// Hooks come from Cloudroom v139 markup: the unread indicator's aria-label
// ("Unread thread succeeded" / "Unread thread failed") and the row's
// .bb-thread-title. A thread row's container directly holds its
// a[data-sidebar-thread-id] link, and child threads render in separate
// containers, so :has() never bolds a parent for a child's unread state.
// Collapsed parent threads roll their children's state into the same
// indicator, so they get emphasized too. Section headers have no
// .bb-thread-title, so only their success dot grows.
const UNREAD_EMPHASIS_CSS = `
[aria-label="Unread thread succeeded"] {
  width: 8px !important;
  height: 8px !important;
  background-color: var(--color-primary) !important;
}
:has(> a[data-sidebar-thread-id]):has([aria-label^="Unread thread"]) .bb-thread-title {
  font-weight: 600;
  color: var(--color-foreground);
}
`;

export default definePluginApp((app) => {
  app.contentScripts.register({
    id: "unread-emphasis",
    mount: () => {
      const style = document.createElement("style");
      style.textContent = UNREAD_EMPHASIS_CSS;
      document.head.append(style);
      return () => style.remove();
    },
  });
});
