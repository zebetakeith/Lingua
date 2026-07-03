"""Build palette-locked flat raster layers for the Goo Keep battlefield generals.

The source boards are intentionally kept as art-source files. This script removes
the chroma background, collapses every visible pixel to a small character palette,
and exports independent transparent layers for the runtime puppet rigs.
"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "art-source" / "goo-keep" / "characters" / "generals-flat"
PUBLIC_ROOT = ROOT / "public" / "assets" / "goo-keep" / "characters" / "generals-flat"


RIGS = {
    "mallow": {
        "palette": [
            "#493779", "#37265f", "#a99aed", "#ffefbd", "#ffc83d",
            "#ff6c70", "#7a402d", "#24182f", "#fff8e8",
        ],
        "parts": {
            "hood": (35, 30, 520, 705),
            "body": (525, 45, 930, 710),
            "pom": (860, 45, 985, 225),
            "staff": (970, 45, 1225, 925),
            "arm-left": (45, 675, 185, 940),
            "arm-right": (510, 680, 655, 945),
            "book": (790, 700, 1025, 970),
            "eye-left": (675, 975, 770, 1070),
            "mouth": (780, 975, 885, 1070),
            "eye-right": (890, 975, 990, 1070),
            "foot-left-outer": (40, 955, 175, 1215),
            "foot-left-inner": (185, 955, 335, 1215),
            "foot-right-inner": (345, 955, 500, 1215),
            "foot-right-outer": (505, 955, 660, 1215),
            "cheek-star": (885, 1060, 1000, 1190),
        },
    },
    "clackback": {
        "palette": [
            "#8272c4", "#5a468c", "#f7dfb6", "#d38dbb", "#ee9bc5",
            "#ff746b", "#f5c55e", "#44325f", "#241d2c", "#fff8e8",
        ],
        "parts": {
            "staff": (65, 35, 275, 525),
            "body": (310, 150, 775, 595),
            "shell": (860, 30, 1465, 580),
            "claw-left": (35, 550, 365, 800),
            "claw-right": (585, 545, 885, 815),
            "crown": (875, 520, 1250, 755),
            "brow-left": (225, 735, 345, 825),
            "brow-right": (405, 735, 525, 825),
            "eye-left": (210, 795, 345, 920),
            "eye-right": (415, 795, 550, 920),
            "mouth": (305, 875, 445, 965),
            "scarf": (820, 770, 1470, 1000),
        },
    },
    "puffmaestro": {
        "palette": [
            "#65336f", "#4d275d", "#f4d79c", "#ff6862", "#ff9f2c",
            "#2c9da7", "#1f7585", "#a9cee8", "#ff845b", "#3b2034",
            "#f05c73", "#fff4da",
        ],
        "parts": {
            "cap": (25, 5, 910, 560),
            "body": (875, 25, 1345, 560),
            "arm-left": (55, 525, 415, 695),
            "arm-right": (485, 525, 885, 710),
            "foot-left": (900, 550, 1090, 685),
            "foot-right": (1130, 550, 1315, 685),
            "fan": (25, 665, 485, 1010),
            "charm-cord": (470, 740, 735, 995),
            "charm-blue": (735, 765, 945, 1010),
            "charm-coral": (915, 765, 1140, 1010),
            "eye-left": (1155, 675, 1260, 795),
            "eye-right": (1250, 675, 1360, 795),
            "mouth": (1160, 770, 1340, 895),
            "drop": (1180, 845, 1330, 1015),
        },
    },
    "thumblestump": {
        "palette": [
            "#ef7632", "#d85e28", "#7c4932", "#633923", "#ffb429",
            "#ff5e39", "#f3bd72", "#8a913c", "#f7d59d", "#48261c",
        ],
        "parts": {
            "branch-left": (170, 30, 500, 335),
            "branch-center": (545, 0, 850, 345),
            "branch-right": (815, 50, 1120, 345),
            "top-rings": (325, 310, 715, 445),
            "body": (215, 405, 795, 865),
            "arm-left": (0, 430, 245, 735),
            "arm-right": (755, 425, 1020, 745),
            "drum": (960, 385, 1280, 800),
            "staff": (1250, 365, 1510, 815),
            "root-left-outer": (60, 800, 290, 1020),
            "root-left-inner": (285, 800, 520, 1020),
            "root-center": (505, 805, 750, 1020),
            "root-right-inner": (745, 800, 980, 1020),
            "root-right-outer": (965, 800, 1215, 1020),
            "eye-left": (1015, 290, 1100, 390),
            "eye-right": (1150, 290, 1240, 390),
            "mouth": (1030, 350, 1230, 460),
        },
        "erase": {
            "body": [(405, 500, 620, 590)],
        },
    },
    "broodle": {
        "palette": [
            "#5d286b", "#472050", "#ff5d62", "#f9d993", "#f4af2f",
            "#f88850", "#2d182f", "#1f1424", "#fff8e8", "#9b4b73",
        ],
        "parts": {
            "ear-left": (10, 10, 365, 470),
            "ear-right": (875, 10, 1235, 470),
            "horn-left": (515, 75, 625, 205),
            "horn-right": (640, 75, 755, 205),
            "body": (375, 220, 875, 805),
            "arm-left": (95, 465, 375, 685),
            "arm-right": (880, 465, 1160, 695),
            "eye-left": (110, 675, 205, 775),
            "eye-right": (250, 675, 350, 775),
            "mouth": (155, 725, 325, 850),
            "tail": (865, 680, 1190, 1160),
            "satchel": (390, 770, 850, 1160),
            "bell": (10, 875, 200, 1215),
            "medal": (240, 860, 390, 1050),
            "foot-left": (300, 1100, 490, 1225),
            "foot-right": (735, 1100, 945, 1225),
        },
    },
}


def hex_rgb(value: str) -> tuple[int, int, int]:
    value = value.removeprefix("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def flatten_board(image: Image.Image, palette_hex: list[str]) -> Image.Image:
    source = image.convert("RGB")
    palette = [hex_rgb(value) for value in palette_hex]
    output = Image.new("RGBA", source.size, (0, 0, 0, 0))
    src = source.load()
    dst = output.load()

    for y in range(source.height):
        for x in range(source.width):
            red, green, blue = src[x, y]
            separation = green - max(red, blue)
            if green > 135 and separation >= 72:
                continue
            alpha = 255
            if green > 130 and separation > 30:
                alpha = max(0, min(255, int(255 * (72 - separation) / 42)))
                if alpha == 0:
                    continue
            nearest = min(
                palette,
                key=lambda color: (red - color[0]) ** 2 + (green - color[1]) ** 2 + (blue - color[2]) ** 2,
            )
            dst[x, y] = (*nearest, alpha)
    return output


def crop_part(board: Image.Image, box: tuple[int, int, int, int], erase_boxes: list[tuple[int, int, int, int]]) -> Image.Image:
    part = board.crop(box)
    if erase_boxes:
        pixels = part.load()
        body_color = (239, 118, 50, 255)
        for erase in erase_boxes:
            left = max(0, erase[0] - box[0])
            top = max(0, erase[1] - box[1])
            right = min(part.width, erase[2] - box[0])
            bottom = min(part.height, erase[3] - box[1])
            for y in range(top, bottom):
                for x in range(left, right):
                    if pixels[x, y][3] > 0:
                        pixels[x, y] = body_color
    alpha_box = part.getchannel("A").getbbox()
    if alpha_box is None:
        raise ValueError(f"Crop {box} produced an empty layer")
    pad = 6
    left = max(0, alpha_box[0] - pad)
    top = max(0, alpha_box[1] - pad)
    right = min(part.width, alpha_box[2] + pad)
    bottom = min(part.height, alpha_box[3] + pad)
    return part.crop((left, top, right, bottom))


def build_rig(name: str, spec: dict) -> None:
    source_dir = SOURCE_ROOT / name
    source = Image.open(source_dir / "source-board-generated.png")
    board = flatten_board(source, spec["palette"])
    board.save(source_dir / "source-board-flat.png", optimize=True)

    source_layers = source_dir / "layers"
    public_layers = PUBLIC_ROOT / name / "layers"
    source_layers.mkdir(parents=True, exist_ok=True)
    public_layers.mkdir(parents=True, exist_ok=True)

    manifest = {"palette": spec["palette"], "sourceSize": list(source.size), "parts": {}}
    for part_name, box in spec["parts"].items():
        erase_boxes = spec.get("erase", {}).get(part_name, [])
        layer = crop_part(board, box, erase_boxes)
        filename = f"{part_name}.png"
        layer.save(source_layers / filename, optimize=True)
        layer.save(public_layers / filename, optimize=True)
        manifest["parts"][part_name] = {"file": filename, "size": list(layer.size), "sourceCrop": list(box)}

    (source_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    for name, spec in RIGS.items():
        build_rig(name, spec)
        print(f"Built flat leader rig: {name}")


if __name__ == "__main__":
    main()
