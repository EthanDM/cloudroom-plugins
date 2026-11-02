"""Contracts that prevent a successful build or stale evidence from implying health."""
import importlib.util
from datetime import datetime, timezone, timedelta
from pathlib import Path
import unittest
import os
import signal
import subprocess
import sys
import tempfile
import time

spec = importlib.util.spec_from_file_location("plugin_check", Path(__file__).parents[1] / "scripts/check-plugins.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class EvidenceTests(unittest.TestCase):
    def setUp(self):
        self.cases = [{"id": "behavior", "description": "Exercise actual behavior"}]
        self.runtime = {"version": "139.0.0", "server_name": "edm-node", "frontend_entrypoint": "/assets/current.js"}
        self.installed = {"app": {"bundle": {"hash": "tested-hash"}}}
        self.evidence = {"schema_version": 1, "fresh_document": True, "client_entrypoint": "/assets/current.js", "captured_at": datetime.now(timezone.utc).isoformat(), "runtime_version": "139.0.0", "server_name": "edm-node", "plugins": {"example": {"bundle_hash": "tested-hash", "active_bundle_hash": "tested-hash", "checks": {"behavior": module.check("passed", "Observed in the app")}}}}

    def merge(self):
        return module.browser_checks(self.evidence, "example", self.cases, self.runtime, self.installed)

    def test_builds_do_not_substitute_for_behavior(self):
        checks = {"build": module.check("passed", "Built"), **module.browser_checks(None, "example", self.cases, self.runtime, self.installed)}
        self.assertEqual(module.verdict(checks), "untested")

    def test_failure_wins_over_missing_execution(self):
        self.assertEqual(module.verdict({"build": module.check("failed", "Compiler error"), "browser": module.check("untested", "No browser")}), "failed")

    def test_matching_evidence_is_accepted(self):
        self.assertEqual(self.merge()["behavior"]["status"], "passed")

    def test_evidence_from_another_server_release_or_bundle_is_rejected(self):
        for field, replacement in [("server_name", "edm-mbp"), ("runtime_version", "140.0.0")]:
            with self.subTest(field=field):
                original = self.evidence[field]
                self.evidence[field] = replacement
                self.assertEqual(self.merge()["behavior"]["status"], "untested")
                self.evidence[field] = original
        self.evidence["plugins"]["example"]["bundle_hash"] = "old-bundle"
        self.assertEqual(self.merge()["behavior"]["status"], "untested")

    def test_stale_or_naive_timestamps_are_not_accepted(self):
        for timestamp in [(datetime.now(timezone.utc) - timedelta(hours=2)).isoformat(), datetime.now().isoformat()]:
            self.evidence["captured_at"] = timestamp
            self.assertEqual(self.merge()["behavior"]["status"], "untested")

    def test_missing_cases_do_not_pass(self):
        self.evidence["plugins"]["example"]["checks"].clear()
        self.assertEqual(self.merge()["behavior"]["status"], "untested")

    def test_failed_browser_check_stays_failed(self):
        self.evidence["plugins"]["example"]["checks"]["behavior"] = module.check("failed", "Error row was hidden")
        self.assertEqual(module.verdict(self.merge()), "failed")

    def test_unsupported_schema_and_malformed_checks_are_not_accepted(self):
        self.evidence["schema_version"] = 2
        self.assertEqual(self.merge()["behavior"]["status"], "untested")
        self.evidence["schema_version"] = 1
        self.evidence["plugins"]["example"]["checks"] = []
        self.assertEqual(self.merge()["behavior"]["status"], "untested")

    def test_backend_hash_does_not_substitute_for_active_frontend(self):
        self.evidence["plugins"]["example"]["active_bundle_hash"] = None
        self.assertEqual(self.merge()["behavior"]["status"], "untested")
        self.evidence["plugins"]["example"]["active_bundle_hash"] = "tested-hash"
        self.evidence["client_entrypoint"] = "/assets/previous.js"
        self.assertEqual(self.merge()["behavior"]["status"], "untested")
        self.evidence["client_entrypoint"] = "/assets/current.js"
        self.evidence["fresh_document"] = False
        self.assertEqual(self.merge()["behavior"]["status"], "untested")

    def test_entry_module_parser_ignores_inline_boot_scripts(self):
        parser = module.EntryModuleParser()
        parser.feed('<script>boot()</script><script type="module" src="/assets/current.js?v=2"></script>')
        self.assertEqual(parser.entrypoint, "/assets/current.js?v=2")

    def test_timeout_terminates_descendants_even_when_parent_exits(self):
        with tempfile.TemporaryDirectory() as directory:
            pid_file = Path(directory) / "child.pid"
            child = "import signal,time;signal.signal(signal.SIGTERM,signal.SIG_IGN);time.sleep(30)"
            parent = ("import subprocess,sys,time;from pathlib import Path;"
                      f"p=subprocess.Popen([sys.executable,'-c',{child!r}],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);"
                      f"Path({str(pid_file)!r}).write_text(str(p.pid));time.sleep(30)")
            result = module.command([sys.executable, "-c", parent], timeout=0.3)
            self.assertEqual(result.returncode, 124)
            pid = int(pid_file.read_text())
            try:
                # A killed orphan can briefly remain as a zombie before init reaps it.
                for _ in range(20):
                    state = subprocess.run(["ps", "-o", "stat=", "-p", str(pid)], capture_output=True, text=True).stdout.strip()
                    if not state or state.startswith("Z"):
                        break
                    time.sleep(0.01)
                self.assertTrue(not state or state.startswith("Z"), f"descendant still running: {pid}")
            finally:
                if state and not state.startswith("Z"):
                    os.kill(pid, signal.SIGKILL)

    def test_missing_command_and_timeout_are_reported_as_failures(self):
        result = module.command(["/nonexistent/plugin-check-command"])
        self.assertNotEqual(result.returncode, 0)
        result = module.command([__import__("sys").executable, "-c", "import time; time.sleep(2)"], timeout=0.01)
        self.assertNotEqual(result.returncode, 0)


if __name__ == "__main__":
    unittest.main()
