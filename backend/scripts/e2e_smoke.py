import os
import subprocess
import sys
import time
import urllib.request

UVICORN_CMD = [
    sys.executable,
    "-m",
    "uvicorn",
    "app.main:app",
    "--host",
    "127.0.0.1",
    "--port",
    "8000",
]


def main() -> int:
    env = dict(os.environ)
    env["PYTHONPATH"] = "/Users/psg/saju/backend"

    p = subprocess.Popen(
        UVICORN_CMD,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    try:
        # Give the server a moment to start
        time.sleep(1.2)

        code = None
        err = None
        try:
            with urllib.request.urlopen("http://127.0.0.1:8000/docs", timeout=2) as r:
                code = r.status
        except Exception as e:  # noqa: BLE001
            err = f"{e.__class__.__name__}: {e}"

        print("HTTP_STATUS", code)
        if err:
            print("HTTP_ERROR", err)

    finally:
        p.terminate()
        try:
            out, _ = p.communicate(timeout=2)
        except Exception:  # noqa: BLE001
            out = ""

        print("PROC_RC", p.returncode)
        if out:
            lines = out.splitlines()
            print("LOG_HEAD")
            for line in lines[:30]:
                print(line)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
