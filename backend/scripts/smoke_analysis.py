"""Minimal E2E smoke for the analysis API.

Why this exists
- Build can pass while runtime integration fails (endpoint path, payload shape, CORS, etc).
- This script verifies the backend accepts representative payloads and returns the expected shape.

What it checks
- Case A: birth_time is null (unknown time)
- Case B: birth_time is provided ("HH:MM")
- HTTP 200
- Response contains required top-level keys: chart, element_score, summary, routines

Usage (from backend/)
- Use the workspace venv Python (recommended):
  /Users/psg/saju/.venv/bin/python scripts/smoke_analysis.py

Notes
- Backend server must be running (uvicorn) on 127.0.0.1:8000.
- This is intentionally lightweight and non-flaky.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.request

API_BASE = "http://127.0.0.1:8000"
ANALYSIS_URL = f"{API_BASE}/api/analysis"


def wait_for_up(url: str, timeout_s: float) -> bool:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=1) as r:
                return 200 <= r.status < 500
        except Exception:  # noqa: BLE001
            time.sleep(0.15)
    return False


def post_json(url: str, payload: dict) -> tuple[int, dict]:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=20) as resp:
        status = resp.status
        body = resp.read().decode("utf-8")

    return status, json.loads(body)


def assert_shape(obj: dict) -> None:
    required = ["chart", "element_score", "summary", "routines"]
    missing = [k for k in required if k not in obj]
    if missing:
        raise AssertionError(f"Missing keys: {missing}")


def run_case(case_name: str, payload: dict) -> None:
    status, body = post_json(ANALYSIS_URL, payload)
    if status != 200:
        raise AssertionError(f"{case_name}: HTTP {status}")
    if not isinstance(body, dict):
        raise AssertionError(f"{case_name}: response not a JSON object")

    assert_shape(body)
    summary = body.get("summary")
    if not isinstance(summary, dict) or len(summary.keys()) == 0:
        raise AssertionError(f"{case_name}: summary missing/empty")

    overall = summary.get("overall")
    if isinstance(overall, str) and overall.strip():
        print(f"OK {case_name}: overall_len={len(overall)}")
    else:
        # 어떤 모델/버전에서는 overall 키가 없을 수 있어, summary 자체가 존재하는지만 PASS로 둡니다.
        print(f"OK {case_name}: summary_keys={len(summary.keys())}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--spawn-server",
        action="store_true",
        help="Start uvicorn temporarily for this smoke run (recommended for CI/local quick check).",
    )
    args = parser.parse_args()

    server_proc: subprocess.Popen[str] | None = None
    if args.spawn_server:
        env = dict(os.environ)
        # Make sure `backend/app` is importable regardless of where this runs.
        env["PYTHONPATH"] = "/Users/psg/saju/backend"
        cmd = [
            sys.executable,
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8000",
        ]
        server_proc = subprocess.Popen(
            cmd,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )

    try:
        if not wait_for_up(f"{API_BASE}/docs", timeout_s=5):
            raise RuntimeError(
                "Backend is not reachable on 127.0.0.1:8000. "
                "Start uvicorn first, or run this script with --spawn-server."
            )

        base_payload = {
            "name": "테스트",
            "gender": "M",
            "birth_date": "1995-08-28",
            "birth_time": None,
            "birth_time_meridiem": "AM",
            "birth_time_hh": "",
            "birth_time_mm": "",
            "calendar_type": "SOLAR",
        }

        run_case("unknown_time", dict(base_payload, birth_time=None))
        run_case("with_time", dict(base_payload, birth_time="05:30"))

        print("SMOKE_PASS")
        return 0
    finally:
        if server_proc is not None:
            server_proc.terminate()
            try:
                out, _ = server_proc.communicate(timeout=2)
            except Exception:  # noqa: BLE001
                out = ""
            if out:
                # Helpful when run in CI or when startup fails.
                print("SERVER_LOG_HEAD")
                for line in out.splitlines()[:30]:
                    print(line)


if __name__ == "__main__":
    raise SystemExit(main())
