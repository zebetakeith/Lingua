from __future__ import annotations

import math
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "public" / "assets" / "goo-keep"
OUTPUT_ROOT = ASSET_ROOT / "runtime-sheets"

UNIT_ASSET_ROOTS = {
    "piplet": "units/friendly/piplet",
    "dartlet": "units/friendly/dartlet",
    "bubbleBud": "units/friendly/bubbleBud",
    "mendlet": "units/friendly/mendlet",
    "spitlet": "units/friendly/spitlet",
    "bigChonk": "units/friendly/bigChonk",
    "shellSlime": "units/enemy/shellSlime",
    "nibbleImp": "units/enemy/nibbleImp",
    "sporeBud": "units/enemy/sporeBud",
    "boomcap": "units/enemy/boomcap",
    "echoMoth": "units/enemy/echoMoth",
    "rootLump": "units/enemy/rootLump",
}

PIPPLO_ANIMATIONS = {
    "idle": 16,
    "summon": 8,
    "hit": 12,
    "devour": 16,
    "defeat": 8,
}


def pack_sheet(frames: list[Path], destination: Path, frame_size: int, columns: int = 4) -> None:
    rows = math.ceil(len(frames) / columns)
    sheet = Image.new("RGBA", (columns * frame_size, rows * frame_size), (0, 0, 0, 0))
    for index, frame_path in enumerate(frames):
        with Image.open(frame_path) as source:
            frame = source.convert("RGBA")
        if frame.size != (frame_size, frame_size):
            raise ValueError(f"{frame_path} is {frame.size}, expected {(frame_size, frame_size)}")
        x = (index % columns) * frame_size
        y = (index // columns) * frame_size
        sheet.alpha_composite(frame, (x, y))
    destination.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(destination, optimize=True)


def main() -> None:
    outputs: list[Path] = []
    for kind, relative_root in UNIT_ASSET_ROOTS.items():
        for animation in ("walk", "attack"):
            frames = [ASSET_ROOT / relative_root / animation / f"{frame:02d}.png" for frame in range(1, 5)]
            destination = OUTPUT_ROOT / "units" / f"{kind}-{animation}.png"
            pack_sheet(frames, destination, 160)
            outputs.append(destination)

    pipplo_root = ASSET_ROOT / "characters" / "pipplo" / "whole-sprite-v2"
    for animation, count in PIPPLO_ANIMATIONS.items():
        frames = [pipplo_root / animation / f"{frame:02d}.png" for frame in range(1, count + 1)]
        destination = OUTPUT_ROOT / "pipplo" / f"{animation}.png"
        pack_sheet(frames, destination, 256)
        outputs.append(destination)

    print(f"Built {len(outputs)} Goo Keep runtime sheets in {OUTPUT_ROOT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
