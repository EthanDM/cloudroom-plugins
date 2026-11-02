# Hide Cloud Promos

Keeps the existing `hide-plan-card` plugin ID, so previous installs update in place.

Hides five promotional placements in Cloudroom v139:

- The sidebar's "Free plan / Upgrade to Pro" card.
- The rotating Pro tip below the new-thread composer (all four messages).
- The "Run this one in Cloud?" popup, including battery, memory, heat, CPU, disk, and network variants.
- The "Move to Cloud" banner in running threads, including its battery and network variants.
- The "A note from David" beta offer.

Cloud queue and usage-limit notices, disk/connection errors, billing controls,
retention settings, and paid-feature explanations remain visible.

Uses CSS only: labeled cards match their accessible labels; unlabeled tips match
their wrapper and direct icon/action structure. Cloudroom markup changes may make
promos reappear; update the selectors in `app.tsx` if that happens. This hides UI;
the host's promo effects and view telemetry still run.

Update: `room-cli plugin update hide-plan-card --yes`.

Remove: `room-cli plugin remove hide-plan-card`.
