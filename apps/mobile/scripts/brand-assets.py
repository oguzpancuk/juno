#!/usr/bin/env python3
"""Rasterise the juno mark into the PNGs Expo needs.

Source of truth is assets/brand/mark.svg (two four-pointed stars, the
astrological Juno glyph reduced to its silhouette). This script wraps it
in the night palette and renders every size with headless Chrome, so the
PNGs under assets/ are reproducible rather than hand-exported.

    python3 apps/mobile/scripts/brand-assets.py

Requires Google Chrome; no other dependency.
"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ASSETS = HERE.parent / "assets"
MARK = (ASSETS / "brand" / "mark.svg").read_text()

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

NIGHT = "#0b0b1a"
NIGHT_GLOW = "radial-gradient(120% 120% at 30% 20%, #241f3f 0%, #0e0d21 70%)"
WARM = (
    '<svg width="0" height="0" style="position:absolute"><defs>'
    '<linearGradient id="warm" x1="0" y1="0" x2="1" y2="1">'
    '<stop offset="0%" stop-color="#F8D7A0"/>'
    '<stop offset="55%" stop-color="#F2B97E"/>'
    '<stop offset="100%" stop-color="#E98FA0"/>'
    "</linearGradient></defs></svg>"
)


def mark(size: int, color: str) -> str:
    return MARK.replace("currentColor", color).replace(
        "<svg ", f'<svg width="{size}" height="{size}" '
    )


def page(size: int, background: str, mark_size: int, color: str) -> str:
    body = WARM + mark(mark_size, color) if mark_size else ""
    return (
        f"<body style=\"margin:0;width:{size}px;height:{size}px;background:{background};"
        f'display:grid;place-items:center;overflow:hidden">{body}</body>'
    )


# name -> (canvas px, background, mark px, mark colour)
# iOS icon must be opaque; adaptive foreground/monochrome keep the mark inside
# Android's 66% safe zone; the splash sits on its own background. The web
# tab icon is not here: it needs its own proportions to survive sixteen
# pixels, and lives in public/icon.svg with scripts/web-icons.py.
TARGETS: dict[str, tuple[int, str, int, str]] = {
    "icon.png": (1024, NIGHT_GLOW, 680, "url(#warm)"),
    "splash-icon.png": (1024, "transparent", 900, "url(#warm)"),
    "android-icon-background.png": (1024, NIGHT_GLOW, 0, "none"),
    "android-icon-foreground.png": (1024, "transparent", 560, "url(#warm)"),
    "android-icon-monochrome.png": (1024, "transparent", 560, "#ffffff"),
}


def render(name: str, size: int, background: str, mark_size: int, color: str) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        html = Path(tmp) / "page.html"
        html.write_text(page(size, background, mark_size, color))
        out = Path(tmp) / "out.png"
        subprocess.run(
            [
                CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                "--force-device-scale-factor=1", "--default-background-color=00000000",
                f"--window-size={size},{size}", f"--screenshot={out}",
                "--virtual-time-budget=1000", html.as_uri(),
            ],
            check=True, capture_output=True,
        )
        (ASSETS / name).write_bytes(out.read_bytes())
    print(f"{name}: {size}px")


def main() -> int:
    if not os.path.exists(CHROME):
        print(f"Chrome not found at {CHROME}", file=sys.stderr)
        return 1
    for name, spec in TARGETS.items():
        render(name, *spec)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
