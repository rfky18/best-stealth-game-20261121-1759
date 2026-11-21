#!/usr/bin/env python3
"""Render the four EMBERWATCH screenshots with headless Camoufox (Firefox).

Usage: python3 tools/shots.py [--port 8080] [--out screenshots]
Loads game/?shot=<name>&seed=1 for each scene, waits for the shotReady
flag (15 s timeout), waits 300 ms, saves a JPEG at quality 82.
"""
import argparse
import os
import sys

from camoufox.sync_api import Camoufox

SCENES = [
    ("cover", "1-cover.jpg"),
    ("nearmiss", "2-nearmiss.jpg"),
    ("camera", "3-camera.jpg"),
    ("exit", "4-exit.jpg"),
]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8080)
    ap.add_argument("--out", default="screenshots")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    errors = []
    with Camoufox(headless=True) as browser:
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type in ("error", "warning") else None)
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        for name, fname in SCENES:
            url = f"http://localhost:{args.port}/?shot={name}&seed=1"
            page.goto(url)
            page.wait_for_function(
                "document.documentElement.dataset.shotReady === '1'",
                timeout=15000,
            )
            page.wait_for_timeout(300)
            path = os.path.join(args.out, fname)
            page.screenshot(path=path, type="jpeg", quality=82)
            size = os.path.getsize(path)
            print(f"{fname}: {size} bytes ({size / 1024:.1f} KiB)")
            if size > 256 * 1024:
                print(f"  WARNING: over 256 KiB cap", file=sys.stderr)
        page.close()
    if errors:
        print("browser errors:", file=sys.stderr)
        for e in errors:
            print(f"  {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
