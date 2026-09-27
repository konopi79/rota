"""
Find struck-through text in the regulation PDF (plan §4, R1).

The 2026 national regulation was published with tracked changes left in: deleted words
are struck through but still present in the text layer, so `pdftotext` returns the old
and the new wording side by side ("~~chůze~~ vpřed" → "chůze vpřed"). This lists every
struck run with its page so the proofread card texts can drop them.

    .cache/venv/bin/python scripts/content/strikethrough.py [pdf] [first_page last_page]

Needs PyMuPDF: `python3 -m venv .cache/venv && .cache/venv/bin/pip install pymupdf`.
"""

import sys

import pymupdf

DEFAULT_PDF = "podklady/2026nzr-ro-cz-final.pdf"


def horizontal_lines(page):
    """Thin horizontal segments drawn on the page (strike lines, table rules)."""
    lines = []
    for d in page.get_drawings():
        for item in d["items"]:
            if item[0] == "l":
                p1, p2 = item[1], item[2]
                if abs(p1.y - p2.y) < 0.8:
                    lines.append((min(p1.x, p2.x), max(p1.x, p2.x), (p1.y + p2.y) / 2))
            elif item[0] == "re":
                r = item[1]
                if r.height < 1.5 and r.width > 2:
                    lines.append((r.x0, r.x1, (r.y0 + r.y1) / 2))
    return lines


def struck_runs(page):
    lines = horizontal_lines(page)
    runs = []
    for block in page.get_text("rawdict")["blocks"]:
        for line in block.get("lines", []):
            current = []
            for span in line["spans"]:
                for ch in span["chars"]:
                    x0, y0, x1, y1 = ch["bbox"]
                    h = y1 - y0
                    mid_lo, mid_hi = y0 + h * 0.3, y0 + h * 0.8
                    cx = (x0 + x1) / 2
                    hit = any(lx0 <= cx <= lx1 and mid_lo <= ly <= mid_hi for lx0, lx1, ly in lines)
                    if hit:
                        current.append(ch["c"])
                    elif current:
                        runs.append("".join(current))
                        current = []
            if current:
                runs.append("".join(current))
    return [r for r in (r.strip() for r in runs) if r]


def main():
    args = sys.argv[1:]
    pdf = args.pop(0) if args and args[0].endswith(".pdf") else DEFAULT_PDF
    doc = pymupdf.open(pdf)
    first, last = (int(args[0]), int(args[1])) if len(args) == 2 else (1, len(doc))
    for number in range(first, last + 1):
        runs = struck_runs(doc[number - 1])
        if runs:
            print(f"p. {number}: " + " | ".join(runs))


main()
