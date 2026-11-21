#!/usr/bin/env python3
"""Screenshot EMBERWATCH v4: 4 staged scene, render asli dari kode game.

Buka http://localhost:8080/?shot=<nama>&seed=1 di Camoufox headless
(Firefox), viewport 1280x720, tunggu flag shotReady (timeout 15 dtk),
tunggu 300 ms, simpan JPEG kualitas 82 ke screenshots/.
Server harus sudah jalan: `node serve.ts` (port 8080).
"""
import os
import sys
import time

SHOTS = [
    ("cover", "1-cover.jpg"),
    ("nearmiss", "2-nearmiss.jpg"),
    ("camera", "3-camera.jpg"),
    ("exit", "4-exit.jpg"),
]

BASE = "http://localhost:8080"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "screenshots")
MAX_BYTES = 262144


def main():
    from camoufox.sync_api import Camoufox

    os.makedirs(OUT, exist_ok=True)
    errors = []
    with Camoufox(headless=True) as browser:
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type == "error" else None)
        for name, fname in SHOTS:
            url = f"{BASE}/?shot={name}&seed=1"
            page.goto(url)
            try:
                page.wait_for_function(
                    "document.documentElement.dataset.shotReady === '1'",
                    timeout=15000,
                )
            except Exception:
                print(f"FAIL {name}: shotReady tidak muncul")
                sys.exit(1)
            page.wait_for_timeout(300)
            path = os.path.join(OUT, fname)
            page.screenshot(path=path, type="jpeg", quality=82)
            size = os.path.getsize(path)
            flag = "OK " if size <= MAX_BYTES else "TOO BIG "
            print(f"{flag}{fname}: {size} bytes")
            if size > MAX_BYTES:
                sys.exit(1)
        page.close()
    if errors:
        print("ERRORS selama screenshot:")
        for e in errors:
            print("  " + e)
        sys.exit(1)
    print("semua screenshot OK")


if __name__ == "__main__":
    main()
