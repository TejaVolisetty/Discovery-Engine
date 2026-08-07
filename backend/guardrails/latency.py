import os
import sys
import time
import csv
import logging
import functools
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Any

GUARDRAILS_DIR = Path(__file__).parent.resolve()
BACKEND_DIR = GUARDRAILS_DIR.parent
LOGS_DIR = BACKEND_DIR / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)
LATENCY_LOG_PATH = LOGS_DIR / "latency_log.csv"

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("latency_tracker")

LATENCY_THRESHOLD_MS = 80.0  # Target benchmark threshold (80ms)


def _log_latency_to_csv(endpoint_name: str, elapsed_ms: float):
    """Appends latency log entry to /backend/logs/latency_log.csv."""
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    file_exists = LATENCY_LOG_PATH.exists()

    timestamp = datetime.now(timezone.utc).isoformat()
    row = [timestamp, endpoint_name, f"{elapsed_ms:.2f}"]

    with open(LATENCY_LOG_PATH, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(["timestamp", "endpoint", "latency_ms"])
        writer.writerow(row)

    if elapsed_ms > LATENCY_THRESHOLD_MS:
        logger.warning(
            f"[LATENCY WARNING] Endpoint '{endpoint_name}' exceeded {LATENCY_THRESHOLD_MS}ms target! "
            f"Execution time: {elapsed_ms:.2f}ms"
        )


def track_latency(func: Callable = None, *, name: str = None):
    """
    Decorator that measures function execution time (sync or async),
    logs it to /backend/logs/latency_log.csv (timestamp, endpoint, latency_ms),
    and raises a warning log if execution exceeds 80ms.
    """
    def decorator(fn: Callable) -> Callable:
        endpoint_name = name or fn.__name__

        @functools.wraps(fn)
        def sync_wrapper(*args, **kwargs) -> Any:
            start_time = time.perf_counter()
            try:
                result = fn(*args, **kwargs)
                return result
            finally:
                elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                _log_latency_to_csv(endpoint_name, elapsed_ms)

        @functools.wraps(fn)
        async def async_wrapper(*args, **kwargs) -> Any:
            start_time = time.perf_counter()
            try:
                result = await fn(*args, **kwargs)
                return result
            finally:
                elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                _log_latency_to_csv(endpoint_name, elapsed_ms)

        if asyncio.iscoroutinefunction(fn):
            return async_wrapper
        return sync_wrapper

    if func is None:
        return decorator
    return decorator(func)


def test_latency_decorator():
    """Unit test for track_latency decorator verifying fast & threshold-exceeding calls."""
    print("[TEST] Running Latency Decorator Guardrails Unit Test...")

    @track_latency
    def fast_function():
        time.sleep(0.01)  # ~10ms
        return "fast_result"

    @track_latency
    def slow_function():
        time.sleep(0.09)  # ~90ms (triggers warning > 80ms)
        return "slow_result"

    r1 = fast_function()
    r2 = slow_function()

    assert r1 == "fast_result"
    assert r2 == "slow_result"

    assert LATENCY_LOG_PATH.exists(), "Latency log CSV file must exist"
    with open(LATENCY_LOG_PATH, "r", encoding="utf-8") as f:
        rows = list(csv.reader(f))

    print(f"  Latency Log File: {LATENCY_LOG_PATH}")
    print("  Recorded Log Rows:")
    for row in rows:
        print(f"    - {row}")

    assert len(rows) >= 3, "Expected header + 2 log rows"
    print("\n================================================================================")
    print("                    LATENCY TRACKING GUARDRAILS PASSED                          ")
    print("================================================================================\n")


if __name__ == "__main__":
    test_latency_decorator()
