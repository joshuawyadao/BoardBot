"""End-to-end checks for the public repository verifier."""

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "verify_repository.py"
sys.path.insert(0, str(SCRIPT.parent))
from verify_repository import REQUIRED_FILES  # noqa: E402


class RepositoryVerifierTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.repo = Path(self.temporary.name) / "repo"
        self.repo.mkdir()
        subprocess.run(["git", "init", "-q", str(self.repo)], check=True)
        for relative in REQUIRED_FILES:
            path = self.repo / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("placeholder\n", encoding="utf-8")
        (self.repo / ".gitignore").write_text(".env\n", encoding="utf-8")
        self.git("add", ".")

    def git(self, *args):
        subprocess.run(["git", "-C", str(self.repo), *args], check=True, stdout=subprocess.PIPE)

    def check(self):
        return subprocess.run(
            [sys.executable, str(SCRIPT), str(self.repo)],
            capture_output=True,
            text=True,
            check=False,
        )

    def test_valid_fixture_with_external_and_local_links(self):
        (self.repo / "docs" / "My Guide.md").write_text("guide\n", encoding="utf-8")
        (self.repo / "README.md").write_text(
            "[guide](<docs/My Guide.md>) [encoded](docs/My%20Guide.md) "
            "[web](https://example.com) [mail](mailto:hello@example.com) "
            "[section](#intro) ![image](<docs/My Guide.md>)\n",
            encoding="utf-8",
        )
        self.assertEqual(self.check().returncode, 0)

    def test_missing_required_document_fails(self):
        (self.repo / "docs" / "Architecture.md").unlink()
        result = self.check()
        self.assertEqual(result.returncode, 1)
        self.assertIn("Missing or unsafe required file: docs/Architecture.md", result.stderr)

    def test_broken_relative_link_fails(self):
        (self.repo / "README.md").write_text("[missing](docs/nope.md)\n", encoding="utf-8")
        result = self.check()
        self.assertEqual(result.returncode, 1)
        self.assertIn("Broken or unsafe Markdown link in README.md: docs/nope.md", result.stderr)

    def test_forcibly_tracked_ignored_credential_fails(self):
        (self.repo / ".env").write_text("TEST_ONLY=value\n", encoding="utf-8")
        self.git("add", "-f", ".env")
        result = self.check()
        self.assertEqual(result.returncode, 1)
        self.assertIn("Private credential in Git inventory: .env", result.stderr)

    def test_symlink_escaping_repository_fails(self):
        outside = Path(self.temporary.name) / "outside.md"
        outside.write_text("outside\n", encoding="utf-8")
        (self.repo / "docs" / "escape.md").symlink_to(outside)
        self.git("add", "docs/escape.md")
        result = self.check()
        self.assertEqual(result.returncode, 1)
        self.assertIn("Missing or unsafe Git file: docs/escape.md", result.stderr)


if __name__ == "__main__":
    unittest.main()
