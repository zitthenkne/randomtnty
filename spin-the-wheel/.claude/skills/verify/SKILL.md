---
name: verify
description: How to run and visually verify this static PWA (spin-the-wheel) locally
---

# Verify spin-the-wheel

Static PWA, no build step. Serve the repo root and drive it in a real browser.

## Launch

```bash
python -m http.server 8734   # from repo root, run in background
# app: http://localhost:8734/?lang=vi
```

## Drive / screenshot

Use Python Playwright with the system Edge (no browser download needed):

```python
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", headless=True)
    ctx = b.new_context(viewport={"width": 390, "height": 844},
                        device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = ctx.new_page()
    pg.goto("http://localhost:8734/?lang=vi")
    pg.wait_for_timeout(2000)          # i18n + first render
    pg.locator("#centerSpinButton").tap()   # spin (default duration 5s)
    pg.wait_for_timeout(6500)
    # result modal: #resultModal:not(.hidden), close via #closeResultButton
    pg.screenshot(path="out.png")
```

## Gotchas

- **Do not use bare `msedge --headless --screenshot --window-size=390,...`**:
  Edge/Chromium enforces a ~500px minimum window width, so mobile media
  queries never fire and the screenshot is a crop of a 492px-wide page.
  Playwright viewport emulation is required for real mobile widths.
- Useful checks: horizontal overflow via
  `document.documentElement.scrollWidth - document.documentElement.clientWidth`
  (should be 0), `pageerror`/console listeners for JS errors.
- Service worker caches the app shell (`sw.js`); bump `CACHE_VERSION` after
  asset changes or deployed users keep the old UI. Local verification is
  unaffected (fresh Playwright contexts have no SW).
- Wheel defaults live in `defaults.js` (`DEFAULT_STATE.theme`); club theme
  preset is `tnty` in `themes.js`; the center logo is the DOM button
  `#centerSpinButton` (canvas center is covered by it).
