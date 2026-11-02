const MENU = '[role="menu"], [role="dialog"]';
const HINT = 'data-thread-menu-key-hint';
const ACTION_KEYS: Record<string, string> = {
  Pin: 'p', Unpin: 'p',
  'Mark read': 'u', 'Mark unread': 'u',
  Rename: 'r',
  Archive: 'a', Unarchive: 'a',
  'Copy thread ID': 'c',
  'Open in split': 's',
  Delete: 'Delete',
};

/** Match native labels independently of our decorative key hints. */
function label(item: Element): string {
  return Array.from(item.childNodes)
    .filter(node => !(node instanceof Element && node.hasAttribute(HINT)))
    .map(node => node.textContent).join('').replace(/\s+/g, ' ').trim();
}

function isOpen(surface: Element): boolean {
  return !surface.closest('[data-state="closed"], [aria-hidden="true"], [inert]')
    && surface.getClientRects().length > 0 && getComputedStyle(surface).visibility !== 'hidden';
}

/** Only the open root thread menu qualifies; submenus and unrelated dialogs do not. */
function threadMenuItems(menu: Element): HTMLElement[] {
  if (!isOpen(menu)) return [];
  const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]'))
    .filter(item => item.closest(MENU) === menu && item.getClientRects().length > 0
      && getComputedStyle(item).visibility !== 'hidden');
  const labels = new Set(items.map(label));
  const hasCopy = labels.has('Copy thread ID') || labels.has('Copy thread name');
  const hasPin = labels.has('Pin') || labels.has('Unpin');
  const hasRead = labels.has('Mark read') || labels.has('Mark unread');
  return hasCopy && hasPin && hasRead && labels.has('Rename') && labels.has('Delete') ? items : [];
}

/** Touch-opened drawers leave focus on body. Only one unobstructed thread
 * menu may receive that body's keys; the underlying Sidebar drawer is allowed.
 */
function bodyFocusedThreadMenu(): Element | null {
  const surfaces = Array.from(document.querySelectorAll(`${MENU}, [role="alertdialog"]`)).filter(isOpen);
  const menus = surfaces.filter(surface => threadMenuItems(surface).length > 0);
  if (menus.length !== 1) return null;
  const menu = menus[0];
  const obstructed = surfaces.some(surface => surface !== menu && !surface.contains(menu)
    && surface.getAttribute('aria-label') !== 'Sidebar');
  return obstructed ? null : menu;
}

/** Decorate v139 native thread menus and activate their existing handlers. No
 * global shortcuts or thread mutations are registered. Disposal restores every
 * owned hint/attribute and removes the keyboard listener and observer.
 */
export function mountThreadMenuKeys(): () => void {
  const decorations = new Map<HTMLElement, { hint: HTMLElement; original: string | null; key: string }>();
  const style = document.createElement('style');
  style.textContent = `[${HINT}] {
    margin-left: auto;
    padding-left: 1.5rem;
    color: var(--muted-foreground);
    font-size: 0.6875rem;
    font-weight: 400;
    pointer-events: none;
  }`;
  document.head.append(style);

  const restore = (item: HTMLElement, decoration: { hint: HTMLElement; original: string | null; key: string }) => {
    decoration.hint.remove();
    if (item.getAttribute('aria-keyshortcuts') !== decoration.key) return;
    if (decoration.original === null) item.removeAttribute('aria-keyshortcuts');
    else item.setAttribute('aria-keyshortcuts', decoration.original);
  };
  const sync = () => {
    const active = new Map<HTMLElement, string>();
    for (const menu of Array.from(document.querySelectorAll(MENU))) {
      for (const item of threadMenuItems(menu)) {
        const key = ACTION_KEYS[label(item)];
        if (key) active.set(item, key);
      }
    }
    for (const [item, decoration] of decorations) {
      if (active.get(item) === decoration.key && decoration.hint.parentElement === item) continue;
      restore(item, decoration);
      decorations.delete(item);
    }
    for (const [item, key] of active) {
      if (decorations.has(item)) continue;
      const hint = document.createElement('span');
      hint.setAttribute(HINT, '');
      hint.setAttribute('aria-hidden', 'true');
      hint.textContent = key === 'Delete' ? 'Delete' : key.toUpperCase();
      decorations.set(item, { hint, original: item.getAttribute('aria-keyshortcuts'), key });
      item.setAttribute('aria-keyshortcuts', key);
      item.append(hint);
    }
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.repeat || event.isComposing
      || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey
      || !(event.target instanceof Element)) return;
    if (event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"]')) return;
    let menu = event.target.closest(MENU);
    if (!menu && (event.target === document.body || event.target === document.documentElement)) {
      menu = bodyFocusedThreadMenu();
    }
    if (!menu) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const matches = threadMenuItems(menu).filter(item => ACTION_KEYS[label(item)] === key);
    if (matches.length !== 1) return;
    const item = matches[0];
    if (item.getAttribute('aria-disabled') === 'true' || item.hasAttribute('data-disabled') || item.matches(':disabled')) return;
    // Run before Radix typeahead, using the same click path as mouse/touch and
    // the thread-ids copy replacement. The native action owns closing/confirming.
    event.preventDefault();
    event.stopImmediatePropagation();
    item.click();
  };
  const observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, characterData: true, subtree: true,
    attributes: true, attributeFilter: ['data-state'] });
  window.addEventListener('keydown', onKeyDown, true);
  sync();
  return () => {
    observer.disconnect();
    window.removeEventListener('keydown', onKeyDown, true);
    for (const [item, decoration] of decorations) restore(item, decoration);
    decorations.clear();
    style.remove();
  };
}
