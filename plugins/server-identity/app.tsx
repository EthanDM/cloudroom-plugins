import { definePluginApp } from "@get-bb/plugin-sdk/app";

const HEADER = '[data-testid="app-sidebar-top-reserve-row"]';
const LABEL_ATTRIBUTE = "data-server-identity";
const CSS = `
[${LABEL_ATTRIBUTE}] {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
  min-width: 0;
  height: 1.25rem;
  margin: 0 0.875rem 0.125rem;
  color: color-mix(in srgb, var(--foreground) 70%, transparent);
  font-size: 0.6875rem;
  font-weight: 500;
  line-height: 1;
  user-select: none;
}
[${LABEL_ATTRIBUTE}]::before {
  content: "";
  flex-shrink: 0;
  width: 0.3125rem;
  height: 0.3125rem;
  border-radius: 50%;
  background: color-mix(in srgb, var(--foreground) 35%, transparent);
}
[${LABEL_ATTRIBUTE}="edm-node"]::before { background: #40afff; }
[${LABEL_ATTRIBUTE}="edm-mbp"]::before { background: #c5f000; }
[${LABEL_ATTRIBUTE}] > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
`;

/** Mount one server label below each sidebar's window controls, including
 *  sidebars remounted on navigation or opened later in the mobile drawer. */
function mountIdentity(): () => void {
  const controller = new AbortController();
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  let name = "Server…";
  // Each label belongs to a particular header; discard it when React removes
  // that header. Staying below the chrome also clears macOS's control capsule.
  const labels = new Map<Element, HTMLElement>();
  const syncLabels = () => {
    for (const [header, label] of labels) {
      if (!header.isConnected) {
        label.remove();
        labels.delete(header);
      }
    }
    for (const header of document.querySelectorAll(HEADER)) {
      let label = labels.get(header);
      if (!label) {
        label = document.createElement("div");
        label.setAttribute("role", "note");
        label.append(document.createElement("span"));
        labels.set(header, label);
      }
      if (label.getAttribute(LABEL_ATTRIBUTE) !== name) {
        label.setAttribute(LABEL_ATTRIBUTE, name);
        label.setAttribute("aria-label", `Cloudroom server: ${name}`);
        label.title = `Cloudroom server: ${name}`;
        label.firstElementChild!.textContent = name;
      }
      if (header.nextElementSibling !== label) header.after(label);
    }
  };

  const observer = new MutationObserver(syncLabels);
  observer.observe(document.body, { childList: true, subtree: true });
  syncLabels();

  void fetch("/api/v1/plugins/server-identity/http/identity", { signal: controller.signal })
    .then(async (response) => {
      if (!response.ok) throw new Error(`Identity request failed: HTTP ${response.status}`);
      const identity: unknown = await response.json();
      if (!identity || typeof identity !== "object" || !("name" in identity)
        || typeof identity.name !== "string" || !identity.name.trim()) {
        throw new Error("Invalid server identity");
      }
      if (controller.signal.aborted) return;
      name = identity.name;
      syncLabels();
    })
    .catch((error: unknown) => {
      if (controller.signal.aborted) return;
      console.warn("Server Identity: could not read the server name", error);
      name = "Server unknown";
      syncLabels();
    });

  return () => {
    controller.abort();
    observer.disconnect();
    for (const label of labels.values()) label.remove();
    style.remove();
  };
}

export default definePluginApp((app) => {
  app.contentScripts.register({ id: "server-identity", mount: mountIdentity });
});
