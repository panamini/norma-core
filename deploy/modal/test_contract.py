"""Provider-free unit tests for the Modal SAM 3 wire contract."""

from __future__ import annotations

import base64
import hashlib
from pathlib import Path
import re
import unittest
from unittest import mock

from deploy.modal import contract


class ModalSam3ContractTest(unittest.TestCase):
    def request(self, image_bytes: bytes = b"bounded-image") -> dict[str, object]:
        return {
            "contractId": contract.REQUEST_CONTRACT_ID,
            "contractVersion": 1,
            "requestIdentity": f"sha256:{'a' * 64}",
            "sourceImageContentIdentity": (
                f"sha256:{hashlib.sha256(image_bytes).hexdigest()}"
            ),
            "sourceImageMediaType": "image/png",
            "imageBase64": base64.b64encode(image_bytes).decode("ascii"),
            "prompt": {
                "kind": "interactive",
                "points": [{"x": 0.5, "y": 0.5, "label": "include"}],
                "box": None,
            },
        }

    def test_request_is_source_bound_and_exact(self) -> None:
        validated = contract.validate_request(self.request())
        self.assertEqual(validated["imageBytes"], b"bounded-image")
        self.assertEqual(validated["prompt"]["kind"], "interactive")

        mismatched = self.request()
        mismatched["sourceImageContentIdentity"] = f"sha256:{'0' * 64}"
        with self.assertRaisesRegex(contract.ContractError, "identity mismatch"):
            contract.validate_request(mismatched)

        unexpected = self.request()
        unexpected["providerPayload"] = "must-not-cross-boundary"
        with self.assertRaisesRegex(contract.ContractError, "invalid request"):
            contract.validate_request(unexpected)

    def test_request_rejects_malformed_and_oversized_image_bytes(self) -> None:
        malformed = self.request()
        malformed["imageBase64"] = "not canonical base64!"
        with self.assertRaises(contract.ContractError):
            contract.validate_request(malformed)

        with mock.patch.object(contract, "MAX_IMAGE_BYTES", 2):
            with self.assertRaisesRegex(contract.ContractError, "byte limit"):
                contract.validate_request(self.request(b"abc"))

    def test_prompt_requires_bounded_positive_evidence(self) -> None:
        with self.assertRaisesRegex(contract.ContractError, "positive evidence"):
            contract.validate_prompt({
                "kind": "interactive",
                "points": [{"x": 0.5, "y": 0.5, "label": "exclude"}],
                "box": None,
            })
        with self.assertRaisesRegex(contract.ContractError, "invalid prompt box"):
            contract.validate_prompt({
                "kind": "interactive",
                "points": [],
                "box": {"x": 0.8, "y": 0.8, "width": 0.3, "height": 0.3},
            })

    def test_mask_rle_is_deterministic_bounded_and_nonempty(self) -> None:
        mask = [
            [False, True, True, False],
            [False, True, False, True],
        ]
        first = contract.encode_mask_rle(mask)
        second = contract.encode_mask_rle(mask)
        self.assertEqual(first, second)
        self.assertEqual(first["runs"], [
            {"y": 0, "startX": 1, "endXExclusive": 3},
            {"y": 1, "startX": 1, "endXExclusive": 2},
            {"y": 1, "startX": 3, "endXExclusive": 4},
        ])
        with self.assertRaisesRegex(contract.ContractError, "empty"):
            contract.encode_mask_rle([[False]])
        with self.assertRaisesRegex(contract.ContractError, "rectangular"):
            contract.encode_mask_rle([[True], [True, False]])
        with mock.patch.object(contract, "MAX_MASK_RUNS", 1):
            with self.assertRaisesRegex(contract.ContractError, "run limit"):
                contract.encode_mask_rle(mask)

    def test_responses_pin_provider_and_never_claim_core_authority(self) -> None:
        request = contract.validate_request(self.request())
        ready = contract.ready_response(request, [[True]], 0.75)
        abstained = contract.abstained_response(request, "ambiguous")
        self.assertEqual(ready["provider"], {
            "providerId": "modal-sam3",
            "modelId": "facebook/sam3",
            "modelVersion": "3c879f39826c281e95690f02c7821c4de09afae7",
        })
        self.assertEqual(ready["status"], "ready")
        self.assertEqual(abstained["status"], "abstained")
        self.assertIsNone(abstained["mask"])
        for response in (ready, abstained):
            self.assertNotIn("acceptedGeometry", response)
            self.assertNotIn("coreRun", response)

    def test_modal_app_explicitly_packages_the_contract_module(self) -> None:
        app_source = Path(__file__).with_name("modal_app.py").read_text(encoding="utf-8")
        self.assertIn('.add_local_python_source("contract", copy=True)', app_source)
        self.assertIn('"einops==0.8.1"', app_source)
        self.assertIn('"psutil==7.0.0"', app_source)
        self.assertIn('"pycocotools==2.0.10"', app_source)
        match = re.search(
            r'^MODEL_CODE_REVISION = "([0-9a-f]{40})"$',
            app_source,
            flags=re.MULTILINE,
        )
        self.assertIsNotNone(match)
        self.assertEqual(match.group(1), contract.MODEL_CODE_REVISION)

    def test_modal_image_bakes_the_pinned_checkpoint_without_warm_capacity(self) -> None:
        app_source = Path(__file__).with_name("modal_app.py").read_text(encoding="utf-8")
        self.assertIn(".run_function(", app_source)
        self.assertIn("_download_model_checkpoint", app_source)
        self.assertIn('.add_local_python_source("contract", copy=True)', app_source)
        self.assertIn('required_keys=["HF_TOKEN"]', app_source)
        self.assertIn("MODEL_CACHE_DIR", app_source)
        self.assertIn('"HF_HOME": MODEL_CACHE_DIR', app_source)
        self.assertIn("min_containers=0", app_source)
        self.assertNotIn("modal.Volume", app_source)


if __name__ == "__main__":
    unittest.main()
