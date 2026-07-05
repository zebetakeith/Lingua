"""Normalize every non-Pipplo general master for cohesive battlefield use."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_OUT = ROOT / "public" / "assets" / "goo-keep" / "characters" / "generals" / "runtime-v1"
ART_OUT = ROOT / "art-source" / "goo-keep" / "characters" / "generals" / "runtime-v1"
FRAME_SIZE = 320
GROUND_Y = 309
MAX_WIDTH = 300
MAX_HEIGHT = 292

SOURCES = {
    "clackback": ROOT / "public" / "assets" / "goo-keep" / "characters" / "generals" / "clackback" / "clackback-master-v1.png",
    "puffmaestro": ROOT / "public" / "assets" / "goo-keep" / "characters" / "generals" / "puffmaestro" / "puffmaestro-master-v1.png",
    "thumblestump": ROOT / "public" / "assets" / "goo-keep" / "characters" / "generals" / "thumblestump" / "thumblestump-master-v1.png",
    "broodle": ROOT / "public" / "assets" / "goo-keep" / "characters" / "generals" / "broodle" / "broodle-master-v1.png",
    "mallow": ROOT / "public" / "assets" / "goo-keep" / "characters" / "generals" / "mallow" / "mallow-moon-master-v1.png",
}


def normalize(source_path: Path) -> Image.Image:
    source = Image.open(source_path).convert("RGBA")
    bounds = source.getchannel("A").getbbox()
    if not bounds:
        raise RuntimeError(f"{source_path} has no visible pixels")
    sprite = source.crop(bounds)
    scale = min(MAX_WIDTH / sprite.width, MAX_HEIGHT / sprite.height)
    sprite = sprite.resize(
        (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))),
        Image.Resampling.LANCZOS,
    )
    frame = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    frame.alpha_composite(sprite, (round((FRAME_SIZE - sprite.width) / 2), GROUND_Y - sprite.height))
    return frame


def main() -> None:
    PUBLIC_OUT.mkdir(parents=True, exist_ok=True)
    ART_OUT.mkdir(parents=True, exist_ok=True)
    frames: list[tuple[str, Image.Image]] = []
    for name, source_path in SOURCES.items():
        frame = normalize(source_path)
        frame.save(PUBLIC_OUT / f"{name}.png", optimize=True)
        frames.append((name, frame))

    preview = Image.new("RGB", (FRAME_SIZE * len(frames), FRAME_SIZE + 34), (247, 243, 222))
    draw = ImageDraw.Draw(preview)
    for index, (name, frame) in enumerate(frames):
        preview.paste(frame, (index * FRAME_SIZE, 0), frame)
        draw.text((index * FRAME_SIZE + 12, FRAME_SIZE + 8), name, fill=(37, 67, 71))
    preview.save(ART_OUT / "general-runtime-roster.png", optimize=True)
    print(f"Built {len(frames)} cohesive general sprites")


if __name__ == "__main__":
    main()
