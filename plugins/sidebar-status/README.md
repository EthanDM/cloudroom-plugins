# Sidebar Status

Puts each thread's status where the Local/Cloud icon was, and bolds unread threads:

| Glyph | Meaning |
| --- | --- |
| Blue spinner | Running |
| Amber `?` | Needs you |
| Red `×` | Failed, unread |
| White dot | Done, unread |
| Faint thin ring, arc drawn to the % | Idle Local thread: Cloudroom's purpose "% done" (the hover card's bar) |
| Muted check | Idle and 100% done, a hint it can be archived |
| Empty ring | Idle, no purpose summary yet |

The % is Cloudroom's AI-written purpose estimate, so it can lag or be optimistic. A small app overlay fetches it from the plugin's server code (`bb.sdk.threads.list`) every minute while the page is visible, and tags each row with a 10% bucket for the CSS. The SDK's thread type doesn't declare `purpose` yet, so the server reads it defensively; if Cloudroom drops the field, rings go empty.

Hierarchy fixes:

- **Project headers** go from Cloudroom's 12px dim grey to 13px semibold in the full text color, with their collapse chevron always faintly visible.
- **Idle threads** dim to about 60% so headers and threads that need you lead. Hovering or selecting a row restores full color.
- **Empty projects** lose the "No threads" row and get a dimmed header. This also hides "All threads pinned" and "Threads unavailable", which use the same empty-state row.

Idle Cloud threads keep their cloud icon. Other states (drafts, queued messages, plan mode, background work) keep Cloudroom's own indicator on the right. The 14px slot is kept, so indentation doesn't change.

Assumes Settings → Appearance → Harness icons is Off (the default). Matches Cloudroom v139 markup: the status `aria-label`s ("Thread working", "Thread needs user input", "Unread thread failed", "Unread thread succeeded"), `[aria-label="Local thread"]`, `.bb-thread-title`, `.bb-sidebar-selected-row`, and the project header's `[data-sidebar-sticky-project-item] > [data-sidebar-sticky-group] > [data-sidebar-sticky-tier="label"]`. If one changes, that state falls back to Cloudroom's own look.

Collapsed project sections keep Cloudroom's own rollup indicator.

Remove: `room-cli plugin remove sidebar-status`.
