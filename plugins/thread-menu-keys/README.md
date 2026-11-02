# Thread Menu Keys

Adds key hints to native thread menus. While a root thread menu is open,
press a key to activate its existing item:

| Key | Action |
| --- | --- |
| P | Pin / Unpin |
| U | Mark read / unread |
| R | Rename |
| A | Archive / Unarchive |
| C | Copy thread ID (when thread-ids supplies that item) |
| S | Open in split (when available) |
| Delete | Open the native delete confirmation |

Delete means forward delete (⌦ / Fn+Delete on a Mac); Backspace is unchanged.
The keys act on the menu's thread, including a row different from the open chat.
They also work in right-click menus and compact drawers with a hardware keyboard.
Inputs, submenus, other dialogs, modifiers, key repeats and composition are excluded.
Arrow keys, Enter, Escape and other native typeahead keys remain available.

No global shortcuts, thread API calls, or settings. Hints are decorative;
`aria-keyshortcuts` exposes the keys to assistive technology. Disabling the plugin
removes its hints and restores prior attributes.

Matches v139's English menu labels and roles. Unrecognized menus remain native;
check compatibility after app updates. It does not add missing native actions.

Remove: `room-cli plugin remove thread-menu-keys`.

## Focused regression fixture

Typecheck/build the plugin, then compile its DOM helper from this folder:

```sh
npx tsc menu-keys.ts --target es2022 --module es2022 --moduleResolution bundler --skipLibCheck --outDir /tmp/thread-menu-keys-qa
```

In an owned blank browser-harness tab, run the compiled helper together with
`tests/thread_menu_keys.browser.js` from the repo:

```python
source = open('/tmp/thread-menu-keys-qa/menu-keys.js').read().replace('export function', 'function')
fixture = open('/absolute/repo/tests/thread_menu_keys.browser.js').read()
result = cdp('Runtime.evaluate', expression=source + '\n' + fixture + '\nrunThreadMenuKeyTests(mountThreadMenuKeys)', awaitPromise=True, returnByValue=True)
assert 'exceptionDetails' not in result, result
print(result['result']['value'])
```

The fixture exercises all keys without mutating real threads. Also test actual
dropdown/right-click and compact menus, C with thread-ids, and R/Delete with
cancellation. Do not archive/delete real work just to validate a shortcut.
