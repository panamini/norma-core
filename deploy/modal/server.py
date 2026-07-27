"""Authenticated Modal Server process for pinned SAM 3 image inference."""

from __future__ import annotations

import io
import json
import os
import threading
from contextlib import asynccontextmanager
from typing import Any

import numpy as np
import torch
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from huggingface_hub import hf_hub_download
from PIL import Image, ImageOps, UnidentifiedImageError
from sam3.model.sam3_image_processor import Sam3Processor
from sam3.model_builder import build_sam3_image_model

from contract import (
    ContractError,
    MAX_IMAGE_PIXELS,
    MAX_REQUEST_BYTES,
    MODEL_FILENAME,
    MODEL_REPO_ID,
    MODEL_REVISION,
    abstained_response,
    ready_response,
    validate_request,
)

_INFERENCE_LOCK = threading.Lock()
_MODEL = None
_PROCESSOR = None
_INTERACTIVE_PREDICTOR = None


def _load_model_once() -> None:
    global _MODEL, _PROCESSOR, _INTERACTIVE_PREDICTOR
    if _MODEL is not None:
        return
    token = os.environ.get("HF_TOKEN")
    if not token:
        raise RuntimeError("HF_TOKEN is required")
    checkpoint_path = hf_hub_download(
        repo_id=MODEL_REPO_ID,
        filename=MODEL_FILENAME,
        revision=MODEL_REVISION,
        token=token,
    )
    model = build_sam3_image_model(
        checkpoint_path=checkpoint_path,
        load_from_HF=False,
        device="cuda",
        eval_mode=True,
        enable_segmentation=True,
        enable_inst_interactivity=True,
        compile=False,
    )
    _MODEL = model
    _PROCESSOR = Sam3Processor(model)
    _INTERACTIVE_PREDICTOR = model.inst_interactive_predictor
    if _INTERACTIVE_PREDICTOR is None:
        raise RuntimeError("SAM 3 interactive image predictor is unavailable")


@asynccontextmanager
async def _lifespan(_: FastAPI):
    _load_model_once()
    yield


app = FastAPI(
    title="Norma SAM 3 perception",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=_lifespan,
)


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/readyz")
async def readyz() -> JSONResponse:
    status = 200 if _MODEL is not None else 503
    return JSONResponse({"status": "ready" if status == 200 else "starting"}, status_code=status)


@app.post("/")
async def segment(request: Request) -> JSONResponse:
    try:
        payload = validate_request(await _read_bounded_json(request))
        image = _decode_bounded_image(
            payload["imageBytes"],
            payload["sourceImageMediaType"],
        )
        with _INFERENCE_LOCK, torch.inference_mode(), torch.autocast(
            device_type="cuda",
            dtype=torch.bfloat16,
        ):
            mask, confidence = _infer(image, payload["prompt"])
        if mask is None:
            response = abstained_response(payload, "no_mask")
        else:
            try:
                response = ready_response(payload, mask.tolist(), confidence)
            except ContractError:
                response = abstained_response(payload, "ambiguous")
        return JSONResponse(response)
    except ContractError:
        return JSONResponse({"error": "invalid_request"}, status_code=400)
    except (UnidentifiedImageError, OSError, ValueError):
        return JSONResponse({"error": "invalid_image"}, status_code=400)
    except Exception:
        return JSONResponse({"error": "inference_failed"}, status_code=500)


async def _read_bounded_json(request: Request) -> Any:
    media_type = request.headers.get("content-type", "").split(";", 1)[0].strip().lower()
    if media_type != "application/json":
        raise ContractError("invalid content type")
    declared_length = request.headers.get("content-length")
    if declared_length is not None:
        try:
            if int(declared_length) > MAX_REQUEST_BYTES:
                raise ContractError("request exceeds byte limit")
        except ValueError as error:
            raise ContractError("invalid content length") from error
    chunks: list[bytes] = []
    length = 0
    async for chunk in request.stream():
        length += len(chunk)
        if length > MAX_REQUEST_BYTES:
            raise ContractError("request exceeds byte limit")
        chunks.append(chunk)
    try:
        return json.loads(
            b"".join(chunks),
            object_pairs_hook=_strict_json_object,
        )
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise ContractError("invalid json") from error


def _strict_json_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    value: dict[str, Any] = {}
    for key, item in pairs:
        if key in value:
            raise ContractError("duplicate json field")
        value[key] = item
    return value


def _decode_bounded_image(
    image_bytes: bytes,
    expected_media_type: str,
) -> Image.Image:
    image = Image.open(io.BytesIO(image_bytes))
    width, height = image.size
    if width < 2 or height < 2 or width * height > MAX_IMAGE_PIXELS:
        raise ContractError("image dimensions exceed limit")
    expected_types = {
        "PNG": {"image/png"},
        "JPEG": {"image/jpeg", "image/jpg"},
        "WEBP": {"image/webp"},
    }.get(image.format or "", set())
    if expected_media_type not in expected_types:
        raise ContractError("image media type does not match decoded format")
    image.verify()
    image = Image.open(io.BytesIO(image_bytes))
    image = ImageOps.exif_transpose(image).convert("RGB")
    image.thumbnail((512, 512), Image.Resampling.LANCZOS)
    if image.width * image.height > 262_144:
        raise ContractError("normalized image dimensions exceed limit")
    return image


def _infer(
    image: Image.Image,
    prompt: dict[str, Any],
) -> tuple[np.ndarray | None, float | None]:
    if prompt["kind"] == "text":
        state = _PROCESSOR.set_image(image)
        output = _PROCESSOR.set_text_prompt(prompt=prompt["text"], state=state)
        masks = output["masks"]
        scores = output["scores"]
        if len(masks) == 0:
            return None, None
        index = int(torch.argmax(scores).item())
        mask = masks[index, 0].detach().to("cpu").numpy().astype(bool)
        return mask, float(scores[index].detach().to("cpu").item())

    _INTERACTIVE_PREDICTOR.set_image(image)
    points = prompt["points"]
    point_coords = (
        np.asarray(
            [[point["x"] * image.width, point["y"] * image.height] for point in points],
            dtype=np.float32,
        )
        if points
        else None
    )
    point_labels = (
        np.asarray([1 if point["label"] == "include" else 0 for point in points], dtype=np.int32)
        if points
        else None
    )
    box_value = prompt["box"]
    box = (
        np.asarray(
            [
                box_value["x"] * image.width,
                box_value["y"] * image.height,
                (box_value["x"] + box_value["width"]) * image.width,
                (box_value["y"] + box_value["height"]) * image.height,
            ],
            dtype=np.float32,
        )
        if box_value is not None
        else None
    )
    masks, scores, _ = _INTERACTIVE_PREDICTOR.predict(
        point_coords=point_coords,
        point_labels=point_labels,
        box=box,
        multimask_output=True,
        return_logits=False,
        normalize_coords=True,
    )
    if len(masks) == 0:
        return None, None
    index = int(np.argmax(scores))
    return masks[index].astype(bool), float(scores[index])
