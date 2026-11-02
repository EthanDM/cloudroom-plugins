# Thread IDs

Adds three quick-palette commands (Mod+Shift+P), available while a thread is open:

- **Thread IDs: copy thread ID** copies `thr_…`.
- **Thread IDs: copy @thread mention** copies `@thread:thr_…`, the tag agents use to link threads.
- **Thread IDs: copy thread link** copies `<current origin>/threads/thr_…`.

None has a default shortcut; bind them in Settings → Keyboard.
Uses only the plugin command and clipboard APIs, so Cloudroom markup changes don't affect it.

Remove: `room-cli plugin remove thread-ids`.
