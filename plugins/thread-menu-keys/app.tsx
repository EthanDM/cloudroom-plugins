import { definePluginApp } from "@get-bb/plugin-sdk/app";
import { mountThreadMenuKeys } from "./menu-keys";

export default definePluginApp((app) => {
  app.contentScripts.register({ id: "thread-menu-keys", mount: mountThreadMenuKeys });
});
