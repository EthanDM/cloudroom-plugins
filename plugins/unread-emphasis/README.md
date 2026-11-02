# Unread Emphasis

Makes unread threads stand out in the sidebar: the unread dot grows from 5px to 8px in the accent color, and unread threads (succeeded or failed) get a bold title.
Collapsed parents and sections that contain unread threads are emphasized too.

Matches Cloudroom v139 markup: the indicator's `aria-label` ("Unread thread succeeded" / "Unread thread failed") and `.bb-thread-title`. If either changes, the sidebar quietly goes back to normal.

Remove: `room-cli plugin remove unread-emphasis`.
