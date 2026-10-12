#!/usr/bin/env python3
"""Render the requested Omio demo highlight loop as MP4 and GIF."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import shutil
import subprocess
import tempfile


SEGMENTS = (
    (0, 30, 2),
    (300, 305, 1),
    (392, 420, 1),
    (458, 466, 1),
    (520, 630, 2),
    (711, 760, 1),
)
TRANSITION_SECONDS = (0.3, 0.3, 0.3, 0.3, 0.6)
FINAL_HOLD_SECONDS = 2.0
LOOP_DISSOLVE_SECONDS = 0.3
FIRST_FRAME_TAIL_SECONDS = 0.1
DEFAULT_MP4_FPS = 24
DEFAULT_GIF_FPS = 12
DEFAULT_OUTPUT_WIDTH = 1280


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Source MOV or MP4 file")
    parser.add_argument(
        "--mp4",
        type=Path,
        default=Path("omio-gen-ui-demo-short.mp4"),
        help="MP4 output path",
    )
    parser.add_argument(
        "--gif",
        type=Path,
        default=Path("omio-gen-ui-demo-short.gif"),
        help="GIF output path",
    )
    parser.add_argument(
        "--ffmpeg",
        default=shutil.which("ffmpeg") or "ffmpeg",
        help="ffmpeg executable",
    )
    parser.add_argument(
        "--width",
        type=int,
        default=DEFAULT_OUTPUT_WIDTH,
        help="Output width in pixels",
    )
    parser.add_argument(
        "--gif-fps",
        type=int,
        default=DEFAULT_GIF_FPS,
        help="GIF frames per second",
    )
    parser.add_argument(
        "--gif-only",
        action="store_true",
        help="Reuse the existing --mp4 file and render only the GIF",
    )
    return parser.parse_args()


def video_filter(width: int) -> str:
    filters = [
        f"[0:v]split={len(SEGMENTS)}"
        + "".join(f"[source{i}]" for i in range(len(SEGMENTS)))
    ]
    durations: list[float] = []

    for index, (start, end, speed) in enumerate(SEGMENTS):
        duration = (end - start) / speed
        durations.append(duration)
        output = "clip0_raw" if index == 0 else f"clip{index}"
        filters.append(
            f"[source{index}]trim=start={start}:end={end},"
            f"setpts=(PTS-STARTPTS)/{speed},"
            f"scale={width}:-2:flags=lanczos,"
            f"fps={DEFAULT_MP4_FPS},format=yuv420p[{output}]"
        )

    filters.append(
        "[clip0_raw]split=3[clip0][first_fade_source][first_tail_source]"
    )
    filters.append(
        f"[first_fade_source]trim=duration={1 / DEFAULT_MP4_FPS:.6f},"
        "setpts=PTS-STARTPTS,"
        f"tpad=stop_mode=clone:stop_duration={LOOP_DISSOLVE_SECONDS},"
        f"trim=duration={LOOP_DISSOLVE_SECONDS},format=yuv420p[first_frame]"
    )
    filters.append(
        f"[first_tail_source]trim=duration={1 / DEFAULT_MP4_FPS:.6f},"
        "setpts=PTS-STARTPTS,"
        f"tpad=stop_mode=clone:stop_duration={FIRST_FRAME_TAIL_SECONDS},"
        f"trim=duration={FIRST_FRAME_TAIL_SECONDS},format=yuv420p[first_tail]"
    )

    elapsed = durations[0]
    previous = "clip0"
    for index, (duration, transition) in enumerate(
        zip(durations[1:], TRANSITION_SECONDS, strict=True), start=1
    ):
        offset = elapsed - transition
        output = f"joined{index}"
        filters.append(
            f"[{previous}][clip{index}]xfade=transition=fade:"
            f"duration={transition}:offset={offset:.1f}[{output}]"
        )
        elapsed = offset + duration
        previous = output

    loop_offset = elapsed + FINAL_HOLD_SECONDS
    filters.append(
        f"[{previous}]tpad=stop_mode=clone:"
        f"stop_duration={FINAL_HOLD_SECONDS + LOOP_DISSOLVE_SECONDS},"
        "format=yuv420p[held]"
    )
    filters.append(
        f"[held][first_frame]xfade=transition=fade:"
        f"duration={LOOP_DISSOLVE_SECONDS}:offset={loop_offset:.1f},"
        "format=yuv420p[loop_blend]"
    )
    filters.append(
        "[loop_blend][first_tail]concat=n=2:v=1:a=0,format=yuv420p[video]"
    )
    return ";".join(filters)


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def temporary_path(destination: Path, suffix: str) -> Path:
    descriptor, name = tempfile.mkstemp(
        prefix=f".{destination.name}.", suffix=suffix, dir=destination.parent
    )
    os.close(descriptor)
    return Path(name)


def main() -> None:
    args = parse_args()
    source = args.source.expanduser().resolve()
    mp4 = args.mp4.expanduser().resolve()
    gif = args.gif.expanduser().resolve()

    if not source.is_file():
        raise SystemExit(f"Source video does not exist: {source}")
    if len({source, mp4, gif}) != 3:
        raise SystemExit("Source, MP4 output, and GIF output must be different paths")
    if args.width <= 0 or args.width % 2:
        raise SystemExit("--width must be a positive even integer")
    if args.gif_fps <= 0:
        raise SystemExit("--gif-fps must be positive")
    if args.gif_only and not mp4.is_file():
        raise SystemExit(f"Existing MP4 does not exist: {mp4}")
    mp4.parent.mkdir(parents=True, exist_ok=True)
    gif.parent.mkdir(parents=True, exist_ok=True)

    mp4_temp = temporary_path(mp4, ".rendering.mp4")
    gif_temp = temporary_path(gif, ".rendering.gif")
    palette_temp = temporary_path(gif, ".palette.png")

    try:
        if not args.gif_only:
            run(
                [
                    args.ffmpeg,
                    "-hide_banner",
                    "-nostdin",
                    "-y",
                    "-i",
                    str(source),
                    "-filter_complex",
                    video_filter(args.width),
                    "-map",
                    "[video]",
                    "-an",
                    "-c:v",
                    "libx264",
                    "-preset",
                    "fast",
                    "-crf",
                    "18",
                    "-profile:v",
                    "high",
                    "-level:v",
                    "4.0",
                    "-movflags",
                    "+faststart",
                    str(mp4_temp),
                ]
            )
            os.replace(mp4_temp, mp4)

        run(
            [
                args.ffmpeg,
                "-hide_banner",
                "-loglevel",
                "error",
                "-nostdin",
                "-y",
                "-i",
                str(mp4),
                "-vf",
                f"scale={args.width}:-2:flags=lanczos,fps={args.gif_fps},"
                "palettegen=max_colors=256:stats_mode=diff",
                "-frames:v",
                "1",
                str(palette_temp),
            ]
        )
        try:
            run(
                [
                    args.ffmpeg,
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-nostdin",
                    "-y",
                    "-i",
                    str(mp4),
                    "-i",
                    str(palette_temp),
                    "-filter_complex",
                    f"[0:v]scale={args.width}:-2:flags=lanczos,"
                    f"fps={args.gif_fps}[frames];"
                    "[frames][1:v]paletteuse=dither=bayer:bayer_scale=3:"
                    "diff_mode=rectangle[gif]",
                    "-map",
                    "[gif]",
                    "-an",
                    "-loop",
                    "0",
                    "-gifflags",
                    "+transdiff",
                    str(gif_temp),
                ]
            )
            os.replace(gif_temp, gif)
        finally:
            palette_temp.unlink(missing_ok=True)
    finally:
        mp4_temp.unlink(missing_ok=True)
        gif_temp.unlink(missing_ok=True)
        palette_temp.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
