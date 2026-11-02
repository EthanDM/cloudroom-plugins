/** Replace the sidebar's native copy-name action without guessing from the open
 * chat: a menu can belong to another row, including in a split view. v139's
 * thread-action registrations are compatibility stubs, so this is DOM-scoped.
 */
export function mountSidebarCopyId(copyId: (threadId: string) => Promise<void>): () => void {
  const replacements = new Map<Element, { text: Text; original: string; threadId: string }>();
  let source: { row: Element; threadId: string; capturedAt: number } | null = null;

  const findRow = (target: Element) => {
    for (let row: Element | null = target; row && row !== document.body; row = row.parentElement) {
      const link = row.matches('a[data-sidebar-thread-id]')
        ? row : row.querySelector(':scope > a[data-sidebar-thread-id]');
      const threadId = link?.getAttribute('data-sidebar-thread-id');
      if (threadId) return { row, threadId, capturedAt: performance.now() };
    }
    return null;
  };

  // Record before Radix opens its portalled dropdown/context menu, or the
  // phone's long-press drawer. Interactions elsewhere clear the candidate.
  const captureSource = (event: Event) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('[role="menu"], [role="menuitem"]')) return;
    source = findRow(event.target);
  };
  const restore = ({ text, original }: { text: Text; original: string }) => {
    if (text.data === 'Copy thread ID') text.data = original;
  };
  const sync = () => {
    for (const [item, replacement] of replacements) {
      if (item.isConnected && replacement.text.parentNode === item && replacement.text.data === 'Copy thread ID') continue;
      restore(replacement);
      replacements.delete(item);
    }
    if (!source?.row.isConnected || performance.now() - source.capturedAt > 2000) return;
    for (const item of Array.from(document.querySelectorAll('[role="menuitem"]'))) {
      if (replacements.has(item) || item.textContent?.trim() !== 'Copy thread name') continue;
      const menu = item.closest('[role="menu"], [role="dialog"]');
      if (!menu || menu.getAttribute('data-state') === 'closed') continue;
      const openerId = menu.getAttribute('aria-labelledby');
      const opener = openerId ? document.getElementById(openerId) : null;
      if (opener?.matches('[aria-haspopup="menu"]') && findRow(opener)?.threadId !== source.threadId) continue;
      const text = Array.from(item.childNodes).find((node): node is Text =>
        node instanceof Text && node.data.trim() === 'Copy thread name');
      if (!text) continue;
      replacements.set(item, { text, original: text.data, threadId: source.threadId });
      text.data = 'Copy thread ID';
    }
  };
  const copy = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    const item = event.target.closest('[role="menuitem"]');
    const replacement = item ? replacements.get(item) : null;
    if (!replacement || !item || replacement.text.parentNode !== item || replacement.text.data !== 'Copy thread ID') return;
    // Radix keyboard selection and touch activation also produce a click.
    // Stop the native copy-name handler, then let Escape close the host menu.
    event.preventDefault();
    event.stopImmediatePropagation();
    void copyId(replacement.threadId);
    item.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  };
  const observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["data-state"] });
  for (const type of ['pointerdown', 'keydown', 'contextmenu']) document.addEventListener(type, captureSource, true);
  document.addEventListener('click', copy, true);
  return () => {
    observer.disconnect();
    for (const type of ['pointerdown', 'keydown', 'contextmenu']) document.removeEventListener(type, captureSource, true);
    document.removeEventListener('click', copy, true);
    for (const replacement of replacements.values()) restore(replacement);
    replacements.clear();
  };
}
