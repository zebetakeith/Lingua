"""Flatten Goo Keep minion seeds to small, audited cut-paper palettes."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public" / "assets" / "goo-keep" / "units"
ART = ROOT / "art-source" / "goo-keep" / "characters" / "unit-rigs-flat"


UNITS = {
    "piplet": ("friendly", "seed-v1.png", ["#b8e52f", "#72c431", "#283451", "#fff2bf", "#ff9b73", "#2f9c78"]),
    "dartlet": ("friendly", "seed-v1.png", ["#ff8050", "#e54e3f", "#293658", "#26b5bd", "#ffe5a8", "#77d6a0"]),
    "bubbleBud": ("friendly", "seed-v1.png", ["#59d8ef", "#2787c4", "#253756", "#e7fbff", "#2a928f"]),
    "mendlet": ("friendly", "seed-v1.png", ["#9be7c0", "#4fb78a", "#294453", "#ff8395", "#fff3cf", "#ffffff"]),
    "spitlet": ("friendly", "seed-v1.png", ["#9a73df", "#6040a0", "#243348", "#23a7a4", "#f4dcff"]),
    "bigChonk": ("friendly", "seed-v2.png", ["#8dd13d", "#4c9b44", "#274050", "#4b8f6a", "#f6edc5"]),
    "shellSlime": ("enemy", "seed-v1.png", ["#6f7ea8", "#394062", "#e6d1ad", "#b59678", "#dca7a8", "#fff6df", "#4a2d62"]),
    "nibbleImp": ("enemy", "seed-v1.png", ["#ef5b46", "#a83638", "#33273d", "#ffe1b6", "#ff9b4d", "#5f304d"]),
    "sporeBud": ("enemy", "seed-v2.png", ["#b65386", "#70325f", "#f2ddb7", "#e191a8", "#36243e", "#fff1cf"]),
    "boomcap": ("enemy", "seed-v1.png", ["#f3ddb5", "#f27d3d", "#f3c45e", "#438f91", "#293744", "#ff8c68"]),
    "echoMoth": ("enemy", "seed-v2.png", ["#7660bd", "#4a3c83", "#a693de", "#62d4e9", "#29233f", "#f3eeff"]),
    "rootLump": ("enemy", "seed-v2.png", ["#738b39", "#445f31", "#8f5d35", "#553b2a", "#a5a287", "#ff7a34", "#2d2c2a"]),
}


def hex_rgb(value: str) -> tuple[int, int, int]:
    value = value.removeprefix("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def flatten_seed(source: Image.Image, palette_hex: list[str]) -> Image.Image:
    image = source.convert("RGBA")
    palette = [hex_rgb(value) for value in palette_hex]
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0:
                continue
            nearest = min(
                palette,
                key=lambda color: (red - color[0]) ** 2 + (green - color[1]) ** 2 + (blue - color[2]) ** 2,
            )
            pixels[x, y] = (*nearest, alpha)
    return image


def build_preview(entries: list[tuple[str, Image.Image]]) -> Image.Image:
    cell = 184
    preview = Image.new("RGBA", (cell * 6, cell * 2), (244, 241, 222, 255))
    for index, (_, image) in enumerate(entries):
        x = (index % 6) * cell + 12
        y = (index // 6) * cell + 12
        preview.alpha_composite(image, (x, y))
    return preview


def main() -> None:
    ART.mkdir(parents=True, exist_ok=True)
    manifest = {}
    previews = []
    for kind, (side, source_name, palette) in UNITS.items():
        source_path = PUBLIC / side / kind / source_name
        output = flatten_seed(Image.open(source_path), palette)
        public_path = PUBLIC / side / kind / "seed-flat-v1.png"
        art_dir = ART / kind
        art_dir.mkdir(parents=True, exist_ok=True)
        output.save(public_path, optimize=True)
        output.save(art_dir / "seed-flat-v1.png", optimize=True)
        manifest[kind] = {"side": side, "source": source_name, "palette": palette, "size": list(output.size)}
        previews.append((kind, output))
        print(f"Built flat minion seed: {kind}")

    build_preview(previews).save(ART / "unit-roster-flat-preview.png", optimize=True)
    (ART / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
