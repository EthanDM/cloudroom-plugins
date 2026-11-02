# Unread Emphasis

Makes unread threads stand out in the sidebar: the unread dot grows from 5px to 8px in the accent color, and unread threads (succeeded or failed) get a bold title.
Collapsed parent threads with unread children are emphasized too. Collapsed project sections only get the bigger dot; their titles stay as they are.

Matches Cloudroom v139 markup: the indicator's `aria-label` ("Unread thread succeeded" / "Unread thread failed") and `.bb-thread-title`. If either changes, the sidebar quietly goes back to normal.

Remove: `room-cli plugin remove unread-emphasis`.
