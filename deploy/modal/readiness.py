"""Small, dependency-free state machine for the SAM 3 model lifecycle."""

from __future__ import annotations

from threading import Lock
from typing import Literal

ReadinessStatus = Literal["starting", "loading", "ready", "failed"]


class ModelReadiness:
    """Publish readiness only after every model dependency is initialized."""

    def __init__(self) -> None:
        self._lock = Lock()
        self._status: ReadinessStatus = "starting"

    def begin_loading(self) -> bool:
        with self._lock:
            if self._status != "starting":
                return False
            self._status = "loading"
            return True

    def mark_ready(self) -> None:
        with self._lock:
            if self._status != "loading":
                raise RuntimeError("model readiness cannot become ready from its current state")
            self._status = "ready"

    def mark_failed(self) -> None:
        with self._lock:
            if self._status != "loading":
                raise RuntimeError("model readiness cannot fail from its current state")
            self._status = "failed"

    def status(self) -> ReadinessStatus:
        with self._lock:
            return self._status
