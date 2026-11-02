# Cloudroom plugins

Personal Cloudroom tweaks. Each plugin lives in `plugins/<name>/` and is listed in `.bb/plugins.json`.

| Plugin | What it does |
| --- | --- |
| `hide-plan-card` | Hides the "Free plan" card in the sidebar. |
| `thread-ids` | Palette commands to copy the open thread's ID, `@thread:` mention, or link. |
| `mobile-fixes` | Phone only: safe-area padding in picker sheets, hides Plugins and Skills nav rows. |
| `sidebar-status` | Thread status (running, needs you, failed, unread) in the left icon slot; bold unread titles. |
| `keep-spinners` | Desktop app: keeps running-agent animations moving when the window loses focus. |

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
