"""
Build public/data/occupations-au.json — the job titles Interview Prep suggests
while someone types the role they're going for.

Source: ABS, OSCA – Occupation Standard Classification for Australia, 2024,
Version 1.0, "Index of principal titles, alternative titles and
specialisations". Licensed CC BY 4.0; the attribution travels inside the JSON
and is shown under the suggestions.

Standard library only (an .xlsx is a zip of XML). Re-run when the ABS releases a
new OSCA version:

    python scripts/build-occupations.py                 # downloads the index
    python scripts/build-occupations.py path/to/index.xlsx
"""

import json
import sys
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from io import BytesIO
from pathlib import Path

INDEX_URL = (
    "https://www.abs.gov.au/statistics/classifications/osca-occupation-standard-classification-australia/"
    "2024-version-1-0/data-downloads/"
    "OSCA%20index%20of%20principal%20titles%20alternative%20titles%20and%20specialisations.xlsx"
)
OUT = Path(__file__).resolve().parent.parent / "public" / "data" / "occupations-au.json"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
# Table 2 lists every title once per occupation code: principal, alternative,
# specialisation, or an occupation inside a "not elsewhere classified" group.
TABLE_SHEET = "xl/worksheets/sheet3.xml"


def read_rows(book: zipfile.ZipFile, sheet: str):
    shared = [
        "".join(t.text or "" for t in si.iter(f"{{{NS['m']}}}t"))
        for si in ET.fromstring(book.read("xl/sharedStrings.xml")).findall("m:si", NS)
    ]
    for row in ET.fromstring(book.read(sheet)).find("m:sheetData", NS).findall("m:row", NS):
        cells = {}
        for cell in row.findall("m:c", NS):
            value = cell.find("m:v", NS)
            if value is None:
                continue
            column = "".join(ch for ch in cell.get("r") if ch.isalpha())
            cells[column] = shared[int(value.text)] if cell.get("t") == "s" else value.text
        yield cells


def main() -> None:
    if len(sys.argv) > 1:
        data = Path(sys.argv[1]).read_bytes()
    else:
        request = urllib.request.Request(INDEX_URL, headers={"User-Agent": "Mozilla/5.0 (faircopy build-occupations)"})
        data = urllib.request.urlopen(request, timeout=60).read()
    book = zipfile.ZipFile(BytesIO(data))

    titles: dict[str, bool] = {}  # title -> is a principal title
    for row in read_rows(book, TABLE_SHEET):
        code, title, category = row.get("A", "").strip(), " ".join(row.get("B", "").split()), row.get("C", "").strip()
        # Data rows carry a 6-digit occupation code; "… nec" catch-alls aren't titles anyone holds.
        if not code.isdigit() or not title or title.lower().endswith(" nec"):
            continue
        titles[title] = titles.get(title, False) or category == "Principal Title"

    if len(titles) < 1000:
        sys.exit(f"Only {len(titles)} titles parsed — the spreadsheet layout has probably changed.")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(
            {
                "source": "Australian Bureau of Statistics, OSCA – Occupation Standard Classification for Australia, 2024, Version 1.0",
                "licence": "CC BY 4.0",
                "url": "https://www.abs.gov.au/statistics/classifications/osca-occupation-standard-classification-australia",
                # [title, 1] marks a principal title, which ranks first among equal matches.
                "titles": [[t, 1] if principal else t for t, principal in sorted(titles.items(), key=lambda kv: kv[0].lower())],
            },
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )
    principal = sum(titles.values())
    print(f"Wrote {len(titles)} titles ({principal} principal) to {OUT}")


if __name__ == "__main__":
    main()
