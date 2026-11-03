# File Link Menu

Adds top-level rows to the right-click menu on file links in chats (v139),
above "Open in":

- **Reveal in Finder** selects the file in Finder on the Cloudroom server's Mac
  (edm-node), like the app's own "Open in Finder". Non-macOS servers return 501.
- **Open in Browser**, for `.html`/`.htm` files:
  - In the desktop app (on the server's Mac), the server opens the real file
    (`file:///…`) in the default browser. The app only hands `http` links to
    the OS, so this goes through the plugin's server instead.
  - In a browser viewing remotely (Safari on the MacBook, the phone), it opens
    a new tab on a one-hour file-preview lease rooted at the file's folder, the
    URL kind the app serves without a login, so relative CSS and images load.

Only absolute-path links get rows; they render as `file://` anchors. Plugins
can't add items to this menu, so each row is a clone of the native "Copy file
path" row. Rows are clickable but not reachable with arrow keys. Matches the
English "Copy file path" label; check after app updates.

Server routes `POST /reveal` and `POST /open-in-browser` take
`{ "path": "/abs/file" }`, check the file exists, and run `open -R` or
`open -a <default browser>` without a shell.
