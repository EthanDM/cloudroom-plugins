# UI Scale

Sets Cloudroom's root font size to 110% on desktop, so the desktop app and Safari render at the same size. Reset browser and app zoom to 100% (⌘0) when using it.

Cloudroom's text, spacing, and icons are rem-based and scale with it. A few labels sized in px (10–13px badges) don't. Phones (coarse pointer, under 768px wide) are left alone.

Change the size: edit `SCALE` in `app.tsx`.

Remove: `room-cli plugin remove ui-scale`.
