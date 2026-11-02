import { definePluginApp } from "@get-bb/plugin-sdk/app";

// Targets v139's promotional UI only. Queue, usage-limit, disk, and billing
// controls remain visible. Markup changes should make promos reappear.
const HIDE_CLOUD_PROMOS_CSS = `
section[aria-label="Free plan"],
section[aria-label="A note from David"],
section[aria-label="Move to Cloud"] {
  display: none !important;
}

/* FreePlanTip rotates its copy; its wrapper and direct icons identify all
   four messages without hiding UpgradeTip in retention settings. */
p[aria-live="polite"].mt-3.px-3\\.5:has(> [data-icon="Zap"]):has(> button > [data-icon="ArrowRight"]) {
  display: none !important;
}

/* TryCloudHint has no unique label. Match the anchored popup plus its direct
   Cloud action and dismiss control, including hardware/network variants. */
div[role="status"].absolute.top-full:has(> button > [data-icon="Cloud"]):has(> div > button[aria-label="Dismiss"]) {
  display: none !important;
}

/* The running-thread network pitch uses a pill instead of Move to Cloud's
   labeled card. Other connection notices lack this combination. */
div[role="status"].rounded-full:has(> [data-icon="WifiOff"]):has(> button[aria-label="Dismiss"]) {
  display: none !important;
}
`;

export default definePluginApp((app) => {
  app.contentScripts.register({
    id: "hide-plan-card",
    mount: () => {
      const style = document.createElement("style");
      style.textContent = HIDE_CLOUD_PROMOS_CSS;
      document.head.append(style);
      return () => style.remove();
    },
  });
});
