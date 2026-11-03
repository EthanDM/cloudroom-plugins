import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { isAbsolute } from "node:path";
import type { Context } from "hono";
import type { BbPluginApi } from "@get-bb/plugin-sdk";

// Asks AppKit for the http(s) handler: `open` alone would use the .html file
// association, which may be an editor rather than a browser.
const DEFAULT_BROWSER_SCRIPT = 'ObjC.import("AppKit"); $.NSWorkspace.sharedWorkspace.URLForApplicationToOpenURL($.NSURL.URLWithString("https://example.com")).path.js';

function run(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, args, (error, stdout) => (error ? reject(error) : resolve(stdout.trim())));
  });
}

/** Validates the request body's file path, or returns the error response. */
async function readFilePath(context: Context): Promise<string | Response> {
  if (process.platform !== "darwin") return context.json({ error: "Needs macOS" }, 501);
  const body: unknown = await context.req.json().catch(() => null);
  const path = body && typeof body === "object" && "path" in body ? body.path : null;
  if (typeof path !== "string" || !isAbsolute(path) || path.includes("\0")) {
    return context.json({ error: "Expected an absolute path" }, 400);
  }
  if (!existsSync(path)) return context.json({ error: "File not found" }, 404);
  return path;
}

// Runs on the Cloudroom server, so Finder and the browser open on that Mac's
// screen, the same place the app's own "Open in" actions open.
export default function plugin(bb: BbPluginApi): void {
  bb.http.route("POST", "/reveal", async (context) => {
    const path = await readFilePath(context);
    if (typeof path !== "string") return path;
    await run("open", ["-R", path]);
    return context.json({ ok: true });
  });

  bb.http.route("POST", "/open-in-browser", async (context) => {
    const path = await readFilePath(context);
    if (typeof path !== "string") return path;
    const browser = await run("osascript", ["-l", "JavaScript", "-e", DEFAULT_BROWSER_SCRIPT]);
    await run("open", ["-a", browser, path]);
    return context.json({ ok: true });
  });
}
