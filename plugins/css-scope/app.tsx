import { definePluginApp } from "@get-bb/plugin-sdk/app";
import { mountCssScope } from "./scope-stylesheets";

export default definePluginApp(app => {
  app.contentScripts.register({
    id: "scope-built-in-css",
    mount: ({ signal }) => mountCssScope(signal),
  });
});
