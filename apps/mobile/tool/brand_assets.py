"""Renders the FoodFox app icons and native launch-screen seed from code.

The icon is the splash logo (Figma «Клиент · Splash при запуске», SP4) cut
down for small sizes: the three-zone ring (60 / 10 / 30 %, butt ends,
4.6° gaps) with FOX centred inside it on the brand green. «FOOD XPLORER» is
left out on purpose: at 60 px it would be a grey smear.

Run from apps/mobile:  python3 tool/brand_assets.py
Needs Pillow and assets/fonts/Manrope-Variable.ttf.
"""

import json
import math
import os

from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, "assets/fonts/Manrope-Variable.ttf")

BG_GREEN = (0x21, 0x25, 0x1D)
LIME = (0xE7, 0xF5, 0x51)
AMBER = (0xE8, 0xB4, 0x4A)
TERRACOTTA = (0xC0, 0x56, 0x3C)
TEXT = (0xF8, 0xF9, 0xF6)

SEGMENTS = [(0.60, LIME), (0.10, AMBER), (0.30, TERRACOTTA)]
GAP_DEG = 4.6
STROKE_PER_D = 9.5 / 160  # Figma: 160 px ring, 9.5 px stroke.
FOX_PER_D = 0.245  # FOX cap size against the ring (Figma 0.25 with the subline).
SS = 4  # supersampling


def _fox_font(px):
    f = ImageFont.truetype(FONT, px)
    f.set_variation_by_axes([800])
    return f


def _draw_fox(draw, size, cx, cy, height_px, fill):
    """FOX with 0.05 em tracking, centred on its ink (not its advance box)."""
    font = _fox_font(int(height_px))
    tracking = 0.05 * height_px
    letters = "FOX"
    widths = [draw.textlength(ch, font=font) for ch in letters]
    layer = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(layer)
    x = 0.0
    for ch, w in zip(letters, widths):
        d.text((x, 0), ch, font=font, fill=255)
        x += w + tracking
    l, t, r, b = layer.getbbox()
    ink = layer.crop((l, t, r, b))
    ox = round(cx - (r - l) / 2)
    oy = round(cy - (b - t) / 2)
    colour = Image.new("RGBA", ink.size, fill + (255,))
    draw._image.paste(colour, (ox, oy), ink)


def _draw_ring(img, cx, cy, diameter, colours=None):
    stroke = diameter * STROKE_PER_D
    r_out = diameter / 2
    box = [cx - r_out, cy - r_out, cx + r_out, cy + r_out]
    start = -90.0
    for i, (frac, colour) in enumerate(SEGMENTS):
        sweep = frac * 360
        c = colours[i] if colours else colour
        layer = Image.new("L", img.size, 0)
        ImageDraw.Draw(layer).arc(
            box,
            start + GAP_DEG / 2,
            start + sweep - GAP_DEG / 2,
            fill=255,
            width=round(stroke),
        )
        img.paste(Image.new("RGBA", img.size, c + (255,)), (0, 0), layer)
        start += sweep


def _glow(size, cx, cy, radius, strength):
    """Lime radial glow from the splash (0x3A lime fading to nothing)."""
    g = Image.new("L", (size, size), 0)
    px = g.load()
    for y in range(size):
        for x in range(size):
            d = math.hypot(x - cx, y - cy) / radius
            if d < 1:
                px[x, y] = round(strength * (1 - d) ** 1.6)
    return g


def render(size, ring_frac=0.60, background=True, mono=False, logo=True):
    """One square image. ring_frac is the ring's outer diameter / side."""
    n = size * SS
    img = Image.new("RGBA", (n, n), BG_GREEN + (255,) if background else (0, 0, 0, 0))
    c = n / 2
    if background:
        glow = _glow(n // 8, n / 16, n / 16, n / 16 * 0.95, 0x3A).resize((n, n), Image.BICUBIC)
        img.paste(Image.new("RGBA", (n, n), LIME + (255,)), (0, 0), glow)
    if not logo:
        return img.resize((size, size), Image.LANCZOS)
    d = n * ring_frac
    white = (255, 255, 255)
    _draw_ring(img, c, c, d, [white] * 3 if mono else None)
    _draw_fox(ImageDraw.Draw(img), n, c, c, d * FOX_PER_D / 0.72, white if mono else TEXT)
    return img.resize((size, size), Image.LANCZOS)


def _rounded(img, radius_frac, circle=False):
    n = img.size[0] * SS
    mask = Image.new("L", (n, n), 0)
    d = ImageDraw.Draw(mask)
    if circle:
        d.ellipse([0, 0, n - 1, n - 1], fill=255)
    else:
        d.rounded_rectangle([0, 0, n - 1, n - 1], radius=n * radius_frac, fill=255)
    mask = mask.resize(img.size, Image.LANCZOS)
    out = img.copy()
    out.putalpha(ImageChops.multiply(img.getchannel("A"), mask))
    return out


def ios():
    base = os.path.join(ROOT, "ios/Runner/Assets.xcassets")
    icon_dir = os.path.join(base, "AppIcon.appiconset")
    master = render(1024).convert("RGB")  # App Store: no alpha channel.
    with open(os.path.join(icon_dir, "Contents.json")) as f:
        spec = json.load(f)
    for entry in spec["images"]:
        pts = float(entry["size"].split("x")[0])
        px = round(pts * int(entry["scale"][0]))
        out = master if px == 1024 else master.resize((px, px), Image.LANCZOS)
        out.save(os.path.join(icon_dir, entry["filename"]), optimize=True)

    seed_dir = os.path.join(base, "LaunchImage.imageset")
    for scale, name in ((1, "LaunchImage.png"), (2, "LaunchImage@2x.png"), (3, "LaunchImage@3x.png")):
        px = 12 * scale
        n = px * SS
        dot = Image.new("RGBA", (n, n), (0, 0, 0, 0))
        ImageDraw.Draw(dot).ellipse([0, 0, n - 1, n - 1], fill=LIME + (255,))
        dot.resize((px, px), Image.LANCZOS).save(os.path.join(seed_dir, name), optimize=True)


ANDROID_DENSITIES = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}


def android():
    res = os.path.join(ROOT, "android/app/src/main/res")
    for name, k in ANDROID_DENSITIES.items():
        folder = os.path.join(res, f"mipmap-{name}")
        os.makedirs(folder, exist_ok=True)
        legacy = round(48 * k)
        full = render(legacy)
        _rounded(full, 0.2).save(os.path.join(folder, "ic_launcher.png"), optimize=True)
        _rounded(full, 0, circle=True).save(os.path.join(folder, "ic_launcher_round.png"), optimize=True)
        # Adaptive layers: 108 dp canvas, 72 dp visible; the ring keeps the
        # same share of the visible area as on iOS (0.60 of 72 dp).
        adaptive = round(108 * k)
        ring = 0.60 * 72 / 108
        render(adaptive, ring_frac=ring, background=False).save(
            os.path.join(folder, "ic_launcher_foreground.png"), optimize=True)
        render(adaptive, ring_frac=ring, background=False, mono=True).save(
            os.path.join(folder, "ic_launcher_monochrome.png"), optimize=True)
        bg = render(adaptive, logo=False).convert("RGB")
        bg.save(os.path.join(folder, "ic_launcher_background.png"), optimize=True)


if __name__ == "__main__":
    ios()
    android()
