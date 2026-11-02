# Checking plugins after a Cloudroom update

The registry in `.bb/plugins.json` defines the scope. Required behavior cases live
in [plugin-smoke-cases.json](plugin-smoke-cases.json); add cases when adding plugins.
Use the **cloudroom-plugin-check** skill from the canonical `codex-skills` repo to
coordinate inspection, reproduction, repair, landing, and installation.

## Repeatable commands

From a clean task worktree, using the server you intend to check:

```sh
python3 scripts/check-plugins.py --output /tmp/plugin-check/inventory.json
```

This inventories the running server and installed frontend hashes. The final
`--build` command below additionally runs locked dependency installation, full
plugin typecheck, and plugin build sequentially. Run the builds once per unchanged
source state; the initial inventory intentionally leaves them untested.
Timed-out commands terminate their isolated process groups before the next plugin.
It never edits source, fixes issues, enables plugins, upgrades dependencies, pushes,
or installs updated plugins. Exit 0 means all required checks passed, 1 means a
failure, and 2 means required behavior remains untested. A normal first build-only
run therefore exits 2. A build failure is not hidden by later untested cases.

For the non-destructive live probes, read the browser-harness skill, open your own
Cloudroom tab, authenticate through the normal app flow, and reset browser zoom.
Do not reuse a tab the user is working in. Open a new QA tab (or reload your own
QA tab) after the update, wait for plugin mounting, then run the probe within five
minutes. `fresh_load=True` confirms that fresh-document step; omit it for observations
that must remain untested. With the repository path set explicitly:

```python
PLUGIN_CHECK_REPO = '/absolute/path/to/cloudroom-plugins'
exec(open(PLUGIN_CHECK_REPO + '/scripts/browser-smoke.py').read())
run_browser_smoke('/tmp/plugin-check/browser.json', zoom_reset=True, fresh_load=True)
```

Run that through `browser-harness`. The probes inspect the current view; they do
not navigate, change preferences, send messages, or copy anything to the clipboard.
They briefly test the root blur attribute and restore it. Missing UI states stay
untested. They are v139 probes: after an update, compare selectors and assumptions
with the matching shipped markup/source before interpreting failures or expanding
coverage. New release numbers stay untested by default; use
`contract_verified=True` only after verifying/updating the probes against that
release. Never modify the app just to satisfy an obsolete probe.

Exercise the remaining matrix cases in the actual app and record each observed
result and evidence under that plugin's `checks` in the browser report. Keep cases
untested when a needed app, state, permission, device, or interaction is unavailable.
A fixture is evidence for that fixture contract, not a substitute for physical
Safari/desktop/phone behavior. Avoid creating real work or changing data to make
states appear; use matching temporary DOM fixtures in an isolated QA tab when useful.

Merge fresh evidence with inventory and builds:

```sh
python3 scripts/check-plugins.py --build --browser-report /tmp/plugin-check/browser.json --output /tmp/plugin-check/final.json
```

Evidence is accepted only within one hour, for the same running version, backend
hostname, shipped frontend entrypoint, and loaded frontend bundle hash. The probe
requires a fresh document and an unambiguous resource import matching each installed
hash; backend inventory alone cannot identify the code active in an existing tab. A remote CLI server override cannot
be verified from the execution hostname; run on the owning server instead.
After installing a fix, capture new browser evidence for the new bundle.

## High-value manual cases

- **hide-plan-card:** cover all five promotions and all four rotating tips. Also
  insert queue/limit/disk/error controls and prove they stay visible. Check late DOM
  insertion. Hiding a load failure is a regression, not a quiet-UI improvement.
- **sidebar-status:** cover running, needs-input, unread-success/failure, idle,
  complete and unknown progress, cloud icons, stale ages, hover controls, and
  remounts. Switch `No threads` to `Threads unavailable` by changing the existing
  text node. Use raw theme variables only. Check both themes, scaling, reduced
  motion, rapid expansion/collapse, and guide-line alignment.
- **compact-navigation:** inspect native More → Search/Customize, modifier-click
  and split dragging, disabled/selected states, hover/focus labels and AX names.
  Test real touch long-press. The editor keeps its vertical layout and reorder
  controls; direct toolbar sorting is intentionally blocked. Confirm disposal
  removes owned tooltip spans/attributes and stops its observer.
- **server-identity:** compare with the backend, not the browser's machine. Inject
  a temporary Connect alert in the QA DOM; the server dot moves away and the native
  alert/action remains. Test request failure, remount and cleanup. Each independent
  server needs its own identity check.
- **ui-scale/mobile-fixes:** reset browser zoom to 100%; inspect desktop root size
  and overflow. Use a real coarse-pointer phone for mobile baseline and picker
  home-indicator clearance; headless `env(safe-area-inset-bottom)=0` is insufficient.
- **thread-ids:** use a known open thread and verify all three command values.
  Avoid exposing or reading existing clipboard contents. Command registration
  alone is insufficient; mark copy behavior untested if it cannot be exercised.
- **keep-spinners:** test observer cleanup in a fixture and a real running spinner
  in an unfocused desktop window. Safari never supplied the pause behavior, so a
  successful Safari check does not prove desktop functionality.

Record server/version, repo commit/dirty state, installed source/hash, checks,
fixes, final install state, and remaining untested surfaces. Keep screenshots and
reports in thread storage or a task temp directory; do not commit user chat content.
