# Sidebar Status

Puts each thread's status where the Local/Cloud icon was, and bolds unread threads:

| Glyph | Meaning |
| --- | --- |
| Blue spinner | Running |
| Amber `?` | Needs you |
| Red `×` | Failed, unread |
| White dot | Done, unread |
| Empty | Idle Local thread |

Hierarchy fixes:

- **Project headers** go from Cloudroom's 12px dim grey to 13px semibold in the full text color, with their collapse chevron always faintly visible.
- **Idle threads** dim to about 60% so headers and threads that need you lead. Hovering or selecting a row restores full color.
- **Empty projects** lose the "No threads" row and get a dimmed header. This also hides "All threads pinned" and "Threads unavailable", which use the same empty-state row.

Idle Cloud threads keep their cloud icon. Other states (drafts, queued messages, plan mode, background work) keep Cloudroom's own indicator on the right. The 14px slot is kept, so indentation doesn't change.

Assumes Settings → Appearance → Harness icons is Off (the default). Matches Cloudroom v139 markup: the status `aria-label`s ("Thread working", "Thread needs user input", "Unread thread failed", "Unread thread succeeded"), `[aria-label="Local thread"]`, `.bb-thread-title`, `.bb-sidebar-selected-row`, and the project header's `[data-sidebar-sticky-project-item] > [data-sidebar-section-id] > [data-sidebar-sticky-tier="label"]`. If one changes, that state falls back to Cloudroom's own look.

Collapsed project sections keep Cloudroom's own rollup indicator.

Remove: `room-cli plugin remove sidebar-status`.
