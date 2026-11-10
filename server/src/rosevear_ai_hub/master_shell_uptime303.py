"""Build 303: bounded, loopback-only uptime observations on Ree's original host.

This module does not call Master Shell services, inspect credentials, execute
automation actions, or establish an authenticated Shell connection.
"""

import asyncio
import os
import platform
import socket
import time
from collections import deque
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime

ORIGINAL_HOST = "DESKTOP-AE894KC"
MONITOR_FLAG = "ROSEVEAR_MASTER_LOCAL_MONITOR_303"
PROBE_SECONDS = 60
MAX_SAMPLES = 1440
LOCAL_SERVICES = (
    ("hub_api", 8765),
    ("hub_web", 5173),
    ("caddy_proxy", 8443),
)
Probe = Callable[[int], Awaitable[bool]]


def authorized_local_host(*, system: str, hostname: str, enabled: bool) -> bool:
    return enabled and system == "Windows" and hostname.upper() == ORIGINAL_HOST


async def loopback_tcp_probe(port: int) -> bool:
    """Port availability only; TCP success is not end-to-end service health."""
    writer = None
    try:
        _, writer = await asyncio.wait_for(asyncio.open_connection("127.0.0.1", port), timeout=1.0)
        return True
    except (OSError, TimeoutError):
        return False
    finally:
        if writer is not None:
            writer.close()
            try:
                await asyncio.wait_for(writer.wait_closed(), timeout=1.0)
            except (OSError, TimeoutError):
                pass


class LocalUptimeSampler303:
    """Process-local sampling; explicitly enabled only on the known Windows host."""

    def __init__(
        self,
        *,
        system: str | None = None,
        hostname: str | None = None,
        enabled: bool | None = None,
        probe: Probe = loopback_tcp_probe,
        monotonic: Callable[[], float] = time.monotonic,
    ) -> None:
        self.eligible = authorized_local_host(
            system=system if system is not None else platform.system(),
            hostname=hostname if hostname is not None else socket.gethostname(),
            enabled=enabled if enabled is not None else os.getenv(MONITOR_FLAG) == "1",
        )
        self.probe = probe
        self.clock = monotonic
        self.started = self.clock()
        self.samples: deque[tuple[float, str, dict[str, bool]]] = deque(maxlen=MAX_SAMPLES)
        self._task: asyncio.Task[None] | None = None

    async def sample_once(self) -> None:
        if not self.eligible:
            return
        results = await asyncio.gather(
            *(self.probe(port) for _, port in LOCAL_SERVICES), return_exceptions=True
        )
        availability = {
            name: result is True for (name, _), result in zip(LOCAL_SERVICES, results, strict=True)
        }
        stamp = datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")
        self.samples.append((self.clock(), stamp, availability))

    async def _run(self) -> None:
        try:
            while True:
                await self.sample_once()
                await asyncio.sleep(PROBE_SECONDS)
        except asyncio.CancelledError:
            raise

    async def start(self) -> None:
        if self.eligible and self._task is None:
            self._task = asyncio.create_task(self._run(), name="ree-local-uptime-303")

    async def stop(self) -> None:
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    def snapshot(self) -> dict[str, object]:
        now = self.clock()
        count = len(self.samples)
        last = self.samples[-1] if count else None
        fresh = bool(last and 0 <= now - last[0] <= 2 * PROBE_SECONDS + 10)
        services = [
            {
                "id": name,
                "check": "LOOPBACK_TCP_ONLY",
                "state": (
                    "NOT_OBSERVED"
                    if not count
                    else "STALE"
                    if not fresh
                    else "TCP_REACHABLE"
                    if last and last[2][name]
                    else "TCP_UNREACHABLE"
                ),
                "reachableSamples": sum(1 for _, _, values in self.samples if values[name]),
                "sampleCount": count,
            }
            for name, _ in LOCAL_SERVICES
        ]
        return {
            "schema": "rosevear.ai-hub.master-shell-local-uptime.v1",
            "sourceId": "rosevear-ai-hub",
            "sourceRole": "SOURCE",
            "expectedAutomationHost": ORIGINAL_HOST,
            "hostPolicy": "REE_ORIGINAL_WINDOWS_ONLY",
            "collectionState": (
                "MONITORING_LOCAL"
                if self.eligible and fresh
                else "AWAITING_FIRST_SAMPLE"
                if self.eligible
                else "HOLD_NOT_ENABLED_OR_WRONG_HOST"
            ),
            "scope": "LOCAL_LOOPBACK_AVAILABILITY_NOT_APPLICATION_HEALTH",
            "sampleIntervalSeconds": PROBE_SECONDS,
            "processSessionSeconds": max(0, int(now - self.started)),
            "sampleCount": count,
            "lastSampleAtUtc": last[1] if last else None,
            "historyDurability": "MEMORY_ONLY_RESET_ON_RESTART",
            "services": services,
            "masterDestinations": [
                {"id": "ai-data-platform", "role": "INTELLIGENCE_MONITORING", "connection": "HOLD"},
                {"id": "rosevear-comms-hub", "role": "INCIDENT_OPERATIONS", "connection": "HOLD"},
            ],
            "authenticatedShellTransport": "DISABLED",
            "automatedExternalActions": 0,
            "connection": "HOLD",
        }
