"""Exercise CI's fail-closed change decision and required-job gate."""

from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import ci_changes  # noqa: E402
import ci_gate  # noqa: E402


class ChangeClassifierTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.repo = Path(self.directory.name)
        self.git("init", "-q")
        self.git("config", "user.email", "ci@example.invalid")
        self.git("config", "user.name", "CI Test")
        self.write("README.md", "old\n")
        self.write("src/app.ts", "old\n")
        self.git("add", "--all")
        self.git("commit", "-qm", "base")
        self.base = self.git("rev-parse", "HEAD").strip()

    def git(self, *args):
        return subprocess.check_output(["git", *args], cwd=self.repo, text=True)

    def write(self, name, content):
        path = self.repo / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    def commit(self):
        self.git("add", "--all")
        self.git("commit", "-qm", "change")
        return self.git("rev-parse", "HEAD").strip()

    def classify(self, head):
        with patch.object(ci_changes, "run_git", side_effect=lambda *args: subprocess.check_output(["git", *args], cwd=self.repo, stderr=subprocess.DEVNULL)):
            return ci_changes.classify("pull_request", self.base, head)

    def test_ordinary_docs_only(self):
        self.write("README.md", "new\n")
        self.write("docs/guide with spaces.md", "text\n")
        self.write("docs/unicode-é.md", "text\n")
        self.assertTrue(self.classify(self.commit()))
        with patch.object(ci_changes, "classify", return_value=True):
            self.assertFalse(ci_changes.run_app("pull_request", self.base, "head"))

    def test_mixed_and_instruction_paths_require_app(self):
        for path in ("src/app.ts", "AGENTS.md", "docs/AGENTS.md", "docs/nested/AGENTS.md",
                     "docs/odd\nname.md", "docs/odd\udcff.md", ".github/workflows/ci.yml", "docs/info.MD"):
            with self.subTest(path=path):
                self.assertFalse(ci_changes.is_document(path))
        self.write("docs/guide.md", "text\n")
        self.write("src/app.ts", "new\n")
        self.assertFalse(self.classify(self.commit()))

    def test_rename_from_code_to_docs_still_requires_app(self):
        (self.repo / "docs").mkdir()
        self.git("mv", "src/app.ts", "docs/app.md")
        self.assertFalse(self.classify(self.commit()))

    def test_deletion_and_empty_diff(self):
        self.assertFalse(self.classify(self.base))
        (self.repo / "src/app.ts").unlink()
        self.assertFalse(self.classify(self.commit()))

    def test_events_invalid_refs_and_git_failure_require_app(self):
        with patch.object(ci_changes, "run_git", side_effect=FileNotFoundError):
            self.assertFalse(ci_changes.classify("pull_request", self.base, self.base))
        self.assertFalse(self.classify("invalid-ref"))
        self.assertFalse(ci_changes.classify("push", self.base, self.base))
        self.assertFalse(ci_changes.classify("workflow_dispatch", self.base, self.base))
        self.assertFalse(ci_changes.classify("pull_request", "", self.base))
        with patch.object(ci_changes, "classify", return_value=False):
            self.assertTrue(ci_changes.run_app("push", self.base, self.base))


class GateTests(unittest.TestCase):
    def expected(self, run_app):
        value = "success" if run_app == "true" else "skipped"
        return {"CLASSIFIER_RESULT": "success", "REPOSITORY_RESULT": "success", "RUN_APP": run_app,
                **{job: value for job in ci_gate.APP_JOBS}}

    def test_only_expected_results_pass(self):
        self.assertTrue(ci_gate.accepted(self.expected("true")))
        self.assertTrue(ci_gate.accepted(self.expected("false")))
        for decision in ("true", "false"):
            for job in ci_gate.APP_JOBS:
                for result in ("failure", "cancelled", "skipped", "success", ""):
                    if result == ("success" if decision == "true" else "skipped"):
                        continue
                    with self.subTest(decision=decision, job=job, result=result):
                        values = self.expected(decision)
                        values[job] = result
                        self.assertFalse(ci_gate.accepted(values))

    def test_classifier_repository_and_output_must_be_valid(self):
        for key, value in (("CLASSIFIER_RESULT", "failure"), ("CLASSIFIER_RESULT", "cancelled"),
                           ("REPOSITORY_RESULT", "failure"), ("REPOSITORY_RESULT", "skipped"),
                           ("RUN_APP", ""), ("RUN_APP", "TRUE")):
            with self.subTest(key=key, value=value):
                values = self.expected("true")
                values[key] = value
                self.assertFalse(ci_gate.accepted(values))


if __name__ == "__main__":
    unittest.main()
