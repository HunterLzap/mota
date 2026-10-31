"""Start the local game without touching browser profiles or save data."""

import argparse
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path


ROOT = Path(__file__).resolve().parent
URL = "http://127.0.0.1:8088/"
HTTP = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def game_is_ready():
    try:
        with HTTP.open(URL, timeout=1) as response:
            body = response.read().decode("utf-8")
            return response.status == 200 and 'id="game-module-entry"' in body and "js/main.js" in body
    except (OSError, UnicodeError, urllib.error.URLError):
        return False


def port_is_busy():
    try:
        with socket.create_connection(("127.0.0.1", 8088), timeout=1):
            return True
    except OSError:
        return False


def ensure_server():
    if game_is_ready():
        return
    if port_is_busy():
        raise RuntimeError("Port 8088 is busy but is not serving this game. No process was stopped.")
    log_path = ROOT / "output" / "server.log"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    # Append diagnostics and detach the server so closing this launcher is safe.
    with log_path.open("ab") as log:
        subprocess.Popen(
            [sys.executable, "-X", "utf8", str(ROOT / "server.py")],
            cwd=ROOT,
            stdin=subprocess.DEVNULL,
            stdout=log,
            stderr=log,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            close_fds=True,
        )
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        if game_is_ready():
            return
        time.sleep(0.2)
    raise RuntimeError(f"Server did not become ready. See {log_path}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--no-browser", action="store_true", help="Check/start the server without opening a window")
    args = parser.parse_args()
    try:
        ensure_server()
        print(f"Game ready: {URL}")
        if not args.no_browser and not webbrowser.open(URL, new=2):
            raise RuntimeError(f"Could not open the default browser. Open {URL} manually.")
    except (OSError, RuntimeError) as error:
        print(str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
