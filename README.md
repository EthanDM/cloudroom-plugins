# Cloudroom plugins

My personal Cloudroom tweaks, shared as-is. Tested against Cloudroom v139.
Most of them hook into the app's page markup, so an app update can break
them; I fix them for my own setup, with no support promised. Read a plugin's
code before installing it: plugins run with full access to your Cloudroom
server. MIT licensed, so fork and adapt freely.

`server-identity` is specific to my two machines (`edm-node`, `edm-mbp`);
change the hostnames and colors in its `app.tsx` to use it.

Each plugin lives in `plugins/<name>/` and is listed in `.bb/plugins.json`.

| Plugin | What it does |
| --- | --- |
| `hide-plan-card` | Hides Cloud promos: the Free plan card, rotating Pro tip, Cloud nudges, beta offer, and Get started checklist. |
| `hide-header-actions` | Hides the thread header's Report a bug and Share buttons; an already-shared thread keeps "Shared". |
| `file-link-menu` | Top-level **Reveal in Finder** (on the server's Mac) and, for HTML files, **Open in Browser** (where you're viewing from) in the right-click menu on chat file links. |
| `server-identity` | Adds a tiny server dot to the footer's phone icon (blue for edm-node, lime for edm-mbp) and a blue send button on edm-node. |
| `compact-navigation` | Packs native sidebar navigation into an icon bar with tooltips, preserving More and customization. |
| `thread-ids` | Copy thread ID in sidebar menus; palette commands for ID, `@thread:` mention, or link. |
| `thread-menu-keys` | Visible single-key shortcuts while a thread menu is open. |
| `mobile-fixes` | Safe-area padding in mobile picker sheets; taller new-thread recents, less space under the input, and swipe left for the right panel on phones. |
| `sidebar-status` | Thread status and % done rings in the left icon slot, bold unread titles, stronger project headers, dimmed idle threads, no "No threads" rows, animated expand/collapse. |
| `keep-spinners` | Desktop app: keeps running-agent animations moving when the window loses focus. |
| `css-scope` | Temporary v139–140 workaround: scopes three built-in plugins' utility CSS to reduce chat-switch style work. |

## Install or update on a Cloudroom server

```sh
room-cli plugin install git:https://github.com/EthanDM/cloudroom-plugins.git@main --plugin <name> --yes
room-cli plugin update <name> --yes
```

## Add a plugin

```sh
cd plugins && room-cli plugin new <name> && mv bb-plugin-<name> <name>
```

Add it to `.bb/plugins.json`, then `room-cli plugin build` inside it before pushing.
UI tweaks that match app markup can break on Cloudroom updates; prefer accessible labels over class names.

## Check after a Cloudroom update

Use the `cloudroom-plugin-check` skill. Its repeatable inventory/build runner,
current-view browser probes, and required behavior matrix are documented in
[docs/plugin-checks.md](docs/plugin-checks.md).

```sh
python3 scripts/check-plugins.py --build --output /tmp/plugin-check/inventory.json
```

Exit 2 means behavior remains untested; compilation alone does not prove health.
