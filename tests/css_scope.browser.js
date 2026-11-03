/** Real CSSOM fixtures; run with node tests/css_scope.mjs. */
export async function runCssScopeTests(mount) {
  const results = [];
  const check = (name, condition) => {
    if (!condition) throw Error(name);
    results.push(name);
  };
  const tick = () => new Promise(resolve => setTimeout(resolve, 0));
  const prefix = id => `:where([data-bb-plugin="${id}"], [data-bb-plugin-root]:not([data-bb-plugin]))`;
  const css = id => `@layer utilities {
    ${prefix(id)}.probe, ${prefix(id)} .probe { --probe-${id}: yes; }
    @media (min-width: 0px) { ${prefix(id)} .probe { --nested: yes; } }
    ${prefix(id)} .probe { & > .child { --child: yes; } }
    ${prefix(id)} .literal { --literal-${id}: '${prefix(id)}'; }
  }`;
  const links = [];
  const load = async (id, text = css(id)) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `/api/v1/plugins/${id}/assets/app.css?fixture=${links.length}`;
    const loaded = new Promise((resolve, reject) => { link.onload = resolve; link.onerror = reject; });
    links.push(link);
    document.head.append(link);
    await loaded;
    link.sheet.insertRule(text, 0);
    link.setAttribute('data-bb-plugin-css', id);
    return link;
  };
  const serialized = link => Array.from(link.sheet.cssRules, rule => rule.cssText).join('\n');
  const scoped = link => link.sheet.cssRules[0].cssRules[0]?.cssText.startsWith('@scope');
  const fixture = document.createElement('div');
  document.body.append(fixture);
  const probes = [];
  const root = (id, parent = fixture, portal = false) => {
    const element = document.createElement('div');
    if (id) element.setAttribute('data-bb-plugin', id);
    if (portal) element.setAttribute('data-bb-plugin-root', '');
    element.className = 'probe literal';
    element.innerHTML = '<span class="probe literal"><b class="child"></b></span>';
    parent.append(element);
    probes.push(element, element.firstChild, element.firstChild.firstChild);
    return element;
  };
  root(null);
  const outer = root('automations');
  root('provider-usage');
  root('provider-usage', outer);
  root(null, fixture, true);
  const read = () => probes.map(node => {
    const style = getComputedStyle(node);
    return ['--probe-automations', '--probe-provider-usage', '--nested', '--literal-automations', '--literal-provider-usage', '--child']
      .map(property => style.getPropertyValue(property));
  });
  let dispose = () => {};
  try {
    const first = await load('automations');
    const second = await load('provider-usage');
    const unrelated = await load('unrelated');
    const firstText = serialized(first);
    const secondText = serialized(second);
    const unrelatedText = serialized(unrelated);
    const before = read();
    const controller = new AbortController();
    dispose = mount(controller.signal);
    check('initial allowlisted sheets scoped', scoped(first) && scoped(second));
    check('root, descendant, nested root, portal and declaration values unchanged', JSON.stringify(before) === JSON.stringify(read()));
    check('unrelated plugin untouched', serialized(unrelated) === unrelatedText);
    const third = await load('scheduled-send');
    await tick();
    check('async stylesheet discovered', scoped(third));
    const thirdSheet = third.sheet;
    third.remove();
    await tick();
    check('removed stylesheet restored', !thirdSheet.cssRules[0].cssRules[0].cssText.startsWith('@scope'));
    const duplicateDispose = mount(new AbortController().signal);
    duplicateDispose();
    check('second mount does not own existing scopes', scoped(first));
    controller.abort();
    dispose();
    check('abort and repeated cleanup restore exact rules', serialized(first) === firstText && serialized(second) === secondText);
    const rejected = await load('scheduled-send', '@layer utilities { :where([data-bb-plugin="unexpected"]) .probe { color: red; } }');
    const rejectedText = serialized(rejected);
    const globalRule = await load('scheduled-send', `@layer utilities { ${prefix('scheduled-send')} .probe { color: red; } .global { color: blue; } }`);
    const globalText = serialized(globalRule);
    dispose = mount(new AbortController().signal);
    check('unknown selector shape left intact', serialized(rejected) === rejectedText);
    check('unprefixed top-level utility left intact', serialized(globalRule) === globalText);
    const layer = first.sheet.cssRules[0];
    layer.cssRules[0].insertRule('.external { color: green; }', 0);
    const editedText = serialized(first);
    dispose();
    check('external edits preserved on cleanup', serialized(first) === editedText);
    const aborted = new AbortController();
    aborted.abort();
    const unchanged = serialized(second);
    mount(aborted.signal)();
    check('already aborted mount is inert', serialized(second) === unchanged);
    first.remove();
    rejected.remove();
    const saved = window.CSSScopeRule;
    try {
      delete window.CSSScopeRule;
      mount(new AbortController().signal)();
      check('unsupported browser is inert', serialized(second) === unchanged);
    } finally { window.CSSScopeRule = saved; }
    return results;
  } finally {
    dispose();
    links.forEach(link => link.remove());
    fixture.remove();
  }
}
