#!/usr/bin/env python3
"""Headless smoke test for EMBERWATCH with Camoufox (Firefox).

Usage: python3 tools/smoke.py [--port 8080]
Checks: no console/page errors; Enter starts; movement; coin throw;
smoke bomb (Q); douse lamp (E); camera alert rises in a camera cone;
laser trip on floor 3 (reached by clearing floors 1-2 via the exposed
test hook, then walking across the live beam).

NOTE: in this Camoufox build, page.evaluate runs in a different JS realm
from the page's own scripts, so window.__emberwatch is invisible to it.
All page-realm access below goes through an injected <script> element
that writes its result as JSON into document.title (DOM is shared).
"""
import argparse
import json
import sys

from camoufox.sync_api import Camoufox

STATE_FN = """(() => {
  const g = window.__emberwatch;
  const s = g.state;
  return {
    screen: g.screen,
    floor: s.floorIndex,
    px: s.player.x, py: s.player.y,
    coins: s.coinsLeft, smokes: s.smokesLeft,
    lampsLit: s.lampsLit.slice(),
    camAlert: s._cameras.map(c => Math.round(c.alert)),
    maxSusp: Math.max(...s._guards.map(gd => gd.suspicion)),
    toast: s.toast ? s.toast.text : null,
    score: s.score, take: s.take,
    shardsLeft: s.shardsTaken.filter(t => !t).length,
    laserOn: s.laser ? (s.laser.t % 4) < 2.2 : null,
  };
})"""


def run_in_page(page, fn_src):
    """Run fn_src (a JS function source) in the page's own realm."""
    page.evaluate(
        """(src) => {
          const s = document.createElement('script');
          s.textContent = '(' + src + ')();';
          document.body.appendChild(s);
          s.remove();
        }""",
        fn_src,
    )


def get_state(page):
    run_in_page(page, f"() => {{ document.title = JSON.stringify({STATE_FN}()); }}")
    return json.loads(page.title())


def check(cond, label, failures):
    print(("PASS " if cond else "FAIL ") + label)
    if not cond:
        failures.append(label)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8080)
    args = ap.parse_args()
    failures = []
    errors = []
    with Camoufox(headless=True) as browser:
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.goto(f"http://localhost:{args.port}/")
        page.wait_for_timeout(800)
        page.keyboard.press("Enter")
        page.wait_for_timeout(3000)  # floor card 2.6 s
        st = get_state(page)
        check(st["screen"] == "play", f"screen is play after Enter (got {st['screen']})", failures)

        # Movement: hold D then W, player must move.
        x0, y0 = st["px"], st["py"]
        page.keyboard.down("KeyD")
        page.wait_for_timeout(600)
        page.keyboard.up("KeyD")
        page.keyboard.down("KeyW")
        page.wait_for_timeout(600)
        page.keyboard.up("KeyW")
        st = get_state(page)
        check(abs(st["px"] - x0) > 20 or abs(st["py"] - y0) > 20,
              f"player moved ({x0:.0f},{y0:.0f}) -> ({st['px']:.0f},{st['py']:.0f})", failures)

        # Coin throw by clicking the floor.
        page.mouse.click(600, 400)
        page.wait_for_timeout(500)
        st = get_state(page)
        check(st["coins"] == 4, f"coin thrown, coinsLeft 4 (got {st['coins']})", failures)

        # Smoke bomb.
        page.keyboard.press("KeyQ")
        page.wait_for_timeout(200)
        st = get_state(page)
        check(st["smokes"] == 1, f"smoke used, smokesLeft 1 (got {st['smokes']})", failures)

        # Douse a lamp: stand next to lamp 1 (ref 350,280 -> scaled x 375).
        run_in_page(page, "() => { const s = window.__emberwatch.state; s.player.x = 375; s.player.y = 320; }")
        page.keyboard.press("KeyE")
        page.wait_for_timeout(200)
        st = get_state(page)
        check(st["lampsLit"][0] is False, f"lamp 0 doused (lampsLit={st['lampsLit']})", failures)

        # Camera alert: stand inside C1's cone (scaled 750,560, facing up).
        run_in_page(page, "() => { const s = window.__emberwatch.state; s.player.x = 750; s.player.y = 430; s.player.sneaking = true; }")
        page.wait_for_timeout(2500)
        st = get_state(page)
        check(st["camAlert"][0] > 5, f"camera C1 alert rose (got {st['camAlert']})", failures)

        # Reach floor 3 by clearing floors 1 and 2 through the test hook.
        for _ in range(2):
            run_in_page(
                page,
                "() => { const g = window.__emberwatch; const s = g.state;"
                " s.shardsTaken = s.shardsTaken.map(() => true);"
                " const e = s.floor.exit; s.player.x = e[0] + 24; s.player.y = e[1] + 38; }",
            )
            page.wait_for_timeout(3000)
        st = get_state(page)
        check(st["floor"] == 2, f"reached floor 3 (got floor index {st['floor']})", failures)

        # Laser: wait for a live beam, then walk down across it.
        # Beam y=470, x 482-750 (scaled). Start just above it.
        run_in_page(page, "() => { const s = window.__emberwatch.state; s.player.x = 600; s.player.y = 452; }")
        for _ in range(40):
            if get_state(page)["laserOn"]:
                break
            page.wait_for_timeout(150)
        before = get_state(page)["maxSusp"]
        page.keyboard.down("KeyS")
        page.wait_for_timeout(1200)
        page.keyboard.up("KeyS")
        st = get_state(page)
        tripped = st["toast"] == "LASER TRIPPED!" or st["maxSusp"] > before + 5
        check(tripped, f"laser tripped (toast={st['toast']}, maxSusp {before:.0f}->{st['maxSusp']:.0f})", failures)
        print("final state:", st)
        page.close()
    check(not errors, f"no console/page errors (got {errors[:3]})", failures)
    if failures:
        print(f"\n{len(failures)} FAILURES", file=sys.stderr)
        return 1
    print("\nSMOKE OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
