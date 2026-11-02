# Thread IDs

Replaces **Copy thread name** with **Copy thread ID** in sidebar thread menus
(⋯, right-click, and mobile long-press). It copies the menu's row, even when
another thread is open. Unrecognized menu markup keeps the native action.

Also adds three quick-palette commands (Mod+Shift+P), available while a thread is open:

- **Thread IDs: copy thread ID** copies `thr_…`.
- **Thread IDs: copy @thread mention** copies `@thread:thr_…`, the tag agents use to link threads.
- **Thread IDs: copy thread link** copies `<current origin>/threads/thr_…`.

None has a default shortcut; bind them in Settings → Keyboard.
Palette commands use the plugin command and clipboard APIs. The sidebar menu
replacement matches v139 markup and needs a compatibility check after updates.

Remove: `room-cli plugin remove thread-ids`.
