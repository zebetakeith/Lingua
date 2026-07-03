"""Bake Pipplo's approved flat layers into a cohesive twelve-frame idle.

The runtime never moves limbs independently. All overlap, pivots, blinks, and
secondary motion are resolved here into complete bottom-anchored frames.
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
LAYERS = ROOT / "public" / "assets" / "goo-keep" / "characters" / "pipplo" / "rig-v2-flat" / "layers"
PUBLIC_OUT = ROOT / "public" / "assets" / "goo-keep" / "characters" / "pipplo" / "hybrid-idle"
ART_OUT = ROOT / "art-source" / "goo-keep" / "characters" / "pipplo" / "hybrid-idle"

FRAME_SIZE = 192
FRAME_COUNT = 12
GROUND_Y = 184
PALETTE = [
    (244, 230, 56),   # body
    (235, 209, 47),   # appendages
    (245, 102, 140),  # coral
    (255, 245, 222),  # cream
    (61, 42, 84),     # plum
]


def load(name: str) -> Image.Image:
    return Image.open(LAYERS / name).convert("RGBA")


PARTS = {
    "body": load("body.png"),
    "arm_left": load("arm-left.png"),
    "arm_right": load("arm-right.png"),
    "foot_left": load("foot-left.png"),
    "foot_right": load("foot-right.png"),
    "antenna_stem": load("antenna-stem.png"),
    "antenna_pom": load("antenna-pom.png"),
    "eye_left": load("eye-left.png"),
    "eye_right": load("eye-right.png"),
    "pupil_left": load("pupil-left.png"),
    "pupil_right": load("pupil-right.png"),
    "mouth": load("mouth.png"),
    "cheek_small": load("cheek-small.png"),
    "cheek_large": load("cheek-large.png"),
}


def place(
    canvas: Image.Image,
    image: Image.Image,
    center: tuple[float, float],
    scale: float,
    *,
    angle: float = 0,
    scale_x: float = 1,
    scale_y: float = 1,
) -> None:
    width = max(1, round(image.width * scale * scale_x))
    height = max(1, round(image.height * scale * scale_y))
    transformed = image.resize((width, height), Image.Resampling.LANCZOS)
    if angle:
        transformed = transformed.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
    x = round(center[0] - transformed.width / 2)
    y = round(center[1] - transformed.height / 2)
    canvas.alpha_composite(transformed, (x, y))


def lock_palette(image: Image.Image) -> Image.Image:
    output = image.copy()
    pixels = output.load()
    for y in range(output.height):
        for x in range(output.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0:
                continue
            nearest = min(
                PALETTE,
                key=lambda color: (red - color[0]) ** 2 + (green - color[1]) ** 2 + (blue - color[2]) ** 2,
            )
            pixels[x, y] = (*nearest, alpha)
    return output


def build_frame(index: int) -> Image.Image:
    phase = math.tau * index / FRAME_COUNT
    breath = math.sin(phase)
    counter = math.sin(phase + math.pi)
    weight = math.sin(phase * 0.5)
    body_x = 96 + weight * 0.7
    body_y = 117 + breath * 0.8
    body_scale_x = 1 + breath * 0.012
    body_scale_y = 1 - breath * 0.01
    frame = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))

    antenna_wave = math.sin(phase - 0.7)
    place(frame, PARTS["antenna_stem"], (105 + antenna_wave * 0.7, 45 + breath * 0.4), 0.21, angle=-2 + antenna_wave * 2.4)
    place(frame, PARTS["antenna_pom"], (128 + antenna_wave * 1.7, 29 + breath * 0.5), 0.18, angle=antenna_wave * 1.5)

    left_step = max(0, math.sin(phase)) * 0.8
    right_step = max(0, math.sin(phase + math.pi)) * 0.8
    place(frame, PARTS["foot_left"], (76, 174 - left_step), 0.18, angle=-1.2 + breath * 0.5, scale_y=1 - left_step * 0.02)
    place(frame, PARTS["foot_right"], (116, 174 - right_step), 0.18, angle=1.2 - breath * 0.5, scale_y=1 - right_step * 0.02)

    place(frame, PARTS["arm_left"], (57, 111 + counter * 0.6), 0.19, angle=-5 + breath * 1.3)
    place(frame, PARTS["arm_right"], (135, 111 + breath * 0.6), 0.19, angle=5 - breath * 1.3)
    place(frame, PARTS["body"], (body_x, body_y), 0.19, scale_x=body_scale_x, scale_y=body_scale_y)

    blink_scale = 1.0
    if index == 8:
        blink_scale = 0.18
    elif index in (7, 9):
        blink_scale = 0.58
    glance = 0
    if index in (3, 4, 5):
        glance = 1.2
    elif index in (10, 11):
        glance = -0.8

    face_y = 106 + breath * 0.25
    place(frame, PARTS["eye_left"], (78, face_y), 0.145, scale_y=blink_scale)
    place(frame, PARTS["eye_right"], (114, face_y), 0.145, scale_y=blink_scale)
    place(frame, PARTS["pupil_left"], (78 + glance, face_y + 1), 0.12, scale_y=blink_scale)
    place(frame, PARTS["pupil_right"], (114 + glance, face_y + 1), 0.12, scale_y=blink_scale)
    place(frame, PARTS["mouth"], (96, 127 + breath * 0.2), 0.12, scale_x=1 + breath * 0.015, scale_y=1 - breath * 0.01)
    place(frame, PARTS["cheek_large"], (127, 116 + breath * 0.2), 0.105)
    place(frame, PARTS["cheek_small"], (134, 105 + breath * 0.2), 0.1)
    return lock_palette(frame)


def main() -> None:
    PUBLIC_OUT.mkdir(parents=True, exist_ok=True)
    ART_OUT.mkdir(parents=True, exist_ok=True)
    frames = [build_frame(index) for index in range(FRAME_COUNT)]
    for index, frame in enumerate(frames, start=1):
        frame.save(PUBLIC_OUT / f"{index:02d}.png", optimize=True)

    strip = Image.new("RGBA", (FRAME_SIZE * FRAME_COUNT, FRAME_SIZE), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        strip.alpha_composite(frame, (index * FRAME_SIZE, 0))
    strip.save(ART_OUT / "pipplo-hybrid-idle-strip.png", optimize=True)

    preview = Image.new("RGBA", (FRAME_SIZE * 6, FRAME_SIZE * 2), (247, 243, 222, 255))
    for index, frame in enumerate(frames):
        preview.alpha_composite(frame, ((index % 6) * FRAME_SIZE, (index // 6) * FRAME_SIZE))
    preview.save(ART_OUT / "pipplo-hybrid-idle-preview.png", optimize=True)

    gif_frames = []
    for frame in frames:
        background = Image.new("RGB", frame.size, (247, 243, 222))
        background.paste(frame, mask=frame.getchannel("A"))
        gif_frames.append(background)
    gif_frames[0].save(
        ART_OUT / "pipplo-hybrid-idle-preview.gif",
        save_all=True,
        append_images=gif_frames[1:],
        duration=125,
        loop=0,
        optimize=True,
    )
    print(f"Built {FRAME_COUNT} cohesive Pipplo hybrid idle frames")


if __name__ == "__main__":
    main()
