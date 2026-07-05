"""Build Pipplo's cohesive whole-sprite animation library.

Each frame is a complete drawing transformed as a single piece. The fixed
256px canvas and bottom-center anchor keep every action interchangeable in
Phaser without exposing independent limbs, face pieces, or antenna parts.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art-source" / "goo-keep" / "characters" / "pipplo" / "whole-sprite-v2" / "pipplo-base.png"
PUBLIC_OUT = ROOT / "public" / "assets" / "goo-keep" / "characters" / "pipplo" / "whole-sprite-v2"
ART_OUT = ROOT / "art-source" / "goo-keep" / "characters" / "pipplo" / "whole-sprite-v2"
POSED_SUMMON_GRID = ART_OUT / "posed-summon" / "pipplo-summon-grid.png"

FRAME_SIZE = 256
GROUND_Y = 246
NEUTRAL_HEIGHT = 216


@dataclass(frozen=True)
class Pose:
    scale_x: float = 1
    scale_y: float = 1
    x: float = 0
    lift: float = 0
    angle: float = 0
    shear: float = 0


def smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3 - 2 * value)


def between(value: float, start: float, end: float) -> float:
    if end <= start:
        return 1
    return smoothstep((value - start) / (end - start))


def mix_pose(left: Pose, right: Pose, amount: float) -> Pose:
    amount = smoothstep(amount)
    return Pose(**{
        field: getattr(left, field) + (getattr(right, field) - getattr(left, field)) * amount
        for field in Pose.__dataclass_fields__
    })


def keyframed(value: float, keys: list[tuple[float, Pose]]) -> Pose:
    if value <= keys[0][0]:
        return keys[0][1]
    for (start, left), (end, right) in zip(keys, keys[1:]):
        if value <= end:
            return mix_pose(left, right, (value - start) / (end - start))
    return keys[-1][1]


def idle_pose(value: float) -> Pose:
    phase = value * math.tau
    breath = math.sin(phase)
    sway = math.sin(phase + math.pi / 4)
    return Pose(
        scale_x=1 + breath * 0.018,
        scale_y=1 - breath * 0.018,
        x=sway * 1.2,
        lift=max(0, math.sin(phase * 2)) * 1.4,
        angle=sway * 0.65,
        shear=math.sin(phase - 0.35) * 0.012,
    )


def hit_pose(value: float) -> Pose:
    return keyframed(value, [
        (0.00, Pose()),
        (0.16, Pose(scale_x=0.88, scale_y=1.07, x=-8, lift=3, angle=-5, shear=-0.045)),
        (0.36, Pose(scale_x=1.08, scale_y=0.93, x=4, lift=-1, angle=3.2, shear=0.028)),
        (0.56, Pose(scale_x=0.96, scale_y=1.035, x=-2, lift=1, angle=-2.1, shear=-0.016)),
        (0.76, Pose(scale_x=1.025, scale_y=0.98, x=1, angle=1.1, shear=0.008)),
        (1.00, Pose()),
    ])


def devour_pose(value: float) -> Pose:
    return keyframed(value, [
        (0.00, Pose()),
        (0.14, Pose(scale_x=1.08, scale_y=0.92, x=-2, lift=-1, angle=-1.5, shear=-0.012)),
        (0.34, Pose(scale_x=0.90, scale_y=1.13, x=10, lift=14, angle=4.2, shear=0.042)),
        (0.50, Pose(scale_x=1.12, scale_y=0.88, x=7, lift=2, angle=-2.4, shear=-0.025)),
        (0.66, Pose(scale_x=1.08, scale_y=0.93, x=2, lift=-2, angle=2.2, shear=0.016)),
        (0.82, Pose(scale_x=0.97, scale_y=1.035, lift=3, angle=-1.1)),
        (1.00, Pose()),
    ])


ANIMATIONS = {
    "idle": (16, idle_pose, 125),
    "hit": (12, hit_pose, 70),
    "devour": (16, devour_pose, 92),
}


def prepare_source() -> Image.Image:
    source = Image.open(SOURCE).convert("RGBA")
    bounds = source.getchannel("A").getbbox()
    if not bounds:
        raise RuntimeError("Pipplo base has no visible pixels")
    return source.crop(bounds)


def render_pose(source: Image.Image, pose: Pose) -> Image.Image:
    neutral_width = round(source.width * NEUTRAL_HEIGHT / source.height)
    width = max(1, round(neutral_width * pose.scale_x))
    height = max(1, round(NEUTRAL_HEIGHT * pose.scale_y))
    sprite = source.resize((width, height), Image.Resampling.LANCZOS)

    if pose.shear:
        padding = 24
        padded = Image.new("RGBA", (sprite.width + padding * 2, sprite.height), (0, 0, 0, 0))
        padded.alpha_composite(sprite, (padding, 0))
        ground = padded.height
        sprite = padded.transform(
            padded.size,
            Image.Transform.AFFINE,
            (1, -pose.shear, pose.shear * ground, 0, 1, 0),
            resample=Image.Resampling.BICUBIC,
        )

    if pose.angle:
        sprite = sprite.rotate(pose.angle, resample=Image.Resampling.BICUBIC, expand=True)

    frame = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    x = round(FRAME_SIZE / 2 - sprite.width / 2 + pose.x)
    y = round(GROUND_Y - sprite.height - pose.lift)
    frame.alpha_composite(sprite, (x, y))
    return frame


def build_posed_summon(source: Image.Image) -> list[Image.Image]:
    """Normalize one shared 4x2 authored sheet into eight locked frames."""
    grid = Image.open(POSED_SUMMON_GRID).convert("RGBA")
    keyframes: list[Image.Image] = []
    bounds: list[tuple[int, int, int, int]] = []
    for index in range(8):
        column = index % 4
        row = index // 4
        left = round(grid.width * column / 4)
        right = round(grid.width * (column + 1) / 4)
        top = round(grid.height * row / 2)
        bottom = round(grid.height * (row + 1) / 2)
        cell = grid.crop((left, top, right, bottom))
        alpha_bounds = cell.getchannel("A").getbbox()
        if not alpha_bounds:
            raise RuntimeError(f"Pipplo posed summon cell {index + 1} has no visible pixels")
        keyframes.append(cell)
        bounds.append(alpha_bounds)

    anchor_width = bounds[0][2] - bounds[0][0]
    anchor_height = bounds[0][3] - bounds[0][1]
    shared_scale = min(NEUTRAL_HEIGHT / anchor_height, (FRAME_SIZE - 28) / anchor_width)
    frames: list[Image.Image] = []
    exact_neutral = render_pose(source, Pose())
    for index, (cell, alpha_bounds) in enumerate(zip(keyframes, bounds)):
        if index in (0, 7):
            frames.append(exact_neutral.copy())
            continue
        sprite = cell.crop(alpha_bounds)
        width = max(1, round(sprite.width * shared_scale))
        height = max(1, round(sprite.height * shared_scale))
        sprite = sprite.resize((width, height), Image.Resampling.LANCZOS)
        frame = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
        x = round(FRAME_SIZE / 2 - sprite.width / 2)
        y = round(GROUND_Y - sprite.height)
        frame.alpha_composite(sprite, (x, y))
        frames.append(frame)
    return frames


def save_preview(name: str, frames: list[Image.Image], frame_duration: int) -> None:
    columns = 4
    rows = math.ceil(len(frames) / columns)
    contact = Image.new("RGBA", (FRAME_SIZE * columns, FRAME_SIZE * rows), (247, 243, 222, 255))
    for index, frame in enumerate(frames):
        contact.alpha_composite(frame, ((index % columns) * FRAME_SIZE, (index // columns) * FRAME_SIZE))
    contact.save(ART_OUT / f"pipplo-{name}-contact-sheet.png", optimize=True)

    gif_frames = []
    for frame in frames:
        background = Image.new("RGB", frame.size, (247, 243, 222))
        background.paste(frame, mask=frame.getchannel("A"))
        gif_frames.append(background)
    gif_frames[0].save(
        ART_OUT / f"pipplo-{name}-preview.gif",
        save_all=True,
        append_images=gif_frames[1:],
        duration=frame_duration,
        loop=0,
        optimize=True,
    )


def main() -> None:
    source = prepare_source()
    PUBLIC_OUT.mkdir(parents=True, exist_ok=True)
    ART_OUT.mkdir(parents=True, exist_ok=True)
    for name, (count, pose_factory, frame_duration) in ANIMATIONS.items():
        animation_out = PUBLIC_OUT / name
        animation_out.mkdir(parents=True, exist_ok=True)
        for stale_frame in animation_out.glob("*.png"):
            stale_frame.unlink()
        frames = [
            render_pose(source, pose_factory(index / (count - 1)))
            for index in range(count)
        ]
        for index, frame in enumerate(frames, start=1):
            frame.save(animation_out / f"{index:02d}.png", optimize=True)
        save_preview(name, frames, frame_duration)
        print(f"Built Pipplo {name}: {count} cohesive frames")

    summon_out = PUBLIC_OUT / "summon"
    summon_out.mkdir(parents=True, exist_ok=True)
    for stale_frame in summon_out.glob("*.png"):
        stale_frame.unlink()
    summon_frames = build_posed_summon(source)
    for index, frame in enumerate(summon_frames, start=1):
        frame.save(summon_out / f"{index:02d}.png", optimize=True)
    save_preview("summon", summon_frames, 110)
    print(f"Built Pipplo summon: {len(summon_frames)} authored poses")


if __name__ == "__main__":
    main()
