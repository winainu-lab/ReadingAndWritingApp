from __future__ import annotations

import argparse
import re
from pathlib import Path

from pypdf import PdfReader


THAI_DIGITS = str.maketrans("๐๑๒๓๔๕๖๗๘๙", "0123456789")
PUA_REPLACEMENTS = {
    "\uf70a": "่",
    "\uf70b": "้",
    "\uf705": "๊",
    "\uf710": "์",
}
MARKERS = (
    "การฝึกอ่านคำ",
    "ให้นักเรียนอ่านคำต่อไปนี้",
    "ให้นักเรียนฝึกอ่านคำ",
    "อ่านคำต่อไปนี้",
    "ฝึกอ่านคำที่",
    "ฝึกอ่านออกเสียงคำ",
    "ให้นักเรียนอ่าน",
)

EARLY_CHAPTER_PAGES = {
    1: (7, 14),
    2: (15, 21),
    3: (22, 31),
    4: (32, 35),
    5: (36, 40),
    6: (41, 45),
    7: (46, 55),
    8: (56, 65),
    9: (66, 72),
    10: (73, 78),
    11: (79, 85),
    12: (86, 91),
    13: (92, 99),
    14: (100, 107),
    15: (108, 118),
    16: (119, 128),
}
MIDDLE_CHAPTER_PAGES = {
    17: (7, 14),
    18: (15, 24),
    19: (25, 34),
    20: (35, 46),
    21: (47, 56),
    22: (57, 68),
    23: (69, 74),
    24: (75, 89),
}


def normalize(text: str) -> str:
    for source, replacement in PUA_REPLACEMENTS.items():
        text = text.replace(source, replacement)
    text = text.replace("\x18", "").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def chapter_for_page(page_number: int, mapping: dict[int, tuple[int, int]]) -> int | None:
    for chapter, (start, end) in mapping.items():
        if start <= page_number <= end:
            return chapter
    return None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--context-chars", type=int, default=2600)
    parser.add_argument("--chapters", default="", help="Comma-separated chapter numbers")
    args = parser.parse_args()
    selected_chapters = {int(value) for value in args.chapters.split(",") if value.strip()}

    for pdf_path in sorted(Path.cwd().glob("*.pdf")):
        is_middle = "ตอนกลาง" in pdf_path.name
        mapping = MIDDLE_CHAPTER_PAGES if is_middle else EARLY_CHAPTER_PAGES
        reader = PdfReader(str(pdf_path))
        print(f"\n===== {pdf_path.name} =====")
        for index, page in enumerate(reader.pages):
            page_number = index + 1
            chapter = chapter_for_page(page_number, mapping)
            if chapter is None:
                continue
            if selected_chapters and chapter not in selected_chapters:
                continue
            text = normalize(page.extract_text() or "")
            positions = [text.find(marker) for marker in MARKERS if marker in text]
            if not positions:
                continue
            start = max(0, min(positions) - 180)
            excerpt = text[start : start + args.context_chars]
            print(f"\n--- B{chapter:02} / PDF page {page_number} ---")
            print(excerpt)


if __name__ == "__main__":
    main()
