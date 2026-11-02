#!/usr/bin/env python3
"""Inventory the current server and optionally build plugins; never deploy or fix them."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from html.parser import HTMLParser
import os
import signal
from pathlib import Path
import socket
import subprocess
import sys
from urllib.parse import urlparse
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
STATUSES = {"passed", "failed", "untested"}


def command(argv: list[str], cwd: Path = ROOT, timeout: int = 120) -> subprocess.CompletedProcess:
    """Keep command execution bounded and shell-free, including missing executables."""
    if os.name != "posix":
        return subprocess.CompletedProcess(argv, 1, "", "This runner needs POSIX process-group support")
    try:
        process = subprocess.Popen(argv, cwd=cwd, text=True, stdout=subprocess.PIPE,
                                   stderr=subprocess.PIPE, start_new_session=True)
    except OSError as error:
        return subprocess.CompletedProcess(argv, 1, "", str(error))
    try:
        stdout, stderr = process.communicate(timeout=timeout)
        return subprocess.CompletedProcess(argv, process.returncode, stdout, stderr)
    except subprocess.TimeoutExpired:
        # npm and the builder spawn children. Stop the whole group before the
        # next plugin can write artifacts, even when the direct parent exits.
        try:
            os.killpg(process.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        try:
            process.communicate(timeout=1)
        except subprocess.TimeoutExpired:
            pass
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        stdout, stderr = process.communicate()
        return subprocess.CompletedProcess(argv, 124, stdout, stderr + f"\nTimed out after {timeout}s; process group terminated")



def cli_json(*args: str):
    result = command(["room-cli", *args, "--json"])
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return json.loads(result.stdout)


def check(status: str, evidence: str) -> dict:
    return {"status": status, "evidence": evidence}


def verdict(checks: dict) -> str:
    """Missing execution is not success, even when every executed check passed."""
    states = [item["status"] for item in checks.values()]
    if "failed" in states:
        return "failed"
    return "passed" if states and all(state == "passed" for state in states) else "untested"


def browser_checks(evidence: dict | None, plugin_id: str, cases: list[dict], runtime: dict, installed: dict) -> dict:
    """Accept browser evidence only for the same host, release, and installed bundle."""
    missing = {case["id"]: check("untested", case["description"]) for case in cases}
    if not evidence:
        return missing
    try:
        if evidence.get("schema_version") != 1:
            raise ValueError("unsupported browser evidence schema")
        if evidence.get("fresh_document") is not True:
            raise ValueError("open a fresh QA document before collecting browser evidence")
        if not runtime.get("frontend_entrypoint") or evidence.get("client_entrypoint") != runtime["frontend_entrypoint"]:
            raise ValueError("loaded frontend entrypoint differs from the server release")
        captured = datetime.fromisoformat(evidence["captured_at"])
        age = (datetime.now(timezone.utc) - captured).total_seconds()
        if age < -60 or age > 3600:
            raise ValueError("browser evidence must be from this run (within one hour)")
        if evidence["runtime_version"] != runtime["version"]:
            raise ValueError("browser release differs from the inventory")
        if not runtime["server_name"] or evidence["server_name"] != runtime["server_name"]:
            raise ValueError("browser server identity is unavailable or differs")
        sample = evidence["plugins"][plugin_id]
        bundle_hash = ((installed.get("app") or {}).get("bundle") or {}).get("hash")
        if not bundle_hash or sample["bundle_hash"] != bundle_hash or sample.get("active_bundle_hash") != bundle_hash:
            raise ValueError("browser evidence does not match the installed frontend bundle")
        for case in cases:
            item = sample.get("checks", {}).get(case["id"])
            if item is None:
                continue
            if item.get("status") not in STATUSES or not isinstance(item.get("evidence"), str) or not item["evidence"].strip():
                raise ValueError("browser check has an invalid status or empty evidence")
            missing[case["id"]] = item
    except (AttributeError, KeyError, TypeError, ValueError) as error:
        return {case["id"]: check("untested", f"Evidence rejected: {error}") for case in cases}
    return missing


class EntryModuleParser(HTMLParser):
    """Identify the server's shipped entry module, independent of browser caches."""
    def __init__(self):
        super().__init__()
        self.entrypoint = None

    def handle_starttag(self, tag, attributes):
        attributes = dict(attributes)
        if tag == "script" and attributes.get("type") == "module" and attributes.get("src"):
            parsed = urlparse(attributes["src"])
            self.entrypoint = parsed.path + ("?" + parsed.query if parsed.query else "")


