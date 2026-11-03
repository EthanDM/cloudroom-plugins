# Mobile Fixes

Phone-width fixes (iPhone PWA):

- **Safe area in pickers.** Bottom-sheet pickers such as Environment (Local/Cloud) passed `p-0`, which removed the sheet's home-indicator padding. Adds it back on those sheets only.
- **Taller recents on the new-thread screen.** The Recent list's scroll area was capped at about 5.5 rows above the input, leaving the top half empty. It now reaches up to the header; a short list still sits right above the input.
- **Less space under the input.** The footer under the input only holds the Connect Claude button. Once Claude is connected the row was empty but kept ~42px of padding, on top of the app's own home-indicator space. It's hidden when empty, and otherwise no longer double-pads.

- **Swipe left to open the right panel.** In a thread, swipe left from the right edge (outer 72px) and the page follows your finger, like the left sidebar's swipe. Release past a third, or flick, to open; otherwise it snaps back. Starts on buttons or text fields are ignored. Uses the shelf's `secondary-panel-shelf` test ID, `data-sidebar="inset"`, and the "Show right panel" button label.

- **No floating Side chat button on phones.** It floated over the chat, and on phones it created a hidden side chat without opening the panel. Use a message's own Side chat action instead. Desktop keeps the button.
- **Tighter composer while typing.** With the keyboard open, the thread input box sits right on the iOS keyboard toolbar instead of 8px above it.

Not covered: the soft thread header on iPhone. Safari blurs a band just below the status bar in the installed app; 24px of extra top padding made the header sharp (confirmed on device) but cost space and left the fixed sidebar buttons in the band, so it was reverted. Removing the page's idle `will-change` and a fixed strip behind the status bar did not help.

Matches Cloudroom v139 markup (`[data-persistent-drawer-content]`, `root-compose-compact-*` test IDs).

Remove: `room-cli plugin remove mobile-fixes`.
