# File Link Menu

Adds top-level rows to the right-click menu on file links in chats (v139),
above "Open in":

- **Reveal in Finder** selects the file in Finder on the Cloudroom server's Mac
  (edm-node), like the app's own "Open in Finder". Non-macOS servers return 501.
- **Open in Browser**, for `.html`/`.htm` files, opens the same page as the HTML
  preview's "Open in external browser" globe button: a new tab where you're
  viewing from (Safari on the MacBook, the phone), or the default browser in the
  desktop app. The thread comes from the current route.

Only absolute-path links get rows; they render as `file://` anchors. Plugins
can't add items to this menu, so each row is a clone of the native "Copy file
path" row. Rows are clickable but not reachable with arrow keys. Matches the
English "Copy file path" label; check after app updates.

The server route `POST /reveal` takes `{ "path": "/abs/file" }`, checks the file
exists, and runs `open -R` without a shell.
