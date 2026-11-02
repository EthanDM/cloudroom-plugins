# Mobile Fixes

Phone-width fixes (iPhone PWA):

- **Safe area in pickers.** Bottom-sheet pickers such as Environment (Local/Cloud) passed `p-0`, which removed the sheet's home-indicator padding. Adds it back on those sheets only.

Not covered: the blurred thread header. Current source has no blur on it, so it needs a device to diagnose.

Matches Cloudroom v139 markup (`[data-persistent-drawer-content]`).

Remove: `room-cli plugin remove mobile-fixes`.
