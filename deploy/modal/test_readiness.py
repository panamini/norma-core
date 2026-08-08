"""Provider-free tests for the Modal model readiness state machine."""

from __future__ import annotations

import unittest
from pathlib import Path

from deploy.modal.readiness import ModelReadiness


class ModelReadinessTest(unittest.TestCase):
    def test_server_starts_non_blocking_loader_and_gates_http_readiness(self) -> None:
        source = Path(__file__).with_name("server.py").read_text(encoding="utf-8")

        loader_start = source.index("threading.Thread(")
        lifespan_yield = source.index("    yield", loader_start)
        self.assertLess(loader_start, lifespan_yield)
        self.assertIn("target=_load_model_once", source)
        self.assertIn("daemon=True", source)
        self.assertIn('if _READINESS.status() != "ready":', source)
        self.assertIn('"sam3_model_load_failed error_type=%s"', source)

    def test_model_is_not_ready_until_the_complete_bundle_is_published(self) -> None:
        readiness = ModelReadiness()

        self.assertEqual(readiness.status(), "starting")
        self.assertTrue(readiness.begin_loading())
        self.assertEqual(readiness.status(), "loading")
        self.assertFalse(readiness.begin_loading())

        readiness.mark_ready()

        self.assertEqual(readiness.status(), "ready")
        self.assertFalse(readiness.begin_loading())

    def test_load_failure_is_terminal_and_not_reported_as_ready(self) -> None:
        readiness = ModelReadiness()
        readiness.begin_loading()

        readiness.mark_failed()

        self.assertEqual(readiness.status(), "failed")
        self.assertFalse(readiness.begin_loading())


if __name__ == "__main__":
    unittest.main()
