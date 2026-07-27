"""Deployment definition only; running this file does not deploy by itself."""

from __future__ import annotations

import os
import subprocess

import modal

from contract import MODEL_CODE_REVISION

APP_NAME = "norma-sam3-perception"
HF_SECRET_NAME = "norma-sam3-hf"

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git")
    .run_commands(
        "python -m pip install --no-cache-dir "
        "torch==2.10.0 torchvision==0.25.0 "
        "--index-url https://download.pytorch.org/whl/cu128"
    )
    .pip_install(
        "fastapi==0.116.1",
        "huggingface-hub==0.34.4",
        "numpy==1.26.4",
        "pillow==11.3.0",
        "uvicorn==0.35.0",
    )
    .pip_install(
        f"git+https://github.com/facebookresearch/sam3.git@{MODEL_CODE_REVISION}"
    )
    .add_local_python_source("contract")
    .add_local_dir("deploy/modal", remote_path="/opt/norma-sam3")
)

app = modal.App(APP_NAME)


@app.server(
    image=image,
    secrets=[modal.Secret.from_name(HF_SECRET_NAME, required_keys=["HF_TOKEN"])],
    gpu="L4",
    target_concurrency=1,
    min_containers=0,
    max_containers=2,
    scaledown_window=300,
    startup_timeout=900,
    port=8000,
    unauthenticated=False,
    exit_grace_period=30,
)
class NormaSam3Server:
    @modal.enter()
    def start(self) -> None:
        environment = {
            **os.environ,
            "PYTHONPATH": "/opt/norma-sam3",
            "HF_HOME": "/tmp/norma-sam3-hf",
            "TOKENIZERS_PARALLELISM": "false",
        }
        self.process = subprocess.Popen(
            [
                "python",
                "-m",
                "uvicorn",
                "server:app",
                "--host",
                "0.0.0.0",
                "--port",
                "8000",
                "--no-access-log",
                "--log-level",
                "warning",
            ],
            cwd="/opt/norma-sam3",
            env=environment,
        )

    @modal.exit()
    def stop(self) -> None:
        self.process.terminate()
        self.process.wait(timeout=20)
