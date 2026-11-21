#!/usr/bin/env python3
"""Smoke test live EMBERWATCH v4 di Camoufox headless.

Buka game dengan ?debug=1, Enter, jalan, lempar koin (klik), bom asap (Q),
padamkan lampu (E), jalan ke cone kamera sampai alert naik, uji laser trip
di lantai 3. TIDAK BOLEH ada console error / pageerror.

State dibaca lewat div #ember-debug (JSON, ditulis tiap frame oleh game),
perintah (teleport/setFloor) dikirim lewat CustomEvent 'ember-cmd' di DOM —
jalur ini dipakai karena window.__ember tidak terlihat dari konteks
evaluate Camoufox, sementara DOM tetap terbagi.
Server harus sudah jalan: `node serve.ts` (port 8080).
"""
import json
import sys

BASE = "http://localhost:8080/?debug=1"


def snap(page):
    txt = page.evaluate("() => document.getElementById('ember-debug').textContent")
    return json.loads(txt) if txt else {}


def cmd(page, detail):
    page.evaluate(
        "(d) => document.dispatchEvent(new CustomEvent('ember-cmd', {detail: JSON.stringify(d)}))",
        detail,
    )


def main():
    from camoufox.sync_api import Camoufox

    errors = []
    fails = []

    def check(label, cond, extra=""):
        print(("PASS " if cond else "FAIL ") + label + (f" ({extra})" if extra else ""))
        if not cond:
            fails.append(label)

    with Camoufox(headless=True) as browser:
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type == "error" else None)
        page.goto(BASE)
        page.wait_for_timeout(800)
        s = snap(page)
        check("game boot (debug div terisi)", bool(s) and s.get("screen") == "title", str(s.get("screen")))

        # Enter -> kartu malam -> playing
        page.keyboard.press("Enter")
        page.wait_for_timeout(3200)
        s = snap(page)
        check("screen playing setelah Enter", s.get("screen") == "playing", str(s.get("screen")))

        # Jalan ke kanan 1 detik
        x0 = snap(page)["px"]
        page.keyboard.down("d")
        page.wait_for_timeout(1000)
        page.keyboard.up("d")
        x1 = snap(page)["px"]
        check("jalan (WASD) menggerakkan Wren", x1 > x0 + 50, f"x {x0} -> {x1}")

        # Lempar koin via klik
        coins0 = snap(page)["coins"]
        page.mouse.click(400, 500)
        page.wait_for_timeout(700)
        s = snap(page)
        check("klik lempar koin", s["coins"] == coins0 - 1, f"coins {coins0} -> {s['coins']}")

        # Bom asap (Q)
        smoke0 = snap(page)["smokesLeft"]
        page.keyboard.press("q")
        page.wait_for_timeout(300)
        check("Q bom asap", snap(page)["smokesLeft"] == smoke0 - 1,
              f"smokesLeft {smoke0} -> {snap(page)['smokesLeft']}")

        # Padamkan lampu (E): teleport dekat lampu (350,280)
        cmd(page, {"cmd": "teleport", "x": 350, "y": 360})
        lamps0 = snap(page)["lamps"]
        page.keyboard.press("e")
        page.wait_for_timeout(300)
        check("E padamkan lampu", snap(page)["lamps"] == lamps0 - 1,
              f"lamps {lamps0} -> {snap(page)['lamps']}")

        # Kamera: teleport ke dalam cone C1 lantai 1 (700,560 hadap atas)
        cmd(page, {"cmd": "teleport", "x": 700, "y": 400})
        page.wait_for_timeout(1800)
        alert1 = snap(page)["camAlert"]
        check("alert kamera naik di cone", alert1 > 10, f"alert {alert1:.1f}")

        # Laser lantai 3: pindah lantai, jalan melintasi beam saat menyala
        cmd(page, {"cmd": "setFloor", "floor": 2})
        page.wait_for_timeout(300)
        cmd(page, {"cmd": "teleport", "x": 450, "y": 500})
        page.keyboard.down("w")
        peak = 0.0
        tripped = False
        for _ in range(6):
            page.wait_for_timeout(100)
            s = snap(page)
            peak = max(peak, s.get("maxSusp", 0))
            tripped = tripped or s.get("laserTripped") is True
        page.keyboard.up("w")
        s = snap(page)
        tripped = tripped or s.get("laserTripped") is True
        check("laser trip saat melintas beam nyala", tripped is True,
              f"tripped={tripped} toast={s.get('toast')}")
        check("guard naik suspicion setelah laser trip", peak >= 20,
              f"peak maxSusp {peak:.1f}")

        # Pause / resume
        page.keyboard.press("p")
        page.wait_for_timeout(200)
        check("P jeda", snap(page)["screen"] == "paused")
        page.keyboard.press("p")
        page.wait_for_timeout(200)
        check("P lanjut", snap(page)["screen"] == "playing")

        page.close()

    if errors:
        print("CONSOLE/PAGE ERRORS:")
        for e in errors:
            print("  " + e)
    if errors or fails:
        print(f"SMOKE GAGAL: {len(fails)} fail, {len(errors)} error")
        sys.exit(1)
    print("SMOKE OK — tanpa console error / pageerror")


if __name__ == "__main__":
    main()
