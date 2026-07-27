"""Provider boundary validation for the private SAM 3 Modal Server."""

from __future__ import annotations

import base64
import binascii
import hashlib
import json
import re
from collections.abc import Iterable, Mapping, Sequence
from typing import Any

REQUEST_CONTRACT_ID = "norma.personal-visual-harmony-segmentation-request@1"
RESPONSE_CONTRACT_ID = "norma.personal-visual-harmony-segmentation-response@1"
MASK_CONTRACT_ID = "norma.personal-visual-harmony-segmentation-mask@1"
MODEL_REPO_ID = "facebook/sam3"
MODEL_REVISION = "3c879f39826c281e95690f02c7821c4de09afae7"
MODEL_FILENAME = "sam3.pt"
MODEL_CODE_REVISION = "46957e47805eaa273f4aa7bbbd25a88bca9108ce"
MAX_REQUEST_BYTES = 17 * 1024 * 1024
MAX_IMAGE_BYTES = 12 * 1024 * 1024
MAX_IMAGE_PIXELS = 16_777_216
MAX_MASK_PIXELS = 262_144
MAX_MASK_RUNS = 65_536
MAX_PROMPT_POINTS = 16
SHA256_PATTERN = re.compile(r"^sha256:[0-9a-f]{64}$")
MEDIA_TYPE_PATTERN = re.compile(r"^image/[a-z0-9.+-]{1,63}$")


class ContractError(ValueError):
    """A deliberately redacted client-contract error."""


def validate_request(value: Any) -> dict[str, Any]:
    request = _exact_mapping(
        value,
        {
            "contractId",
            "contractVersion",
            "requestIdentity",
            "sourceImageContentIdentity",
            "sourceImageMediaType",
            "imageBase64",
            "prompt",
        },
        "request",
    )
    if (
        request["contractId"] != REQUEST_CONTRACT_ID
        or request["contractVersion"] != 1
        or not _is_sha256(request["requestIdentity"])
        or not _is_sha256(request["sourceImageContentIdentity"])
    ):
        raise ContractError("invalid request contract")
    media_type = request["sourceImageMediaType"]
    if not isinstance(media_type, str) or MEDIA_TYPE_PATTERN.fullmatch(media_type) is None:
        raise ContractError("invalid image media type")
    encoded = request["imageBase64"]
    if not isinstance(encoded, str) or len(encoded) > ((MAX_IMAGE_BYTES + 2) // 3) * 4:
        raise ContractError("image exceeds byte limit")
    try:
        image_bytes = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError) as error:
        raise ContractError("invalid image encoding") from error
    if not image_bytes or len(image_bytes) > MAX_IMAGE_BYTES:
        raise ContractError("image exceeds byte limit")
    canonical = base64.b64encode(image_bytes).decode("ascii")
    if canonical != encoded:
        raise ContractError("image encoding is not canonical")
    content_identity = f"sha256:{hashlib.sha256(image_bytes).hexdigest()}"
    if content_identity != request["sourceImageContentIdentity"]:
        raise ContractError("source image identity mismatch")
    prompt = validate_prompt(request["prompt"])
    return {
        "requestIdentity": request["requestIdentity"],
        "sourceImageContentIdentity": content_identity,
        "sourceImageMediaType": media_type,
        "imageBytes": image_bytes,
        "prompt": prompt,
    }


def validate_prompt(value: Any) -> dict[str, Any]:
    if not isinstance(value, Mapping):
        raise ContractError("invalid prompt")
    if value.get("kind") == "text":
        prompt = _exact_mapping(value, {"kind", "text"}, "text prompt")
        text = prompt["text"]
        if not isinstance(text, str) or not text.strip() or len(text) > 500:
            raise ContractError("invalid text prompt")
        return {"kind": "text", "text": text}
    prompt = _exact_mapping(value, {"kind", "points", "box"}, "interactive prompt")
    if prompt["kind"] != "interactive":
        raise ContractError("invalid prompt kind")
    points_value = prompt["points"]
    if not isinstance(points_value, Sequence) or isinstance(points_value, (str, bytes)):
        raise ContractError("invalid prompt points")
    if len(points_value) > MAX_PROMPT_POINTS:
        raise ContractError("too many prompt points")
    points: list[dict[str, Any]] = []
    for value_point in points_value:
        point = _exact_mapping(value_point, {"x", "y", "label"}, "prompt point")
        if (
            not _is_normalized(point["x"])
            or not _is_normalized(point["y"])
            or point["label"] not in {"include", "exclude"}
        ):
            raise ContractError("invalid prompt point")
        points.append(
            {"x": float(point["x"]), "y": float(point["y"]), "label": point["label"]}
        )
    box = None if prompt["box"] is None else _validate_box(prompt["box"])
    if box is None and not any(point["label"] == "include" for point in points):
        raise ContractError("interactive prompt needs positive evidence")
    return {"kind": "interactive", "points": points, "box": box}


