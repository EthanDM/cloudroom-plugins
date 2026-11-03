import { definePluginApp } from "@get-bb/plugin-sdk/app";

const CONNECT_BUTTON = '[data-testid="plugin-sidebar-footer-item-connect-remote-access"]';
const IDENTITY_ATTRIBUTE = "data-server-identity";
// Separate from IDENTITY_ATTRIBUTE so the dot rule never matches <html>.
const ROOT_IDENTITY_ATTRIBUTE = "data-server-identity-root";
const CSS = `
[${IDENTITY_ATTRIBUTE}]::after {
  content: "";
  position: absolute;
  pointer-events: none;
  top: 0.375rem;
  right: 0.375rem;
  width: 0.3125rem;
  height: 0.3125rem;
  border-radius: 50%;
  background: color-mix(in srgb, var(--foreground) 35%, transparent);
  box-shadow: 0 0 0 1px var(--sidebar, var(--background));
}
[${IDENTITY_ATTRIBUTE}="edm-node"]::after { background: #0090ff; }
[${IDENTITY_ATTRIBUTE}="edm-mbp"]::after { background: #c5f000; }
/* Connect owns the upper-right corner when it has an error to report. */
[${IDENTITY_ATTRIBUTE}]:has([data-footer-alert])::after { top: auto; bottom: 0.125rem; }
/* Disabled keeps the app's grey so an empty prompt still reads as unsendable. */
[${ROOT_IDENTITY_ATTRIBUTE}="edm-node"] [data-promptbox-submit-action]:not(:disabled) {
  background: #0090ff;
  border-color: #0090ff;
  color: #fff;
}
[${ROOT_IDENTITY_ATTRIBUTE}="edm-node"] [data-promptbox-submit-action]:not(:disabled):hover {
  background: #0588f0;
  border-color: #0588f0;
}
/* The voice bar's primary (send, or check without send) is always its last
   button; it stays blue while disabled so transcription doesn't flash green. */
[${ROOT_IDENTITY_ATTRIBUTE}="edm-node"] [data-promptbox-voice-controls] button:last-of-type {
  background: #0090ff;
  border-color: #0090ff;
  color: #fff;
}
[${ROOT_IDENTITY_ATTRIBUTE}="edm-node"] [data-promptbox-voice-controls] button:last-of-type:not(:disabled):hover {
  background: #0588f0;
  border-color: #0588f0;
}
`;

type OriginalAttributes = { title: string | null; description: string | null };

/** Remove our decoration and restore the button's original hover/accessibility text. */
function restoreButton(button: HTMLElement, original: OriginalAttributes): void {
  button.removeAttribute(IDENTITY_ATTRIBUTE);
  const attributes = { title: original.title, "aria-description": original.description };
  for (const [attribute, value] of Object.entries(attributes)) {
    if (value === null) button.removeAttribute(attribute);
    else button.setAttribute(attribute, value);
  }
}

/** Decorate the existing Connect button without adding layout space or changing its action. */
function mountIdentity(): () => void {
  const controller = new AbortController();
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  let name = "Server…";
  // Restore host-owned attributes on disposal; footer buttons may remount or
  // appear later when the user opens the mobile sidebar.
  const buttons = new Map<HTMLElement, OriginalAttributes>();
  const syncButtons = () => {
    for (const [button, original] of buttons) {
      if (!button.isConnected) {
        restoreButton(button, original);
        buttons.delete(button);
      }
    }
    for (const button of document.querySelectorAll<HTMLElement>(CONNECT_BUTTON)) {
      if (!buttons.has(button)) {
        buttons.set(button, {
          title: button.getAttribute("title"),
          description: button.getAttribute("aria-description"),
        });
      }
      if (button.getAttribute(IDENTITY_ATTRIBUTE) !== name) {
        button.setAttribute(IDENTITY_ATTRIBUTE, name);
        button.title = `Cloudroom server: ${name}`;
        button.setAttribute("aria-description", `Cloudroom server: ${name}`);
      }
    }
  };

  const observer = new MutationObserver(syncButtons);
  observer.observe(document.body, { childList: true, subtree: true });
  syncButtons();

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
      document.documentElement.setAttribute(ROOT_IDENTITY_ATTRIBUTE, name);
      syncButtons();
    })
    .catch((error: unknown) => {
      if (controller.signal.aborted) return;
      console.warn("Server Identity: could not read the server name", error);
      name = "Server unknown";
      syncButtons();
    });

  return () => {
    controller.abort();
    observer.disconnect();
    for (const [button, original] of buttons) restoreButton(button, original);
    document.documentElement.removeAttribute(ROOT_IDENTITY_ATTRIBUTE);
    style.remove();
  };
}

export default definePluginApp((app) => {
  app.contentScripts.register({ id: "server-identity", mount: mountIdentity });
});
