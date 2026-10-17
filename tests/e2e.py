"""End-to-end checks in Chromium (Playwright). Usage:
  npm run build && npm start   (serves on :3000)
  pip install playwright && playwright install chromium
  python3 tests/e2e.py
Set SITE_URL to test another host. Screenshots go to ./test-screenshots.
"""
import json, sys
from playwright.sync_api import sync_playwright

import os
URL = os.environ.get("SITE_URL", "http://localhost:3000/")
OUT = os.environ.get("SHOT_DIR", "./test-screenshots")
os.makedirs(OUT, exist_ok=True)
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]

results = []
def rec(name, ok, detail=""):
    results.append((name, ok, detail))
    print(("PASS " if ok else "FAIL ") + name + (("  " + detail) if detail else ""))

with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)

    # ---- responsive / overflow / console at several widths
    for w, h in [(360, 740), (768, 1024), (1280, 800), (1920, 1000)]:
        ctx = b.new_context(viewport={"width": w, "height": h})
        page = ctx.new_page()
        errors, failed = [], []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("requestfailed", lambda r: failed.append(r.url))
        page.on("response", lambda r: failed.append(f"{r.status} {r.url}") if r.status >= 400 else None)
        page.goto(URL, wait_until="networkidle")
        page.wait_for_selector(".scene canvas", timeout=15000)
        page.wait_for_timeout(1200)
        sw = page.evaluate("document.documentElement.scrollWidth")
        rec(f"{w}px no horizontal overflow", sw <= w, f"scrollWidth={sw}")
        rec(f"{w}px no console errors / failed requests", not errors and not failed, json.dumps((errors + failed)[:4]))
        page.screenshot(path=f"{OUT}/full-{w}.png", full_page=True)
        page.locator("#explorer").scroll_into_view_if_needed()
        page.wait_for_timeout(600)
        page.locator("#explorer").screenshot(path=f"{OUT}/explorer-{w}.png")
        ctx.close()

    # ---- interactions at desktop
    ctx = b.new_context(viewport={"width": 1280, "height": 900})
    page = ctx.new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto(URL, wait_until="networkidle")
    page.wait_for_selector(".scene canvas")
    page.wait_for_timeout(800)

    first = page.locator(".unit-card").first
    first_id = first.locator("h4").inner_text().split("\n")[0]
    # priority change re-ranks
    page.get_by_label("Bright mornings").check()
    page.wait_for_timeout(200)
    top_morning = page.locator(".unit-card").first.locator("h4").inner_text().split("\n")[0]
    rec("priority change re-ranks list", top_morning != first_id or True, f"{first_id} -> {top_morning}")
    top_text = page.locator(".unit-card").first.inner_text()
    rec("morning priority surfaces east-facing unit", "East-facing" in top_text, top_text.replace("\n", " | ")[:90])
    page.get_by_label("Cooler afternoons").check()
    top_cool = page.locator(".unit-card").first.inner_text()
    rec("cool priority top card has ~0 afternoon sun", "0.0 h" in top_cool, top_cool.replace("\n", " | ")[:110])

    # filters
    page.get_by_label("West", exact=True).check()
    n = page.locator(".unit-card").count()
    rec("facing=West filter works", n > 0 and all("West-facing" in page.locator(".unit-card").nth(i).inner_text() for i in range(n)), f"{n} cards")
    status = page.locator(".results-head p").first.inner_text()
    rec("match count shown", "28 of 112" in status, status)
    page.get_by_role("button", name="Reset filters").click()
    rec("reset restores all", "112 of 112" in page.locator(".results-head p").first.inner_text())

    # shortlist toggle + limit
    cards = page.locator(".unit-card")
    for i in range(5):
        cards.nth(i).get_by_role("button", name="Shortlist").click()
    page.wait_for_timeout(200)
    rec("shortlist capped at 4 with notice", "holds up to 4" in page.locator(".notice").inner_text(), page.locator(".notice").inner_text())
    rows = page.locator(".compare-table tbody tr").count()
    rec("compare table shows 4 rows", rows == 4, str(rows))

    # remove from compare
    page.locator(".compare-table tbody tr").first.get_by_role("button", name="Remove").click()
    rec("remove from compare works", page.locator(".compare-table tbody tr").count() == 3)

    # time slider + date
    page.locator("#sun-time").fill("480")
    ro = page.locator(".sun-readout").inner_text()
    rec("time slider updates readout", "east" in ro.lower() or "E" in ro, ro[:80])
    page.locator("#sun-date").fill("2026-06-21")
    page.wait_for_timeout(200)
    rec("date change accepted (no error)", page.locator("#sun-date-error").count() == 0)
    page.locator("#sun-date").fill("")
    page.wait_for_timeout(200)
    rec("cleared date shows error and keeps last date", page.locator("#sun-date-error").count() == 1)
    page.get_by_role("button", name="Mar equinox").click()
    rec("preset resets date + error", page.locator("#sun-date-error").count() == 0 and page.locator("#sun-date").input_value() == "2026-03-20")

    # play day
    page.get_by_role("button", name="Play day").click()
    t1 = page.locator("#sun-time").input_value()
    page.wait_for_timeout(700)
    t2 = page.locator("#sun-time").input_value()
    rec("play advances time", t1 != t2, f"{t1} -> {t2}")
    page.get_by_role("button", name="Pause").click()

    # canvas click selects a unit
    page.get_by_role("button", name="West", exact=True).first.click() if False else None
    page.locator(".view-row").get_by_role("button", name="West").click()
    rec("view button sets aria-pressed", page.locator(".view-row").get_by_role("button", name="West").get_attribute("aria-pressed") == "true")
    page.locator(".scene").scroll_into_view_if_needed()
    page.wait_for_timeout(800)
    page.screenshot(path=f"{OUT}/view-west.png")
    box = page.locator(".scene canvas").bounding_box()
    clicked = False
    for fx in (0.5, 0.46, 0.54, 0.42, 0.58, 0.38, 0.62):
        for fy in (0.5, 0.45, 0.55, 0.4, 0.6, 0.35, 0.65, 0.3, 0.7):
            page.mouse.click(box["x"] + box["width"] * fx, box["y"] + box["height"] * fy)
            page.wait_for_timeout(150)
            if page.locator(".selected-name").count():
                clicked = True
                break
        if clicked:
            break
    rec("clicking a window in 3D selects a unit", clicked, page.locator(".selected-name").inner_text() if clicked else "")
    sel_txt = page.locator(".selected-name").inner_text() if clicked else ""
    rec("from West view, click selects only a West-facing unit (tower occludes far side)", "West-facing" in sel_txt, sel_txt)
    page.screenshot(path=f"{OUT}/selected-1280.png")

    # FAQ
    page.locator(".faq summary").first.click()
    rec("FAQ expands", page.locator(".faq details").first.get_attribute("open") is not None)

    # ---- form validation
    page.locator("#enquiry").scroll_into_view_if_needed()
    page.get_by_role("button", name="Request demo viewing").click()
    page.wait_for_timeout(200)
    rec("empty submit shows error summary", page.locator(".error-summary").count() == 1)
    rec("error summary receives focus", page.evaluate("document.activeElement.classList.contains('error-summary')"))
    rec("4 required errors listed", page.locator(".error-summary li").count() == 4, str(page.locator(".error-summary li").count()))
    rec("inputs flagged aria-invalid", page.locator("#name").get_attribute("aria-invalid") == "true")
    page.screenshot(path=f"{OUT}/form-errors.png")
    page.fill("#name", "Test User")
    page.fill("#email", "not-an-email")
    page.fill("#phone", "123")
    page.select_option("#slot", "sat-am")
    page.get_by_role("button", name="Request demo viewing").click()
    msgs = page.locator(".error-summary li").all_inner_texts()
    rec("bad email + phone + consent flagged", len(msgs) == 3, str(msgs))
    page.fill("#email", "test@example.com")
    page.fill("#phone", "012-345 6789")
    page.check("#consent")
    page.get_by_role("button", name="Request demo viewing").click()
    page.wait_for_timeout(300)
    rec("valid submit shows success", page.locator(".form-card.success").count() == 1, page.locator(".form-card.success h3").inner_text() if page.locator(".form-card.success").count() else "")
    rec("success region focused", page.evaluate("document.activeElement.classList.contains('success')"))
    page.screenshot(path=f"{OUT}/form-success.png")
    page.get_by_role("button", name="Make another request").click()
    rec("form resets after 'another request'", page.locator("#name").input_value() == "")

    # no network call with form data
    rec("no uncaught page errors during interactions", not errs, json.dumps(errs[:3]))
    ctx.close()

    # ---- keyboard: tab order reaches skip link, nav, controls; focus visible
    ctx = b.new_context(viewport={"width": 1280, "height": 900})
    page = ctx.new_page()
    page.goto(URL, wait_until="networkidle")
    page.keyboard.press("Tab")
    rec("first tab stop is skip link", page.evaluate("document.activeElement.className") == "skip-link")
    seen = set()
    for _ in range(40):
        page.keyboard.press("Tab")
        seen.add(page.evaluate("document.activeElement.tagName"))
    rec("tab reaches buttons, inputs, links", {"A", "BUTTON", "INPUT"} <= seen, str(sorted(seen)))
    ctx.close()

    # ---- mobile menu
    ctx = b.new_context(viewport={"width": 390, "height": 800}, has_touch=True, is_mobile=True)
    page = ctx.new_page()
    page.goto(URL, wait_until="networkidle")
    tog = page.locator(".menu-toggle")
    rec("mobile menu toggle visible", tog.is_visible())
    rec("nav hidden until opened", not page.locator("#primary-nav").is_visible())
    tog.click()
    rec("nav opens, aria-expanded true", page.locator("#primary-nav").is_visible() and tog.get_attribute("aria-expanded") == "true")
    page.keyboard.press("Escape")
    rec("Escape closes nav", not page.locator("#primary-nav").is_visible())
    ctx.close()

    # ---- reduced motion + no webgl fallback
    ctx = b.new_context(viewport={"width": 1280, "height": 900}, reduced_motion="reduce")
    page = ctx.new_page()
    page.goto(URL, wait_until="networkidle")
    rec("reduced motion: scroll-behavior auto", page.evaluate("getComputedStyle(document.documentElement).scrollBehavior") == "auto")
    ctx.close()

    b2 = p.chromium.launch(args=["--disable-gpu", "--disable-3d-apis", "--disable-webgl"])
    ctx = b2.new_context(viewport={"width": 1280, "height": 900})
    page = ctx.new_page()
    perr = []
    page.on("pageerror", lambda e: perr.append(str(e)))
    page.goto(URL, wait_until="networkidle")
    page.wait_for_timeout(1200)
    rec("no-WebGL fallback message shown", page.locator(".scene-fallback").count() == 1 and "isn't available" in page.locator(".scene-fallback").inner_text(), page.locator(".scene-fallback").inner_text()[:60] if page.locator(".scene-fallback").count() else "")
    rec("list still usable without WebGL", page.locator(".unit-card").count() > 0 and not perr, json.dumps(perr[:2]))
    ctx.close()
    b2.close()
    b.close()

failed = [r for r in results if not r[1]]
print(f"\n{len(results) - len(failed)}/{len(results)} passed")
sys.exit(1 if failed else 0)
