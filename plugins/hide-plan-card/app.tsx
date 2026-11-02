import { definePluginApp } from "@get-bb/plugin-sdk/app";

// Matches the Cloud queue's Free plan card by its accessible label. If Cloudroom
// renames that label, the card reappears and this selector needs updating.
const HIDE_PLAN_CARD_CSS = 'section[aria-label="Free plan"] { display: none !important; }';

export default definePluginApp((app) => {
  app.contentScripts.register({
    id: "hide-plan-card",
    mount: () => {
      const style = document.createElement("style");
      style.textContent = HIDE_PLAN_CARD_CSS;
      document.head.append(style);
      return () => style.remove();
    },
  });
});
