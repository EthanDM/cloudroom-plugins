// Run in an owned blank tab with v139's app CSS and compiled sidebar-status
// DOM helpers loaded. No real threads or preferences are changed.
async function runMobileRecentTests() {
  const results = [];
  const check = (name, passed) => {
    if (!passed) throw new Error(name);
    results.push(name);
  };
  const tick = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  document.body.innerHTML = '<main id="fixture"></main>';
  const fixture = document.querySelector('#fixture');
  fixture.style.cssText = 'width:100%;max-width:393px;padding:16px;background:var(--background)';
  document.querySelector('style[data-mobile-recents-fixture]')?.remove();
  const style = document.createElement('style');
  style.dataset.mobileRecentsFixture = '';
  style.textContent = '@keyframes sidebar-status-spin { to { transform: rotate(360deg); } }' + MOBILE_RECENTS_CSS;
  document.head.append(style);
  const labels = ['', 'Thread working', 'Thread needs user input', 'Unread thread failed', 'Unread thread succeeded', 'Thread working with unsubmitted draft', 'Queued message failed', '', '', '', ''];
  const escape = (text) => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  fixture.innerHTML = `<section data-root-compose-mobile-recents><h2>Recent</h2><ul class="space-y-px">${labels.map((label, index) => `
    <li class="flex items-center gap-1 rounded-md pr-2 h-15">
      <a href="/projects/proj_fixture/threads/thr_${index}" aria-label="Open Fixture ${index}${label ? ` — ${label}` : ''}" style="padding-left:${index === 9 ? 24 : 8}px" class="flex min-w-0 flex-1 items-center gap-2.5 rounded-md text-foreground h-15">
        <span class="flex size-7 shrink-0 items-center justify-center rounded-md border border-border-seam bg-surface-raised"><svg data-provider-logo></svg></span>
        <span class="min-w-0 flex-1 space-y-0.5">
          <span class="flex min-w-0 items-center gap-1.5"><span class="min-w-0 truncate font-medium text-base">Fixture ${index}</span></span>
          <span class="flex min-w-0 items-center gap-1.5 leading-4 text-muted-foreground text-sm" title="project · ${index === 7 ? 'room/a-very-long-branch-that-must-truncate-before-the-time' : 'main'} · 4m ago"><svg data-icon="${index === 8 ? 'Cloud' : 'Laptop'}" class="size-3.5 shrink-0"></svg><span class="min-w-0 truncate">native metadata</span></span>
        </span>
        ${label ? `<span class="flex size-6 shrink-0 items-center justify-center"><svg data-icon="Loading" aria-label="${escape(label)}" class="size-5"></svg></span>` : ''}
      </a>
      ${index === 9 ? '<button aria-label="Show threads under Fixture 9" class="size-11">⌄</button>' : ''}
    </li>`).join('')}</ul></section>`;
  const links = [...fixture.querySelectorAll('li > a')];
  const rows = links.map((link) => link.parentElement);
  const title = (index) => links[index].children[1].children[0].firstElementChild;
  const metadata = (index) => links[index].querySelector('span[title]');
  const pseudo = (index) => getComputedStyle(links[index], '::before');
  const hints = new Map(links.map((link, index) => [`thr_${index}`, {percent:index === 10 || index === 8 ? 100 : 40}]));
  tagMobileRecentRows(hints);
  await tick();
  check('main workspace omitted, timestamp separate', metadata(0).getAttribute('data-recent-thread-context') === 'project' && metadata(0).getAttribute('data-recent-thread-time') === '4m ago');
  check('native label and text stay intact', metadata(0).title === 'project · main · 4m ago' && metadata(0).lastElementChild.textContent === 'native metadata');
  if (innerWidth < 768) {
    check('provider tile hidden on phones', getComputedStyle(links[0].firstElementChild).display === 'none');
    check('idle ring has real progress', rows[0].getAttribute(PROGRESS_ATTRIBUTE) === '40' && pseudo(0).backgroundImage.includes('40%'));
    check('running spinner shares sidebar style', pseudo(1).animationName === (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'none' : 'sidebar-status-spin'));
    check('needs-input and failure shapes visible', pseudo(2).borderTopStyle === 'solid' && pseudo(3).backgroundImage.includes('linear-gradient'));
    check('unread title alone gets bold weight', getComputedStyle(title(4)).fontWeight === '600' && getComputedStyle(title(1)).fontWeight === '400');
    check('idle titles recede', getComputedStyle(title(0)).color !== getComputedStyle(title(1)).color);
    rows[0].classList.add('bg-surface-selected');
    check('selected idle title restores foreground', getComputedStyle(title(0)).color === getComputedStyle(title(1)).color);
    rows[0].classList.remove('bg-surface-selected');
    check('unrecognized statuses retain native glyph', getComputedStyle(links[5].children[2]).visibility === 'visible' && getComputedStyle(links[6].children[2]).visibility === 'visible' && pseudo(5).content === 'none');
    check('all status slots lead the title', links.slice(1, 7).every((link) => link.children[2].getBoundingClientRect().right <= title(1).getBoundingClientRect().left));
    check('shared glyphs align to title centers', [1, 2, 3, 4].every((index) => Math.abs(parseFloat(pseudo(index).marginTop) + parseFloat(pseudo(index).height) / 2 - title(index).getBoundingClientRect().height / 2) < 0.6));
    check('timestamp shares the bottom metadata line', getComputedStyle(metadata(0), '::after').content === '"4m ago"' && getComputedStyle(metadata(0), '::after').flexShrink === '0');
    check('branch truncates in flexible context slot', metadata(7).getAttribute('data-recent-thread-context').includes('room/a-very-long') && getComputedStyle(metadata(7), '::before').textOverflow === 'ellipsis');
    check('idle cloud keeps its cloud cue', pseudo(8).maskImage.includes('svg'));
    check('complete idle thread shows a check', pseudo(10).content.includes('✓'));
    check('child indentation and toggle retained', links[9].style.paddingLeft === '24px' && rows[9].querySelector('button').getBoundingClientRect().width >= 44);
    check('row height and viewport fit preserved', rows.every((row) => row.getBoundingClientRect().height === 60) && document.documentElement.scrollWidth <= innerWidth);
  } else {
    check('desktop provider tile preserved', getComputedStyle(links[0].firstElementChild).display !== 'none');
    check('desktop metadata and statuses preserved', getComputedStyle(metadata(0).lastElementChild).display !== 'none' && getComputedStyle(links[1].children[2]).visibility === 'visible' && pseudo(1).content === 'none');
  }
  metadata(0).title = 'project · worktree · 9m ago';
  tagMobileRecentRows(hints);
  check('in-place timestamp and workspace updates', metadata(0).getAttribute('data-recent-thread-context') === 'project · worktree' && metadata(0).getAttribute('data-recent-thread-time') === '9m ago');
  metadata(0).title = 'just now';
  tagMobileRecentRows(hints);
  check('projectless metadata supported', metadata(0).getAttribute('data-recent-thread-context') === '' && metadata(0).getAttribute('data-recent-thread-time') === 'just now');
  links[0].href = '/threads/thr_unknown';
  tagMobileRecentRows(hints);
  check('missing or newly navigated threads use unknown progress', rows[0].getAttribute(PROGRESS_ATTRIBUTE) === 'none');
  clearMobileRecentAttributes();
  for (const row of rows) row.removeAttribute(PROGRESS_ATTRIBUTE);
  style.remove();
  check('disposal restores native DOM and styling', !fixture.querySelector('[data-recent-thread-context], [data-recent-thread-time]') && getComputedStyle(links[0].firstElementChild).display !== 'none');
  return {passed:results.length, checks:results};
}
