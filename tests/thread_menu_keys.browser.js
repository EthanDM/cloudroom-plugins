/** Run only in an owned blank browser tab, with the compiled mount function.
 * Real layout is needed to exercise hidden/closed menu guards. No app data or
 * clipboard is touched: fixture items stand in for native action handlers.
 */
async function runThreadMenuKeyTests(mount) {
  const results = [];
  const check = (name, condition) => {
    if (!condition) throw Error(name);
    results.push(name);
  };
  const tick = () => new Promise(resolve => setTimeout(resolve, 0));
  const calls = [];
  const root = document.createElement('div');
  document.body.append(root);
  const menu = document.createElement('div');
  menu.setAttribute('role', 'menu');
  menu.setAttribute('data-state', 'open');
  menu.tabIndex = 0;
  const labels = ['Copy thread ID', 'Mark unread', 'Pin', 'Rename', 'Archive', 'Open in split', 'Delete'];
  for (const text of labels) {
    const item = document.createElement('div');
    item.setAttribute('role', 'menuitem');
    item.append(text);
    item.addEventListener('click', () => calls.push(item.firstChild.textContent));
    menu.append(item);
  }
  root.append(menu);
  const items = Array.from(menu.children);
  const press = (target, key, options = {}) => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });
    target.dispatchEvent(event);
    return event.defaultPrevented;
  };
  const dispose = mount();
  try {
    check('visible decorative hints and ARIA keys', menu.querySelectorAll('[data-thread-menu-key-hint][aria-hidden=true]').length === 7
      && items[0].getAttribute('aria-keyshortcuts') === 'c');
    for (const [key, expected] of [['p', 'Pin'], ['u', 'Mark unread'], ['r', 'Rename'], ['a', 'Archive'], ['c', 'Copy thread ID'], ['s', 'Open in split'], ['Delete', 'Delete']]) {
      check(`native ${key} action`, press(menu, key) && calls.at(-1) === expected);
    }
    for (const [index, text, key] of [[1, 'Mark read', 'u'], [2, 'Unpin', 'p'], [4, 'Unarchive', 'a']]) {
      items[index].firstChild.textContent = text;
      await tick();
      check(`toggle ${text}`, press(menu, key) && calls.at(-1) === text);
    }
    check('body focus activates the sole open thread menu', press(document.body, 'p') && calls.at(-1) === 'Unpin');
    const count = calls.length;
    for (const options of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true }, { repeat: true }, { isComposing: true }]) press(menu, 'p', options);
    const outside = document.createElement('button'); root.append(outside); press(outside, 'p'); outside.remove();
    check('modifiers, repeats, composition and outside focus ignored', calls.length === count);
    for (const tag of ['input', 'textarea', 'select', 'div']) {
      const input = document.createElement(tag);
      if (tag === 'div') input.setAttribute('contenteditable', 'true');
      menu.append(input); press(input, 'p'); input.remove();
    }
    check('editable controls ignored', calls.length === count);
    items[2].setAttribute('aria-disabled', 'true'); press(menu, 'p'); items[2].removeAttribute('aria-disabled');
    items[2].setAttribute('data-disabled', ''); press(menu, 'p'); items[2].removeAttribute('data-disabled');
    check('disabled actions ignored', calls.length === count);
    items[5].style.display = 'none'; press(menu, 's'); items[5].style.display = '';
    check('hidden action ignored', calls.length === count);
    check('arrows, Escape, Enter, Backspace and other letters unchanged', ['ArrowDown', 'Escape', 'Enter', 'Backspace', 'x'].every(key => !press(menu, key)) && calls.length === count);
    const blocker = document.createElement('div'); blocker.setAttribute('role', 'dialog'); blocker.textContent = 'Other dialog'; root.append(blocker);
    press(document.body, 'p'); blocker.remove();
    check('another dialog blocks body focus fallback', calls.length === count);
    menu.setAttribute('aria-hidden', 'true'); press(menu, 'p'); press(document.body, 'p'); menu.removeAttribute('aria-hidden');
    check('hidden overlay cannot act', calls.length === count);
    const submenu = document.createElement('div'); submenu.setAttribute('role', 'menu'); submenu.innerHTML = '<div role="menuitem">Pin</div>';
    menu.append(submenu); press(submenu, 'p'); press(document.body, 'p'); submenu.remove();
    check('submenus ignored', calls.length === count);
    const duplicate = items[2].cloneNode(true); menu.append(duplicate); press(menu, 'p'); duplicate.remove();
    check('ambiguous actions ignored', calls.length === count);
    menu.setAttribute('data-state', 'closed'); await tick(); press(menu, 'p');
    check('closed cached menus ignored and undecorated', calls.length === count && !menu.querySelector('[data-thread-menu-key-hint]'));
    menu.setAttribute('data-state', 'open'); await tick();
    check('cached menus redecorate', menu.querySelectorAll('[data-thread-menu-key-hint]').length === 7);
    items[0].firstChild.textContent = 'Copy thread name'; await tick(); press(menu, 'c');
    check('native copy-name never becomes copy-ID shortcut', calls.length === count && !items[0].hasAttribute('aria-keyshortcuts'));
    menu.setAttribute('role', 'dialog'); await tick();
    check('compact dialog recognized', press(menu, 'p') && calls.at(-1) === 'Unpin');
    items[2].setAttribute('aria-keyshortcuts', 'foreign');
    dispose();
    const afterDispose = calls.length; press(menu, 'p');
    check('cleanup removes hints and listener, preserves foreign ARIA', !menu.querySelector('[data-thread-menu-key-hint]')
      && !items[1].hasAttribute('aria-keyshortcuts') && items[2].getAttribute('aria-keyshortcuts') === 'foreign' && calls.length === afterDispose);
  } finally {
    dispose();
    root.remove();
  }
  return results;
}
