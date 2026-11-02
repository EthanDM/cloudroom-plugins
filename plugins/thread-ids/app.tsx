import { definePluginApp, experimental_copyToClipboard } from "@get-bb/plugin-sdk/app";
import type { PluginCommandContext } from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import { mountSidebarCopyId } from "./sidebar-copy-id";

interface CopyCommand {
  id: string;
  title: string;
  text: (threadId: string) => string;
}

// The projectless /threads/<id> route resolves on any device signed in to the
// same server, so links built from the current origin work from phone and Mac.
const COPY_COMMANDS: CopyCommand[] = [
  { id: "copy-thread-id", title: "Thread IDs: copy thread ID", text: (threadId) => threadId },
  { id: "copy-thread-mention", title: "Thread IDs: copy @thread mention", text: (threadId) => `@thread:${threadId}` },
  { id: "copy-thread-link", title: "Thread IDs: copy thread link", text: (threadId) => `${window.location.origin}/threads/${threadId}` },
];

async function copyFromThread(command: CopyCommand, { threadId }: PluginCommandContext): Promise<void> {
  if (!threadId) return;
  await copyText(command.text(threadId));
}

async function copyText(text: string): Promise<void> {
  if (await experimental_copyToClipboard({ text })) toast.success(`Copied ${text}`);
  else toast.error("Couldn't copy to the clipboard");
}

export default definePluginApp((app) => {
  app.contentScripts.register({ id: "sidebar-copy-thread-id", mount: () => mountSidebarCopyId(copyText) });
  for (const command of COPY_COMMANDS) {
    app.commands.register({
      id: command.id,
      title: command.title,
      isAvailable: ({ threadId }) => threadId !== null,
      run: (context) => copyFromThread(command, context),
    });
  }
});
