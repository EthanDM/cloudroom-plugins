# Plugin CSS Scope

Temporary workaround for chat-switch stalls in Cloudroom v139–140. Uses native
CSS `@scope` to narrow selector matching for the generated `utilities` layers of
`automations`, `provider-usage`, and `scheduled-send`. Other layers and plugins
are left alone. This does not fix the underlying timeline measurement behavior.

In the original paired Electron measurements, this approach reduced style work
by roughly 49–51% and the worst switch frame by 35–40%. Those are measurements
from one local setup, not a guarantee for every machine or conversation.

Only same-origin, explicitly marked app.css links for those three built-in IDs
are eligible. The replacement is prepared in a detached stylesheet. Selectors
are rewritten to preserve their zero specificity; declaration values are not
rewritten. Unsupported browsers and unrecognized selector shapes are skipped.
A head-only observer handles stylesheet loads and replacement without watching
chat content. No settings, storage, network requests, or server actions are used.

Native scope adds a cascade proximity tie-breaker. Equal-specificity declarations
from an unscoped stylesheet can therefore lose to a scoped utility declaration.
Current root, descendant, nested-root, portal, and host fixtures are checked, but
this is a version-bounded workaround, not a universal CSS-equivalence transform.
Disable it if another customization shows a styling conflict, and remove it when
Cloudroom ships a native fix.

## Install and disable

```sh
room-cli plugin install git:https://github.com/EthanDM/cloudroom-plugins.git@main --plugin css-scope --yes
room-cli plugin disable css-scope
```

Disabling or hot reloading disconnects the observer and restores the original
rules when the plugin still owns the replacement. Later external stylesheet
edits are preserved instead of being overwritten. A page reload always reloads
the original app.css files.

## Validate

```sh
cd plugins/css-scope
npm install
npx tsc -p .
room-cli plugin build
cd ../..
node tests/css_scope.mjs
```

The browser fixture uses an installed Chrome executable (override `CHROME_PATH`
if needed), an isolated temporary profile, and a loopback fixture server. It
checks real CSSOM parsing, computed styles, asynchronous loads, cleanup, and
external-edit ownership. It closes its own browser and removes its profile.
