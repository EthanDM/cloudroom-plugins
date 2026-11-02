# Sidebar Status

Puts each thread's status where the Local/Cloud icon was, and bolds unread threads:

| Glyph | Meaning |
| --- | --- |
| Blue spinner | Running |
| Amber `?` | Needs you |
| Red `×` | Failed, unread |
| White dot | Done, unread |
| Empty | Idle Local thread |

Idle Cloud threads keep their cloud icon. Other states (drafts, queued messages, plan mode, background work) keep Cloudroom's own indicator on the right. The 14px slot is kept, so indentation doesn't change.

Assumes Settings → Appearance → Harness icons is Off (the default). Matches Cloudroom v139 markup: the status `aria-label`s ("Thread working", "Thread needs user input", "Unread thread failed", "Unread thread succeeded"), `[aria-label="Local thread"]`, and `.bb-thread-title`. If one changes, that state falls back to Cloudroom's own look.

Collapsed project sections keep Cloudroom's own rollup indicator.

Remove: `room-cli plugin remove sidebar-status`.