def inventory(build: bool = False, evidence: dict | None = None) -> dict:
    registry = json.loads((ROOT / ".bb/plugins.json").read_text())["plugins"]
    matrix = json.loads((ROOT / "docs/plugin-smoke-cases.json").read_text())
    status = cli_json("status")
    server_url = status["serverUrl"].rstrip("/")
    # A local CLI can identify its own server. Remote overrides need an agent
    # to verify identity; guessing from the selected thread's host is unsafe.
    host = urlparse(server_url).hostname
    local = host in {"localhost", "127.0.0.1", "::1"}
    with urlopen(server_url + "/api/v1/system/version", timeout=10) as response:
        version = json.load(response)["currentVersion"]
    runtime = {"version": version, "server_url": server_url,
               "server_name": socket.gethostname().split(".")[0].lower() if local else None,
               "execution_host": socket.gethostname()}
    with urlopen(server_url + "/", timeout=10) as response:
        parser = EntryModuleParser()
        parser.feed(response.read().decode("utf-8"))
    runtime["frontend_entrypoint"] = parser.entrypoint
    installed = {plugin["id"]: plugin for plugin in cli_json("plugin", "list")["plugins"]}
    report = {"schema_version": 1, "captured_at": datetime.now(timezone.utc).isoformat(),
              "runtime": runtime, "repo_commit": command(["git", "rev-parse", "HEAD"]).stdout.strip(),
              "repo_dirty": bool(command(["git", "status", "--porcelain"]).stdout.strip()), "plugins": {}}
    for entry in registry:
        plugin_id = entry["name"]
        path = (ROOT / entry["source"]).resolve()
        if not path.is_relative_to(ROOT):
            raise ValueError(f"Plugin path escapes repository: {plugin_id}")
        live = installed.get(plugin_id, {})
        checks = {}
        if not live:
            checks["installation"] = check("untested", "Not installed on this server")
        elif not live.get("enabled"):
            checks["installation"] = check("untested", "Installed but disabled; do not enable without checking intent")
        else:
            checks["installation"] = check("passed" if live.get("status") == "running" else "failed", live.get("statusDetail") or live.get("status", "unknown"))
        bundle = (live.get("app") or {}).get("bundle") or {}
        checks["sdk_compatibility"] = check("passed" if bundle.get("compatible") is True else "failed" if bundle.get("compatible") is False else "untested", f"Frontend SDK: {bundle.get('sdkVersion', 'unavailable')}")
        steps = [("dependencies", ["npm", "ci"]),
                 ("typecheck", [str(path / "node_modules/.bin/tsc"), "-p", "."]),
                 ("build", ["room-cli", "plugin", "build"])]
        blocked = False
        for name, argv in steps:
            if not build or blocked:
                checks[name] = check("untested", "Run with --build" if not build else "An earlier build step failed")
                continue
            print(f"{plugin_id}: {name}", file=sys.stderr, flush=True)
            result = command(argv, path, 180)
            checks[name] = check("passed" if result.returncode == 0 else "failed", "Command completed" if result.returncode == 0 else (result.stderr or result.stdout)[-4000:])
            blocked = result.returncode != 0
        cases = matrix.get(plugin_id, [])
        if not cases:
            checks["smoke_coverage"] = check("untested", "No smoke matrix for this registered plugin")
        checks.update(browser_checks(evidence, plugin_id, cases, runtime, live))
        report["plugins"][plugin_id] = {"verdict": verdict(checks), "installed_source": live.get("source"),
            "bundle_hash": bundle.get("hash"), "checks": checks}
    report["verdict"] = verdict({key: check(value["verdict"], "") for key, value in report["plugins"].items()})
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--build", action="store_true", help="Install locked dev dependencies, typecheck, and build each plugin sequentially")
    parser.add_argument("--browser-report", type=Path, help="Fresh evidence from browser-smoke.py plus completed manual matrix checks")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        evidence = json.loads(args.browser_report.read_text()) if args.browser_report else None
        report = inventory(args.build, evidence)
    except (OSError, ValueError, KeyError, RuntimeError) as error:
        print(f"Plugin check could not complete: {error}", file=sys.stderr)
        return 1
    payload = json.dumps(report, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload)
        for name, plugin in report["plugins"].items():
            print(f"{name}: {plugin['verdict']}")
        print(f"Evidence: {args.output}")
    else:
        print(payload, end="")
    return {"passed": 0, "failed": 1, "untested": 2}[report["verdict"]]


if __name__ == "__main__":
    raise SystemExit(main())
