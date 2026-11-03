import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { isAbsolute } from "node:path";
import type { BbPluginApi } from "@get-bb/plugin-sdk";

// Runs on the Cloudroom server, so Finder opens on that Mac's screen, the same
// place the app's own "Open in Finder" opens.
export default function plugin(bb: BbPluginApi): void {
  bb.http.route("POST", "/reveal", async (context) => {
    if (process.platform !== "darwin") return context.json({ error: "Finder needs macOS" }, 501);
    const body: unknown = await context.req.json().catch(() => null);
    const path = body && typeof body === "object" && "path" in body ? body.path : null;
    if (typeof path !== "string" || !isAbsolute(path) || path.includes("\0")) {
      return context.json({ error: "Expected an absolute path" }, 400);
    }
    if (!existsSync(path)) return context.json({ error: "File not found" }, 404);
    await new Promise<void>((resolve, reject) => {
      execFile("open", ["-R", path], (error) => (error ? reject(error) : resolve()));
    });
    return context.json({ ok: true });
  });
}
