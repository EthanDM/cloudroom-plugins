# Reveal in Finder

Adds **Reveal in Finder** as the first row of the right-click menu on file links
in chats (v139), above "Open in". It selects the file in Finder.

- Finder opens on the Cloudroom server's Mac (edm-node), like the app's own
  "Open in Finder". Non-macOS servers return 501.
- Only absolute-path links get the row; they render as `file://` anchors.
- Plugins can't add items to this menu, so the row is a clone of the native
  "Copy file path" row. It is clickable but not reachable with arrow keys.
- Matches the English "Copy file path" label; check after app updates.

The server route `POST /reveal` takes `{ "path": "/abs/file" }`, checks the file
exists, and runs `open -R` without a shell.
