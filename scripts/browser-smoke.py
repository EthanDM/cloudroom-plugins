"""Run with browser-harness in your own, already authenticated Cloudroom tab.

    PLUGIN_CHECK_REPO = '/repo'
    exec(open(PLUGIN_CHECK_REPO + '/scripts/browser-smoke.py').read())
    run_browser_smoke('/tmp/plugin-check/browser.json', zoom_reset=True, fresh_load=True)

This does not navigate, log in, change settings, copy to the clipboard, or send messages.
Unexercised matrix cases remain untested. Complete them only after observing them.
"""
from datetime import datetime, timezone
import json
from pathlib import Path


def run_browser_smoke(output_path: str, *, zoom_reset: bool = False, fresh_load: bool = False, contract_verified: bool = False) -> dict:
    if not globals().get("PLUGIN_CHECK_REPO"):
        raise RuntimeError("Set PLUGIN_CHECK_REPO to the plugin repository before loading this script")
    root = Path(PLUGIN_CHECK_REPO).resolve()
    matrix = json.loads((root / "docs/plugin-smoke-cases.json").read_text())
    expression = r'''(async () => {
      if (!document.documentElement.classList.contains('bb-app-shell-root')) throw Error('Select your own Cloudroom app tab first');
      const read = async (path) => {
        const response = await fetch(path);
        if (!response.ok) throw Error(`HTTP ${response.status} for ${path}`);
        return response.json();
      };
      const version = await read('/api/v1/system/version');
      const inventory = await read('/api/v1/plugins');
      const identity = await read('/api/v1/plugins/server-identity/http/identity').catch(() => null);
      const checks = {};
      const record = (plugin, id, passed, evidence) => {
        (checks[plugin] ??= {})[id] = {status: passed ? 'passed' : 'failed', evidence};
      };
      const note = (plugin, id, evidence) => {
        (checks[plugin] ??= {})[id] = {status:'untested', evidence};
      };
      const enabled = (id) => inventory.plugins.some(p => p.id === id && p.enabled && p.status === 'running');
      const visible = (element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
      if (enabled('hide-plan-card')) {
        const selectors = [
          'section[aria-label="Free plan"]', 'section[aria-label="A note from David"]', 'section[aria-label="Move to Cloud"]',
          'p[aria-live="polite"].mt-3.px-3\\.5:has(> [data-icon="Zap"]):has(> button > [data-icon="ArrowRight"])',
          'div[role="status"].absolute.top-full:has(> button > [data-icon="Cloud"]):has(> div > button[aria-label="Dismiss"])',
          'div[role="status"].rounded-full:has(> [data-icon="WifiOff"]):has(> button[aria-label="Dismiss"])'
        ];
        const promos = [...document.querySelectorAll(selectors.join(','))];
        if (promos.length) record('hide-plan-card', 'promo-visibility', promos.every(e => getComputedStyle(e).display === 'none'), `${promos.length} present promo elements inspected; absent variants still need fixture checks`);
        const notices = [...document.querySelectorAll('section[aria-label="Cloud queue"], section[aria-label="Cloud usage limit"], section[aria-label="Cloud disk full"]')];
        if (notices.length) note('hide-plan-card', 'error-visibility', `${notices.length} notice elements found; inspect current visibility and also exercise missing error/billing variants`);
      }
      if (enabled('keep-spinners')) {
        const root = document.documentElement;
        const previous = root.getAttribute('data-window-blurred');
        try {
          root.setAttribute('data-window-blurred', 'true');
          await new Promise(resolve => setTimeout(resolve, 40));
          note('keep-spinners', 'blur-attribute', root.hasAttribute('data-window-blurred')
            ? 'Probe attribute was not cleared; confirm current host attribute contract before fixing'
            : 'Live observer cleared the probe attribute; disposal behavior still needs its fixture check');
        } finally {
          if (previous === null) root.removeAttribute('data-window-blurred');
          else root.setAttribute('data-window-blurred', previous);
        }
      }
      if (enabled('ui-scale')) {
        const desktop = matchMedia('(min-width:768px), (pointer:fine)').matches;
        const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
        const fits = document.documentElement.scrollWidth <= innerWidth + 1 && document.documentElement.scrollHeight <= innerHeight + 2;
        if (desktop && ZOOM_CONFIRMED) record('ui-scale', 'desktop-scale', Math.abs(fontSize - 17.6) < .1 && fits, `Root ${fontSize}px, shell fits viewport: ${fits}; caller confirmed browser zoom 100% (v139 baseline 16px)`);
        else note('ui-scale', desktop ? 'desktop-scale' : 'mobile-scale', `Measured root ${fontSize}px at ${innerWidth}px; ${desktop ? 'reset browser zoom before validating' : 'compare with this plugin disabled, then restore it'}`);
      }
      if (enabled('server-identity')) {
        const button = document.querySelector('[data-testid="plugin-sidebar-footer-item-connect-remote-access"]');
        if (button && visible(button) && identity?.name) {
          const name = identity.name;
          const marker = getComputedStyle(button, '::after');
          const expected = {'edm-node':'rgb(64, 175, 255)', 'edm-mbp':'rgb(197, 240, 0)'}[name];
          const marked = [...document.querySelectorAll('[data-server-identity]')];
          const valid = button.getAttribute('data-server-identity') === name && button.title.includes(name)
            && marked.every(e => e.matches('[data-testid="plugin-sidebar-footer-item-connect-remote-access"]'))
            && parseFloat(marker.width) > 0 && (expected === undefined || marker.backgroundColor === expected);
          record('server-identity', 'server-badge', valid, `Backend ${name}; marker ${marker.backgroundColor}; ${marked.length} marked Connect buttons, no label row`);
        }
      }
      if (enabled('compact-navigation')) {
        const toolbar = document.querySelector('.compact-sidebar-navigation [data-testid="plugin-nav-sidebar-items"]:not([data-sidebar-navigation-customize-mode])');
        if (toolbar && visible(toolbar)) {
          const bounds = toolbar.getBoundingClientRect();
          const buttons = [...toolbar.querySelectorAll('[data-compact-navigation-label]')].filter(visible);
          const fits = buttons.length > 0 && buttons.every(b => {const r=b.getBoundingClientRect();return r.left>=bounds.left-1&&r.right<=bounds.right+1;});
          const rows = new Set(buttons.map(b => Math.round(b.getBoundingClientRect().top))).size;
          const enoughWidth = buttons.reduce((sum,b)=>sum+b.getBoundingClientRect().width,0) + Math.max(0,buttons.length-1)*parseFloat(getComputedStyle(toolbar).columnGap) + 2*parseFloat(getComputedStyle(toolbar).paddingLeft) <= bounds.width + 1;
          record('compact-navigation', 'compact-layout', fits && (!enoughWidth || rows===1), `${buttons.length} visible actions in ${rows} row(s); toolbar ${Math.round(bounds.width)}px wide; fit ${fits}`);
          const decorative = buttons.every(b => b.querySelector('[data-compact-navigation-tooltip][aria-hidden="true"]'));
          if (!decorative) record('compact-navigation', 'navigation-accessibility', false, 'A visible button lacks an aria-hidden tooltip span');
          else note('compact-navigation', 'navigation-accessibility', `Tooltip spans excluded from accessibility tree: ${decorative}; still exercise focus/hover, AX names and touch targets`);
        }
      }
      if (enabled('mobile-fixes')) {
        const entries = ['__bb__/extensions','__bb__/skills'].map(id => document.querySelector(`[data-sidebar-navigation-item="${id}"]`)).filter(Boolean);
        if (entries.length) note('mobile-fixes', 'mobile-navigation', `${innerWidth}px viewport; ${entries.filter(e=>getComputedStyle(e).display==='none').length}/${entries.length} present management entries hidden; verify native preferences and phone/desktop availability`);
      }
      const navigation = performance.getEntriesByType('navigation')[0];
      const freshDocument = FRESH_LOAD && !!navigation && performance.now() - navigation.startTime < 300000;
      const entry = document.querySelector('script[type="module"][src]');
      const entryUrl = entry ? new URL(entry.src) : null;
      const clientEntrypoint = entryUrl ? entryUrl.pathname + entryUrl.search : null;
      const resources = performance.getEntriesByType('resource');
      const samples = Object.fromEntries(inventory.plugins.map(p => {
        const paths = resources.map(r => new URL(r.name,location.href)).filter(u => u.pathname === `/api/v1/plugins/${p.id}/assets/app.js`);
        const hashes = [...new Set(paths.map(u => u.searchParams.get('h')).filter(Boolean))];
        const installedHash = p.app?.bundle?.hash ?? null;
        // A fresh document cannot still execute an earlier generation. An old
        // tab or ambiguous import history must be reloaded, not stamped green.
        const active = freshDocument && hashes.length === 1 && hashes[0] === installedHash ? installedHash : null;
        const observedChecks = checks[p.id] ?? {};
        if (!active) for (const item of Object.values(observedChecks)) {
          item.status = 'untested';
          item.evidence = 'Active bundle not verified in a fresh document. Observation: ' + item.evidence;
        }
        return [p.id, {bundle_hash:installedHash,active_bundle_hash:active,loaded_hashes:hashes,checks:observedChecks}];
      }));
      return {runtime_version:version.currentVersion, server_name:identity?.name ?? null,
        fresh_document:freshDocument,client_entrypoint:clientEntrypoint,
        origin:location.origin, client:navigator.userAgent, viewport:{width:innerWidth,height:innerHeight},
        plugins:samples};
    })()'''.replace("ZOOM_CONFIRMED", "true" if zoom_reset else "false").replace("FRESH_LOAD", "true" if fresh_load else "false")
    response = cdp("Runtime.evaluate", expression=expression, awaitPromise=True, returnByValue=True)
    if "exceptionDetails" in response or "value" not in response.get("result", {}):
        raise RuntimeError("Browser probe failed; verify the selected app tab and authentication")
    observed = response["result"]["value"]
    report = {"schema_version": 1, "captured_at": datetime.now(timezone.utc).isoformat(), **observed}
    if not (observed["runtime_version"].startswith("139.") or contract_verified):
        for plugin in observed["plugins"].values():
            for item in plugin["checks"].values():
                item["status"] = "untested"
                item["evidence"] = "v139 probe contract not yet verified for this release. Observation: " + item["evidence"]
    # Emit the complete required matrix so omitted flows cannot become green.
    for plugin, cases in matrix.items():
        sample = report["plugins"].setdefault(plugin, {"bundle_hash": None, "checks": {}})
        for case in cases:
            sample["checks"].setdefault(case["id"], {"status": "untested", "evidence": case["description"]})
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n")
    print(f"Browser observations: {output}; unexercised cases remain untested")
    return report
