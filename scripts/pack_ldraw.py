#!/usr/bin/env python3
"""Pack the few LDraw parts Pinisi Yard uses into self-contained .mpd files in public/ldraw/.

The site then serves a dozen small files instead of the 100 MB library. Each part is followed through every
sub-file it references (parts/s, p, p/48 and p/8 primitives) and written as one MPD: a one-line model placing
the part, then each file it needs.

    LDRAW_DIR=~/Apps/ldraw/ldraw npm run yard:parts

The LDraw parts library is (c) LDraw.org contributors, licensed CC BY 2.0 (https://www.ldraw.org/legal-info).
Studs are the plain stud primitives: logo-on-stud primitives are refused.

Standard library only (Python 3.8+). It replaced a Node version (scripts/pack-ldraw.mjs) and writes the same part files byte for byte.
"""
from __future__ import annotations

import os
import sys
from collections import deque
from pathlib import Path

ROOT = Path(os.path.expanduser(os.environ.get("LDRAW_DIR", "~/Apps/ldraw/ldraw")))
OUT = Path(__file__).resolve().parent.parent / "public" / "ldraw"

# the pieces the yard builds with, by the names src/yard/parts.ts loads them under
PARTS = {
    "brick-1x1": "3005.dat",
    "brick-1x2": "3004.dat",
    "brick-1x3": "3622.dat",
    "brick-1x4": "3010.dat",
    "plate-1x1": "3024.dat",
    "plate-1x2": "3023.dat",
    "plate-1x3": "3623.dat",
    "plate-1x4": "3710.dat",
    "tile-1x1": "3070b.dat",
    "tile-1x2": "3069b.dat",
    "tile-1x3": "63864.dat",
    "tile-1x4": "2431.dat",
    "round-1x1": "3062b.dat",
}

DIRS = ("parts", "p")

LICENSE = (
    "Part geometry from the LDraw Parts Library (https://library.ldraw.org), © LDraw.org contributors,\n"
    "licensed under Creative Commons Attribution 2.0 (https://creativecommons.org/licenses/by/2.0/).\n"
    "Packed for Pinisi Yard by scripts/pack_ldraw.py. LDraw is not affiliated with the LEGO Group.\n"
)


def norm(name: str) -> str:
    """an LDraw file reference as the library stores it: lower case, forward slashes"""
    return name.strip().lower().replace("\\", "/")


def find(name: str) -> Path | None:
    for d in DIRS:
        p = ROOT / d / name
        if p.exists():
            return p
    return None


def as_loaded(name: str) -> str:
    """the embedded name three's LDrawLoader looks up: it rewrites "s/x" to "parts/s/x" and "48/x" to "p/48/x" """
    if name.startswith("s/"):
        return f"parts/{name}"
    if name.startswith("48/"):
        return f"p/{name}"
    return name


def pack(part_file: str) -> str:
    """one part and every file it references, breadth first, as a single MPD"""
    files: dict[str, str] = {}
    queue = deque([norm(part_file)])
    while queue:
        name = queue.popleft()
        if name in files:
            continue
        if "logo" in name:
            raise SystemExit(f"refusing a logo primitive: {name}")
        path = find(name)
        if path is None:
            raise SystemExit(f"LDraw file not found: {name} (looked in {ROOT})")
        # latin-1 reads every byte as one character, as the library's older files need
        text = path.read_bytes().decode("latin-1").replace("\r\n", "\n")
        files[name] = text
        for line in text.split("\n"):
            t = line.split()
            if len(t) >= 15 and t[0] == "1":
                queue.append(norm(" ".join(t[14:])))
    main = f"0 FILE model.ldr\n0 Pinisi Yard: {part_file}\n1 16 0 0 0 1 0 0 0 1 0 0 0 1 {part_file}\n"
    return main + "".join(f"0 FILE {as_loaded(name)}\n{text.rstrip()}\n" for name, text in files.items())


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for part_id, part_file in PARTS.items():
        mpd = pack(part_file)
        (OUT / f"{part_id}.mpd").write_text(mpd, encoding="utf-8", newline="\n")
        total += len(mpd)
        print(f"{part_id:<10} {part_file:<10} {len(mpd) / 1024:.1f} KB")
    (OUT / "LICENSE.txt").write_text(LICENSE, encoding="utf-8", newline="\n")
    print(f"total {total / 1024:.0f} KB in {OUT}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
