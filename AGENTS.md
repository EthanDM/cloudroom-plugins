# Cloudroom plugins

Each plugin lives in `plugins/<name>/` and is listed in `.bb/plugins.json`. Cloudroom servers install from `main`.

## Delivery

Delivery: push-to-main
Affected tests: none (no test suite)
Typecheck and lint: in each touched plugin, `npm install && npx tsc -p . && room-cli plugin build`
Full suite (CI and nightly only): none
Deploy: none. After pushing, run `room-cli plugin update <name> --yes` on each Cloudroom server (edm-node and edm-mbp); updates are not automatic.
Health check: `room-cli plugin list` shows the plugin `running`
Rollback: `git revert` the commit, push, and `room-cli plugin update <name>`
Critical: a plugin that breaks the Cloudroom app UI
Runtime isolation: none
