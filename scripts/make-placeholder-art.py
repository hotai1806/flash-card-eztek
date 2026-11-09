#!/usr/bin/env python3
"""Generate placeholder pictures for the sample sections.

Run by hand from the repo root:  python3 scripts/make-placeholder-art.py
Requires Python 3 and Pillow. Never part of the app build; the PNGs are committed.

The table below mirrors content/sections.ts (same ids, same word order = tile order)
and is kept in sync by hand. Each picture is cols*TILE by rows*TILE pixels: a few
horizontal colour bands as a scene background, then one large emoji per cell.
If the colour emoji font is missing or a glyph fails, that cell falls back to a
pastel fill, a circle, and the English word, so the script never fails.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

TILE = 300
EMOJI_FONT = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"
EMOJI_SIZE = 109  # the only size Pillow accepts for this bitmap font
TEXT_FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
OUT_DIR = Path("assets/sections")
GLYPH_FRACTION = 0.55
PASTELS = ["#f8c8c8", "#f8e0b0", "#f6f2b0", "#c8ecc8", "#c0e4f4", "#d0c8f4", "#f4c8e8", "#d8d8d8"]

SECTIONS = [
    {
        "id": "kitchen", "cols": 3, "rows": 3,
        "bands": ["#f6e7c1", "#c9a27e", "#8d6e63"],  # wall, counter, floor
        "cells": [("fork", "🍴"), ("spoon", "🥄"), ("knife", "🔪"), ("plate", "🍽️"), ("cup", "☕"),
                  ("pot", "🍲"), ("pan", "🍳"), ("stove", "🔥"), ("sink", "🚰")],
    },
    {
        "id": "beach", "cols": 3, "rows": 2,
        "bands": ["#bfe3ff", "#5aa9e6", "#f3dba5"],  # sky, sea, sand
        "cells": [("sand", "🏖️"), ("wave", "🌊"), ("shell", "🐚"), ("sun", "☀️"), ("crab", "🦀"),
                  ("umbrella", "⛱️")],
    },
    {
        "id": "classroom", "cols": 4, "rows": 2,
        "bands": ["#e8f1e4", "#2f5d50", "#c8b08a"],  # wall, board, floor
        "cells": [("book", "📖"), ("pencil", "✏️"), ("chair", "🪑"), ("clock", "🕒"), ("backpack", "🎒"),
                  ("ruler", "📏"), ("globe", "🌍"), ("scissors", "✂️")],
    },
]


def load_emoji_font():
    try:
        return ImageFont.truetype(EMOJI_FONT, EMOJI_SIZE)
    except OSError:
        return None


def load_text_font(size):
    try:
        return ImageFont.truetype(TEXT_FONT, size)
    except OSError:
        return ImageFont.load_default()


def render_emoji(font, emoji):
    """Return a cropped RGBA sprite of the emoji, or None if it cannot be drawn."""
    if font is None:
        return None
    try:
        canvas = Image.new("RGBA", (EMOJI_SIZE * 2, EMOJI_SIZE * 2), (0, 0, 0, 0))
        ImageDraw.Draw(canvas).text((EMOJI_SIZE // 4, EMOJI_SIZE // 4), emoji, font=font, embedded_color=True)
        box = canvas.getbbox()
        return canvas.crop(box) if box else None
    except Exception:  # noqa: BLE001 - any glyph problem means "use the fallback"
        return None


def darker(hex_colour, factor=0.7):
    r, g, b = (int(hex_colour[i:i + 2], 16) for i in (1, 3, 5))
    return tuple(int(c * factor) for c in (r, g, b))


def draw_bands(img, bands):
    draw = ImageDraw.Draw(img)
    band_h = img.height / len(bands)
    for i, colour in enumerate(bands):
        draw.rectangle([0, round(i * band_h), img.width, round((i + 1) * band_h)], fill=colour)


def draw_fallback(img, x0, y0, word, index, text_font):
    draw = ImageDraw.Draw(img)
    pastel = PASTELS[index % len(PASTELS)]
    draw.rectangle([x0, y0, x0 + TILE, y0 + TILE], fill=pastel)
    d = round(TILE * GLYPH_FRACTION)
    cx, cy = x0 + TILE / 2, y0 + TILE / 2
    draw.ellipse([cx - d / 2, cy - d / 2, cx + d / 2, cy + d / 2], fill=darker(pastel))
    draw.text((cx, cy), word, font=text_font, fill="#222222", anchor="mm")


def main():
    emoji_font = load_emoji_font()
    text_font = load_text_font(40)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    target = round(TILE * GLYPH_FRACTION)
    for section in SECTIONS:
        cols, rows = section["cols"], section["rows"]
        assert len(section["cells"]) == cols * rows, section["id"]
        img = Image.new("RGBA", (cols * TILE, rows * TILE))
        draw_bands(img, section["bands"])
        for index, (word, emoji) in enumerate(section["cells"]):
            x0, y0 = (index % cols) * TILE, (index // cols) * TILE
            sprite = render_emoji(emoji_font, emoji)
            if sprite is None:
                draw_fallback(img, x0, y0, word, index, text_font)
                continue
            scale = target / max(sprite.size)
            sprite = sprite.resize((max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))),
                                   Image.Resampling.LANCZOS)
            px = x0 + (TILE - sprite.width) // 2
            py = y0 + (TILE - sprite.height) // 2
            img.alpha_composite(sprite, (px, py))
        path = OUT_DIR / f"{section['id']}.png"
        img.convert("RGB").save(path, optimize=True)
        print(f"wrote {path} {img.width}x{img.height}")


if __name__ == "__main__":
    main()
