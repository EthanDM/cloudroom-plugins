import { hostname } from "node:os";
import type { BbPluginApi } from "@get-bb/plugin-sdk";

// Resolve on the server: the browser may be viewing it from another machine.
export default function plugin(bb: BbPluginApi): void {
  bb.http.route("GET", "/identity", (context) => {
    const name = hostname().split(".")[0].toLowerCase();
    return context.json({ name });
  });
}
