# Hide Header Extras

Hides two thread header buttons in Cloudroom v139:

- **Report a bug** (matched by its Bug icon, since it only has a label when icon-only).
- **Share**, only while the thread is unshared. A shared thread keeps its
  "Shared" button, which is the only way to manage or stop the link.

CSS only. Agents can still send feedback with `room-cli feedback`. If Cloudroom
changes the header markup, the buttons reappear; update the selectors in
`app.tsx`.
