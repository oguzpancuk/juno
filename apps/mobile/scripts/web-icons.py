#!/usr/bin/env python3
"""Rasterise public/icon.svg into the two files a browser actually asks for.

    python3 apps/mobile/scripts/web-icons.py

Writes, next to the SVG:

  favicon.ico          16, 32 and 48 px, transparent corners
  apple-touch-icon.png 180 px, opaque — iOS rounds it itself and paints
                       any transparency black

Chrome does the rendering, as in `brand-assets.py`: it is the only SVG
engine this machine is guaranteed to have, and it is the same engine that
will draw the tab. Pillow assembles the .ico, which Chrome cannot write.

Run it after any change to `public/icon.svg`; the outputs are committed so
a deploy never depends on this script having been run.
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
PUBLIC = HERE.parent / "public"
SVG = PUBLIC / "icon.svg"

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# What goes into the .ico. 48 is what Windows and the bookmark bar reach
# for, 32 the retina tab, 16 the tab itself.
ICO_SIZES = (16, 32, 48)
# Safari's home-screen icon. Opaque: iOS masks the corners on its own and
# composites what is left over black, so a transparent corner turns into a
# black one on a white springboard.
TOUCH_SIZE = 180
GROUND = "#07060F"


def shot(size: int, transparent: bool, out: Path) -> None:
    """Render the SVG into a `size`×`size` PNG with headless Chrome."""
    page = (
        f'<body style="margin:0;width:{size}px;height:{size}px;'
        f'background:{"transparent" if transparent else GROUND};overflow:hidden">'
        f'<img src="{SVG.as_uri()}" width="{size}" height="{size}">'
        "</body>"
    )
    with tempfile.TemporaryDirectory() as tmp:
        html = Path(tmp) / "page.html"
        html.write_text(page)
        subprocess.run(
            [
                CHROME,
                "--headless",
                "--disable-gpu",
                "--allow-file-access-from-files",
                f"--screenshot={out}",
                f"--window-size={size},{size}",
                "--default-background-color=00000000",
                "--hide-scrollbars",
                html.as_uri(),
            ],
            check=True,
            capture_output=True,
        )


def main() -> int:
    if not Path(CHROME).exists():
        print(f"Google Chrome not found at {CHROME}", file=sys.stderr)
        return 1
    with tempfile.TemporaryDirectory() as tmp:
        frames = []
        for size in ICO_SIZES:
            png = Path(tmp) / f"{size}.png"
            shot(size, transparent=True, out=png)
            frames.append(Image.open(png).convert("RGBA"))
        # Pillow writes one .ico holding every frame; the largest carries
        # the sizes list, the rest ride along.
        frames[-1].save(
            PUBLIC / "favicon.ico",
            format="ICO",
            sizes=[(s, s) for s in ICO_SIZES],
            append_images=frames[:-1],
        )
        touch = Path(tmp) / "touch.png"
        shot(TOUCH_SIZE, transparent=False, out=touch)
        Image.open(touch).convert("RGB").save(PUBLIC / "apple-touch-icon.png")
    print(f"wrote {PUBLIC / 'favicon.ico'} and {PUBLIC / 'apple-touch-icon.png'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
