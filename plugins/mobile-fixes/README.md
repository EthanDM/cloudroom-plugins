# Mobile Fixes

Phone-width fixes (iPhone PWA):

- **Safe area in pickers.** Bottom-sheet pickers such as Environment (Local/Cloud) passed `p-0`, which removed the sheet's home-indicator padding. Adds it back on those sheets only.
- **Taller recents on the new-thread screen.** The Recent list's scroll area was capped at about 5.5 rows above the input, leaving the top half empty. It now reaches up to the header; a short list still sits right above the input.
- **Less space under the input.** The footer under the input only holds the Connect Claude button. Once Claude is connected the row was empty but kept ~42px of padding, on top of the app's own home-indicator space. It's hidden when empty, and otherwise no longer double-pads.

- **Extra top padding (test).** The header looks blurred in the installed iPhone app; Cloudroom applies no blur, so it's likely Safari softening the area under the status bar. Adds 24px (`TOP_EXTRA_PX`) above the page in the installed app only.

Not covered: a confirmed cause for the header blur. Tried and reverted: removing the page's idle `will-change`, and a fixed strip behind the status bar.

Matches Cloudroom v139 markup (`[data-persistent-drawer-content]`, `root-compose-compact-*` test IDs).

Remove: `room-cli plugin remove mobile-fixes`.
