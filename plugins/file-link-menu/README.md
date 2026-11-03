# File Link Menu

Adds top-level rows to the right-click menu on file links in chats (v139),
above "Open in":

- **Reveal in Finder** selects the file in Finder on the Cloudroom server's Mac
  (edm-node), like the app's own "Open in Finder". Non-macOS servers return 501.
- **Open in Browser**, for `.html`/`.htm` files, opens the page in a browser:
  your default browser in the desktop app, or a new tab where you're viewing
  from (Safari on the MacBook, the phone). It uses a one-hour file-preview
  lease rooted at the file's folder, the URL kind the app serves without a
  login, so relative CSS and images load. (The thread `files/raw` URL the
  preview's globe button uses needs the app's session and fails in an external
  browser.)

Only absolute-path links get rows; they render as `file://` anchors. Plugins
can't add items to this menu, so each row is a clone of the native "Copy file
path" row. Rows are clickable but not reachable with arrow keys. Matches the
English "Copy file path" label; check after app updates.

The server route `POST /reveal` takes `{ "path": "/abs/file" }`, checks the file
exists, and runs `open -R` without a shell.