def encode_mask_rle(mask: Sequence[Sequence[Any]]) -> dict[str, Any]:
    if not isinstance(mask, Sequence) or isinstance(mask, (str, bytes)) or not mask:
        raise ContractError("invalid mask")
    height = len(mask)
    first_row = mask[0]
    if not isinstance(first_row, Sequence) or isinstance(first_row, (str, bytes)) or not first_row:
        raise ContractError("invalid mask")
    width = len(first_row)
    if width * height > MAX_MASK_PIXELS:
        raise ContractError("mask exceeds pixel limit")
    runs: list[dict[str, int]] = []
    for y, row in enumerate(mask):
        if (
            not isinstance(row, Sequence)
            or isinstance(row, (str, bytes))
            or len(row) != width
        ):
            raise ContractError("mask rows must be rectangular")
        start = None
        for x, selected in enumerate(row):
            active = bool(selected)
            if active and start is None:
                start = x
            if not active and start is not None:
                runs.append({"y": y, "startX": start, "endXExclusive": x})
                start = None
        if start is not None:
            runs.append({"y": y, "startX": start, "endXExclusive": width})
        if len(runs) > MAX_MASK_RUNS:
            raise ContractError("mask exceeds run limit")
    if not runs:
        raise ContractError("mask is empty")
    return {
        "contractId": MASK_CONTRACT_ID,
        "contractVersion": 1,
        "width": width,
        "height": height,
        "runs": runs,
    }


def ready_response(
    request: Mapping[str, Any],
    mask: Sequence[Sequence[Any]],
    confidence: float | None,
) -> dict[str, Any]:
    if confidence is not None and (
        isinstance(confidence, bool) or not 0 <= float(confidence) <= 1
    ):
        raise ContractError("invalid confidence")
    return {
        "contractId": RESPONSE_CONTRACT_ID,
        "contractVersion": 1,
        "status": "ready",
        "requestIdentity": request["requestIdentity"],
        "sourceImageContentIdentity": request["sourceImageContentIdentity"],
        "provider": {
            "providerId": "modal-sam3",
            "modelId": MODEL_REPO_ID,
            "modelVersion": MODEL_REVISION,
        },
        "mask": encode_mask_rle(mask),
        "providerConfidence": None if confidence is None else float(confidence),
        "abstentionReason": None,
    }


def abstained_response(
    request: Mapping[str, Any],
    reason: str,
) -> dict[str, Any]:
    if reason not in {"no_mask", "ambiguous"}:
        raise ContractError("invalid abstention reason")
    return {
        "contractId": RESPONSE_CONTRACT_ID,
        "contractVersion": 1,
        "status": "abstained",
        "requestIdentity": request["requestIdentity"],
        "sourceImageContentIdentity": request["sourceImageContentIdentity"],
        "provider": {
            "providerId": "modal-sam3",
            "modelId": MODEL_REPO_ID,
            "modelVersion": MODEL_REVISION,
        },
        "mask": None,
        "providerConfidence": None,
        "abstentionReason": reason,
    }


def canonical_json_bytes(value: Any) -> bytes:
    return json.dumps(
        value,
        ensure_ascii=True,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")


def _validate_box(value: Any) -> dict[str, float]:
    box = _exact_mapping(value, {"x", "y", "width", "height"}, "prompt box")
    if (
        not _is_normalized(box["x"])
        or not _is_normalized(box["y"])
        or not _is_positive_unit(box["width"])
        or not _is_positive_unit(box["height"])
        or float(box["x"]) + float(box["width"]) > 1
        or float(box["y"]) + float(box["height"]) > 1
    ):
        raise ContractError("invalid prompt box")
    return {field: float(box[field]) for field in ("x", "y", "width", "height")}


def _exact_mapping(
    value: Any,
    keys: set[str],
    field: str,
) -> Mapping[str, Any]:
    if not isinstance(value, Mapping) or set(value) != keys:
        raise ContractError(f"invalid {field}")
    return value


def _is_sha256(value: Any) -> bool:
    return isinstance(value, str) and SHA256_PATTERN.fullmatch(value) is not None


def _is_normalized(value: Any) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and 0 <= float(value) <= 1
    )


def _is_positive_unit(value: Any) -> bool:
    return _is_normalized(value) and float(value) > 0
