# Hide Local Icon

Hides the laptop (Local) icon at the start of sidebar thread rows but keeps its space, so indentation stays intact. Cloud threads keep their cloud icon, which then stands out.
The thread palette is unaffected. Matches `[aria-label="Local thread"]` inside sidebar rows; if Cloudroom renames that label, the icon reappears.

Remove: `room-cli plugin remove hide-local-icon`.
