// Swipe left from the right edge to open a thread's right panel, following the
// finger like Cloudroom's own left-sidebar swipe (v139 `sidebar.tsx` numbers).
//
// On phones the right panel is always mounted behind the page, hidden
// (`data-state="closed"`, `visibility: hidden`). Opening it slides the page
// inset left to reveal it. During the drag we do the same with inline styles;
// on release we press the native toggle and animate the inline translate to
// its final spot, then hand back to the app's own classes.
const EDGE_ZONE_PX = 72;
const INTENT_PX = 12;
const OPEN_RATIO = 0.33;
const FLING_MIN_RATIO = 0.12;
const FLING_VELOCITY_PX_PER_SEC = 450;
const SETTLE_MS = 220;
const SETTLE_TRANSITION = `translate ${SETTLE_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`;

const INSET = '[data-sidebar="inset"][data-sidebar-shelf="closed"]';
const CLOSED_SHELF = '[data-testid="secondary-panel-shelf"][data-state="closed"]';
const SHOW_PANEL_BUTTON = 'button[aria-label^="Show right panel"]';
const IGNORED_TARGET =
  'input, textarea, select, [contenteditable="true"], [role="slider"], button, a, [role="button"], [data-no-secondary-panel-swipe]';

type Session = {
  touchId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastTime: number;
  velocityX: number;
  dragging: boolean;
  inset: HTMLElement;
  shelf: HTMLElement;
  button: HTMLButtonElement;
  width: number;
};

function trackedTouch(event: TouchEvent, id: number): Touch | null {
  for (const touch of Array.from(event.changedTouches)) {
    if (touch.identifier === id) return touch;
  }
  return null;
}

export function mountRightPanelSwipe(): () => void {
  const doc = document;
  let session: Session | null = null;
  let settleTimer: number | undefined;

  const clearStyles = (inset: HTMLElement, shelf: HTMLElement) => {
    inset.style.translate = "";
    inset.style.transition = "";
    shelf.style.visibility = "";
    shelf.style.transition = "";
  };

  const settle = (current: Session, open: boolean) => {
    const { inset, shelf, width } = current;
    inset.style.transition = SETTLE_TRANSITION;
    inset.style.translate = open ? `${-width}px` : "0px";
    if (open) current.button.click();
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => clearStyles(inset, shelf), SETTLE_MS + 30);
  };

  const onTouchStart = (event: TouchEvent) => {
    if (session || event.touches.length !== 1 || event.defaultPrevented) return;
    const touch = event.touches[0];
    if (touch.clientX < window.innerWidth - EDGE_ZONE_PX) return;
    if (event.target instanceof Element && event.target.closest(IGNORED_TARGET)) return;
    const inset = doc.querySelector<HTMLElement>(INSET);
    const shelf = doc.querySelector<HTMLElement>(CLOSED_SHELF);
    const button = doc.querySelector<HTMLButtonElement>(SHOW_PANEL_BUTTON);
    if (!inset || !shelf || !button || !inset.contains(button)) return;
    const width = shelf.clientWidth;
    if (width <= 0) return;
    session = {
      touchId: touch.identifier,
      startX: touch.clientX,
      startY: touch.clientY,
      lastX: touch.clientX,
      lastTime: event.timeStamp,
      velocityX: 0,
      dragging: false,
      inset,
      shelf,
      button,
      width,
    };
  };

  const onTouchMove = (event: TouchEvent) => {
    if (!session) return;
    const touch = trackedTouch(event, session.touchId);
    if (!touch) return;
    const dx = session.startX - touch.clientX;
    const dy = touch.clientY - session.startY;
    if (!session.dragging) {
      if (Math.abs(dx) < INTENT_PX && Math.abs(dy) < INTENT_PX) return;
      // Vertical scroll or a rightward move: leave the gesture to the page.
      if (dx <= 0 || Math.abs(dy) >= Math.abs(dx)) {
        session = null;
        return;
      }
      session.dragging = true;
      window.clearTimeout(settleTimer);
      session.inset.style.transition = "none";
      // The closed shelf delays visibility by its 220ms hide transition.
      session.shelf.style.transition = "none";
      session.shelf.style.visibility = "visible";
    }
    if (event.cancelable) event.preventDefault();
    const elapsed = event.timeStamp - session.lastTime;
    if (elapsed > 0) {
      session.velocityX = ((session.lastX - touch.clientX) / elapsed) * 1000;
    }
    session.lastX = touch.clientX;
    session.lastTime = event.timeStamp;
    const offset = Math.min(Math.max(dx, 0), session.width);
    session.inset.style.translate = `${-offset}px`;
  };

  const onTouchEnd = (event: TouchEvent) => {
    if (!session) return;
    const current = session;
    const touch = trackedTouch(event, current.touchId);
    if (!touch) return;
    session = null;
    if (!current.dragging) return;
    const progress = Math.min(Math.max(current.startX - touch.clientX, 0), current.width) / current.width;
    const open = event.type === "touchend" && (
      progress >= OPEN_RATIO
      || (progress >= FLING_MIN_RATIO && current.velocityX >= FLING_VELOCITY_PX_PER_SEC)
    );
    settle(current, open);
  };

  const options = { capture: true, passive: false } as const;
  doc.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
  doc.addEventListener("touchmove", onTouchMove, options);
  doc.addEventListener("touchend", onTouchEnd, options);
  doc.addEventListener("touchcancel", onTouchEnd, options);

  return () => {
    doc.removeEventListener("touchstart", onTouchStart, { capture: true });
    doc.removeEventListener("touchmove", onTouchMove, options);
    doc.removeEventListener("touchend", onTouchEnd, options);
    doc.removeEventListener("touchcancel", onTouchEnd, options);
    window.clearTimeout(settleTimer);
    if (session) clearStyles(session.inset, session.shelf);
    session = null;
  };
}
