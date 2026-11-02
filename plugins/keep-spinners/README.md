# Keep Spinners

The Cloudroom desktop app pauses looping animations, including running-agent spinners, while its window is unfocused, so agents on a second monitor look hung.
This plugin removes the `data-window-blurred` attribute on `<html>` that triggers the pause. Browsers such as Safari never set it, so this only matters in the desktop app.
If Cloudroom renames the attribute, the pause comes back.

Remove: `room-cli plugin remove keep-spinners`.
