# Hide Plan Card

Hides the "Free plan" / "Upgrade to Pro" card in the sidebar footer by matching `section[aria-label="Free plan"]`.
If Cloudroom renames that label, the card reappears and the selector in `app.tsx` needs updating.

Remove: `room-cli plugin remove hide-plan-card`.
