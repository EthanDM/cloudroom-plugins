# Server Identity

Adds a tiny server-color dot to the upper-right corner of the existing
Cloudroom Connect (phone) icon in the sidebar footer. It adds no row or spacing
and leaves the button’s normal click action and accessible name intact.

The name comes from the server’s hostname (the first part, lowercased), so
viewing edm-node from a MacBook or phone still identifies `edm-node`. It describes
the connected server and does not change when selecting another thread or machine.

- `edm-node`: blue dot.
- `edm-mbp`: lime dot.
- Other hostnames: neutral dot.

The dot identifies the machine; it is not a live connection/status indicator.
The button’s native hover title and accessibility description say
“Cloudroom server: <name>”. Connect’s existing tooltip and alerts remain intact.
If Connect has an alert badge, the server dot moves to the lower-right corner.
If the identity request fails, it uses a neutral dot and “Server unknown”.

Uses a read-only, same-origin plugin HTTP route and a content script. It has no
runtime dependencies. Cleanup restores the button’s original title/description
and removes the marker, observer, request, and stylesheet.

The Connect footer icon must be visible. If it is hidden or the Connect plugin
is disabled, the server marker is hidden too. Cloudroom v139’s
`plugin-sidebar-footer-item-connect-remote-access` hook is required; if it changes,
the marker may disappear until the selector is updated.

Install separately on each Cloudroom server:

```sh
room-cli plugin install git:https://github.com/EthanDM/cloudroom-plugins.git@main --plugin server-identity --yes
```

Update: `room-cli plugin update server-identity --yes`.

Remove: `room-cli plugin remove server-identity`.
