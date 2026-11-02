# Hide Plan Card

Hides the "Free plan" card in Cloudroom's Cloud queue by matching `section[aria-label="Free plan"]`.
If Cloudroom renames that label, the card reappears and the selector in `app.tsx` needs updating.

Remove: `room-cli plugin remove hide-plan-card`.
