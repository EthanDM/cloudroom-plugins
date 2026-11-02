# Cloudroom plugins

Personal Cloudroom tweaks. Each plugin lives in `plugins/<name>/` and is listed in `.bb/plugins.json`.

| Plugin | What it does |
| --- | --- |
| `hide-plan-card` | Hides the "Free plan" card in the Cloud queue. |

## Install or update on a Cloudroom server

```sh
room-cli plugin install git:https://github.com/EthanDM/cloudroom-plugins.git@main --plugin <name>
room-cli plugin update <name>
```

## Add a plugin

```sh
cd plugins && room-cli plugin new <name> && mv bb-plugin-<name> <name>
```

Add it to `.bb/plugins.json`, then `room-cli plugin build` inside it before pushing.
UI tweaks that match app markup can break on Cloudroom updates; prefer accessible labels over class names.
