"""Build 048: small, read-only on-demand local resource snapshot.

Avoid polling, service restarts and filesystem scans. Only report coarse totals,
not device identifiers, absolute paths, process lists or secrets.
"""

from __future__ import annotations

import shutil
from datetime import UTC, datetime
from pathlib import Path

import psutil

MIB = 1024 * 1024
GIB = 1024 * MIB
API_RSS_WARNING_BYTES = 1024 * MIB
FREE_DISK_WARNING_BYTES = 2 * GIB
FREE_MEMORY_WARNING_BYTES = 2 * GIB


def collect_resource_snapshot() -> dict[str, object]:
    """Sample once. Guidelines are indicators, never admission-control decisions."""
    process = psutil.Process()
    memory = psutil.virtual_memory()
    disk = shutil.disk_usage(Path.cwd())
    cpu = process.cpu_times()
    rss = int(process.memory_info().rss)
    cpu_seconds = round(float(cpu.user + cpu.system), 2)
    issues = []
    if rss >= API_RSS_WARNING_BYTES:
        issues.append("api_memory")
    if memory.available < FREE_MEMORY_WARNING_BYTES:
        issues.append("host_memory")
    if disk.free < FREE_DISK_WARNING_BYTES:
        issues.append("workspace_disk")
    return {
        "sampled_at_utc": datetime.now(UTC).isoformat(),
        "scope": "api_process_and_host",
        "status": "attention" if issues else "within_guidelines",
        "signals": issues,
        "api_process": {
            "rss_bytes": rss,
            "cpu_seconds_total": cpu_seconds,
        },
        "host_memory": {
            "total_bytes": int(memory.total),
            "available_bytes": int(memory.available),
        },
        "workspace_volume": {
            "total_bytes": int(disk.total),
            "free_bytes": int(disk.free),
        },
        "guidelines": {
            "api_rss_warning_bytes": API_RSS_WARNING_BYTES,
            "min_host_available_bytes": FREE_MEMORY_WARNING_BYTES,
            "min_workspace_free_bytes": FREE_DISK_WARNING_BYTES,
        },
    }
