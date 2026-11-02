# Server Identity

Shows a small machine name just below the sidebar’s window controls, above
“New thread,” in the desktop app and browser. It stays visible while the sidebar
is open. This separate row clears the macOS traffic-light/navigation capsule.

The name comes from the server’s hostname (the first part, lowercased), so
viewing edm-node from a MacBook or phone still shows `edm-node`. It describes
the connected server and does not change when selecting another thread or machine.

- `edm-node`: blue dot.
- `edm-mbp`: lime dot.
- Other hostnames: neutral dot and the actual hostname.

The dot identifies the machine; it is not a live connection/status indicator.
Hover text and the accessible label say “Cloudroom server: <name>”. If the
identity request fails, it shows “Server unknown” instead of guessing.

Uses a read-only, same-origin plugin HTTP route and a content script. It adds
no navigation items and has no runtime dependencies. The script handles sidebar
remounts and removes its labels, observer, request, and stylesheet on disposal.
Cloudroom v139’s `app-sidebar-top-reserve-row` hook is required; if that changes,
the label may disappear until the selector is updated.

Install separately on each Cloudroom server:

```sh
room-cli plugin install git:https://github.com/EthanDM/cloudroom-plugins.git@main --plugin server-identity --yes
```

Remove: `room-cli plugin remove server-identity`.
