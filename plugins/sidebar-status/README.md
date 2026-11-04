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

The % is Cloudroom's AI-written purpose estimate, so it can lag or be optimistic. A small app overlay fetches it (and each thread's last activity) from the plugin's server code (`bb.sdk.threads.list`) every minute while the page is visible, and tags each row with a 10% bucket for the CSS. The SDK's thread type doesn't declare `purpose` yet, so the server reads it defensively; if Cloudroom drops the field, rings go empty.

Stale threads: an idle thread with no activity for 3+ days shows its age ("4d", "2w", "6mo") muted on the right, a nudge to archive. It uses the empty trailing slot, so titles keep their width; it hides on hover so the row actions show, and is off on phones, where the actions menu always occupies that slot. Age comes from Cloudroom's `latestAttentionAt`, fetched with the rings, so it can be up to a minute stale.

Hierarchy fixes:

- **Project headers** go from Cloudroom's 12px dim grey to 13px medium weight at 88% of the text color: brighter than idle threads, and not bold, so bold stays reserved for unread threads, with their collapse chevron always faintly visible.
- **Idle threads** dim to about 60% so headers and threads that need you lead. Hovering or selecting a row restores full color.
- **Empty projects** (expanded, showing "No threads") lose that row and dim their header to 50%, below idle threads. Consecutive empty projects stack tightly instead of keeping the full gap between projects. "All threads pinned" is treated the same. "Threads unavailable" (threads failed to load), the loading skeleton, and any other message stay visible. The overlay matches the message text exactly, so if Cloudroom rewords it, empty projects fall back to Cloudroom's own look. Collapsed projects keep their normal header.

Motion: expanding or collapsing a project slides its thread list open or closed (about 150–260ms, longer lists take slightly longer). Cloudroom mounts and unmounts the list instead of hiding it, so collapse briefly re-inserts the removed list as an inert, non-clickable copy and shrinks it away (`collapse-motion.ts`). Off when the system asks for reduced motion. Child-thread groups under a parent thread don't animate.

Tree guide lines and the sidebar's right edge are repainted a neutral grey (Cloudroom's hairline and seam colors pick up the theme's tint).

Idle Cloud threads keep their cloud icon, muted to the rings' grey so color stays reserved for status. Other states (drafts, queued messages, plan mode, background work) keep Cloudroom's own indicator on the right. The 14px slot is kept, so indentation doesn't change.

Assumes Settings → Appearance → Harness icons is Off (the default). Matches Cloudroom v139 markup: the status `aria-label`s ("Thread working", "Thread needs user input", "Unread thread failed", "Unread thread succeeded"), `[aria-label="Local thread"]`, `.bb-thread-title`, `.bb-sidebar-selected-row`, and the project header's `[data-sidebar-sticky-project-item] > [data-sidebar-sticky-group] > [data-sidebar-sticky-tier="label"]`. If one changes, that state falls back to Cloudroom's own look.

Collapsed project sections keep Cloudroom's own rollup indicator.

Remove: `room-cli plugin remove sidebar-status`.

## Mobile Recents

On phone widths (below 768px), the new-thread screen uses the same status
column as the sidebar instead of boxed provider logos. Unread titles are bold;
read, idle titles recede. Idle Local threads get the same progress rings/check,
and idle Cloud threads keep a muted cloud. Other native statuses, including
drafts and queued work, remain visible in the leading slot.

Project/workspace context is smaller beneath the title, with time aligned
right on that same bottom line. The usual `main` workspace is omitted from
three-part metadata; other branch names truncate before the timestamp.
Native row height, links, child indentation/toggles, status labels, focus and
selection remain in charge. Desktop Recents keep their original presentation.

This additionally matches v139's `[data-root-compose-mobile-recents]` row
structure and native metadata `title` (`project · workspace · time`). It never
replaces React-owned text; labels are projected through removable attributes
and CSS, so native time updates and disabling the plugin restore cleanly.

For the focused browser fixture, compile the DOM helpers from this folder:

```sh
npx tsc mobile-recents.ts thread-status.ts --target es2022 --module es2022 --moduleResolution bundler --skipLibCheck --outDir /tmp/sidebar-status-qa
```

In an owned blank browser-harness tab, load both emitted files (remove their
relative import/export statements), then run `tests/mobile_recents.browser.js`
with `runMobileRecentTests()`. It verifies the v139 DOM contract, leading
status states, metadata updates, progress/Cloud fallbacks, narrow widths,
dark theme, child controls, desktop isolation and disposal. It does not prove
physical iPhone/Safari rendering.
