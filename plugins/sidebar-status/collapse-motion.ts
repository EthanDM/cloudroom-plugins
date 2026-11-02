// Animates project expand/collapse in the sidebar.
//
// Cloudroom v139 mounts a project's thread list as the div right after its
// label tier when the project expands, and unmounts it when it collapses
// (TopLevelSidebarSection). A list added or removed directly under an existing
// project group is therefore a toggle; whole projects mounting on page load
// arrive as the project item instead and are left alone.
//
// Expand grows the new list from 0 to its height. Collapse re-inserts the node
// React just removed as an inert ghost, shrinks it to 0, then deletes it.
// React has discarded that node, so it never touches the ghost.

const PROJECT_GROUP_SELECTOR = "[data-sidebar-sticky-project-item] > [data-sidebar-sticky-group]";
const LABEL_TIER_SELECTOR = '[data-sidebar-sticky-tier="label"]';
const GHOST_ATTRIBUTE = "data-sidebar-status-collapse-ghost";
const EASING = "cubic-bezier(0.2, 0, 0, 1)";

// Longer lists take a little longer, so tall and short groups feel the same.
function durationFor(height: number): number {
  return Math.min(260, 140 + height / 8);
}

function isProjectGroup(node: Node | null): node is Element {
  return node instanceof Element && node.matches(PROJECT_GROUP_SELECTOR);
}

function isLabelTier(node: Node | null): boolean {
  return node instanceof Element && node.matches(LABEL_TIER_SELECTOR);
}

function animateHeight(element: HTMLElement, from: number, to: number): Animation {
  const previousOverflow = element.style.overflow;
  element.style.overflow = "hidden";
  const animation = element.animate(
    [
      { height: `${from}px`, opacity: from === 0 ? 0 : 1 },
      { height: `${to}px`, opacity: to === 0 ? 0 : 1 },
    ],
    { duration: durationFor(Math.max(from, to)), easing: EASING },
  );
  const restore = () => {
    element.style.overflow = previousOverflow;
  };
  animation.addEventListener("finish", restore);
  animation.addEventListener("cancel", restore);
  return animation;
}

function expand(list: HTMLElement): void {
  const height = list.getBoundingClientRect().height;
  if (height > 0) animateHeight(list, 0, height);
}

function collapse(removedList: HTMLElement, labelTier: Element): void {
  removedList.setAttribute(GHOST_ATTRIBUTE, "");
  removedList.setAttribute("aria-hidden", "true");
  removedList.inert = true;
  labelTier.after(removedList);
  const height = removedList.getBoundingClientRect().height;
  const animation = animateHeight(removedList, height, 0);
  const remove = () => removedList.remove();
  animation.addEventListener("finish", remove);
  animation.addEventListener("cancel", remove);
}

// React appends a re-expanded list after any ghost still shrinking there.
function previousRealSibling(element: Element): Element | null {
  let sibling = element.previousElementSibling;
  while (sibling?.hasAttribute(GHOST_ATTRIBUTE)) sibling = sibling.previousElementSibling;
  return sibling;
}

function removeGhosts(group: Element): void {
  for (const ghost of group.querySelectorAll(`:scope > [${GHOST_ATTRIBUTE}]`)) ghost.remove();
}

function handleMutations(records: MutationRecord[]): void {
  for (const record of records) {
    const group = record.target;
    if (!isProjectGroup(group)) continue;

    for (const node of record.addedNodes) {
      if (!(node instanceof HTMLElement) || node.hasAttribute(GHOST_ATTRIBUTE)) continue;
      if (!isLabelTier(previousRealSibling(node))) continue;
      // A re-expand mid-collapse replaces the shrinking ghost.
      removeGhosts(group);
      expand(node);
    }

    for (const node of record.removedNodes) {
      if (!(node instanceof HTMLElement) || node.hasAttribute(GHOST_ATTRIBUTE)) continue;
      if (!isLabelTier(record.previousSibling)) continue;
      collapse(node, record.previousSibling as Element);
    }
  }
}

/** Starts animating sidebar project toggles; returns a disposer. */
export function startCollapseMotion(): () => void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  const observer = new MutationObserver(handleMutations);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => {
    observer.disconnect();
    for (const ghost of document.querySelectorAll(`[${GHOST_ATTRIBUTE}]`)) ghost.remove();
  };
}
