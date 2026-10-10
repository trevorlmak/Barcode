# Barcode Studio — Free Unlimited Barcode Generator

A complete, modern, responsive **barcode generator web app** that runs entirely in the
browser. No accounts, no subscription, no quotas, no trial periods, no expiry date, no
tracking, no ads and **no data ever leaves your device**. Once the files are downloaded it
works indefinitely — even fully offline.

---

## Features

- **7 barcode formats**: Code 128, Code 39, EAN-13, EAN-8, UPC-A, ITF (Interleaved 2 of 5) and Codabar.
- **Instant live preview** that updates as you type or change settings.
- **Full customization**: bar width, height, margin, text size, text margin, text position,
  bar color, background color, show/hide human-readable text, and export quality scale.
- **Export** as **PNG**, **SVG** or **PDF**, plus a **Print** option.
- **Validation** per format with clear messages:
  - EAN-13 / EAN-8 / UPC-A: required digit count **and** GTIN checksum are verified.
  - 12-digit EANs, 11-digit UPCs and 7-digit EAN-8s are auto-completed with a check digit (with a notice).
  - Code 39 auto-uppercases input and rejects unsupported symbols.
  - Code 128 accepts the full ASCII range (0–127) and rejects non-ASCII.
  - ITF enforces an even digit count.
  - Codabar wraps bare digits in `A` start/stop characters and validates `A-D` forms.
- **Bulk generation**: paste a list or upload a CSV, generate at once, then download each
  barcode individually or as a **ZIP archive (PNG or SVG)** and print all barcodes on one sheet.
- **Light and dark mode** (persisted, respects OS preference), fully responsive layout,
  keyboard-accessible controls and reduced-motion support.
- **Zero network use**: no CDNs, analytics or external API calls. All libraries are bundled locally.

> **Important**: Barcode Studio *encodes* checksums — it **never assigns or registers**
> numbers. A generated EAN/UPC is not an officially issued product number. Use barcodes that
> belong to you, or obtain a legitimate GS1 prefix / GTIN from the relevant issuing
> authority before using codes in retail or logistics.

---

## Supported formats

| Format | Data allowed | Validation | Notes |
| --- | --- | --- | --- |
| **Code 128** | ASCII 0–127 | non-ASCII rejected | Most compact, general purpose |
| **Code 39** | `A–Z 0–9 - . space $ / + %` | chars outside set rejected; input uppercased | Classic industrial symbology |
| **EAN-13** | 12 or 13 digits | 13th digit is the checksum (verified / computed) | Retail, ISBN/GTIN-13 |
| **EAN-8** | 7 or 8 digits | 8th digit is the checksum (verified / computed) | Small packages |
| **UPC-A** | 11 or 12 digits | 12th digit is the checksum (verified / computed) | North America retail |
| **ITF** | digits, **even count** | odd count rejected | Shipping cartons |
| **Codabar** | digits and `- $ : / . +`, optional `A–D` start/stop | bare input auto-wrapped with `A` | Libraries, blood banks |

### Bulk input format

- **Line format** (default): one barcode per line.
- **Optional per-line format override**: `value,FORMAT` or `value;FORMAT` or `value<TAB>FORMAT`.
- **CSV**: first column is the value, optional second column is the format. A header row
  starting with `value`/`data`/`barcode`/`code` is detected and skipped.

Example:
```
5901234123457
CODE39-001,CODE39
9638507          ← becomes 96385074 with a notice
03600029145      ← becomes a valid UPC-A
A123456789B,codabar
```

---

## Project structure

```
Barcode/
├── index.html              # single-page UI
├── css/
│   └── styles.css          # responsive styling + light/dark themes
├── js/
│   ├── validators.js       # per-format validation & normalisation (pure logic)
│   ├── bulk.js             # CSV / line parsing for bulk mode (pure logic)
│   ├── exporters.js        # SVG/PNG/PDF rendering + download/print
│   ├── theme.js            # light/dark theme handling
│   └── app.js              # UI wiring
├── vendor/                 # locally bundled dependencies (offline)
│   ├── JsBarcode.all.min.js    # JsBarcode 3.11.6   (MIT)
│   ├── jspdf.umd.min.js        # jsPDF 2.5.1        (MIT)
│   └── jszip.min.js            # JSZip 3.10.1       (MIT)
├── scripts/
│   ├── serve.js            # dependency-free local dev server (Node)
│   └── build-offline.js    # packages dist/ offline bundle + ZIP
├── tests/
│   ├── test.js             # Node unit tests (no dependencies)
│   └── browser-smoke.html  # in-browser smoke test
├── package.json
├── README.md
└── TESTING.md              # manual test checklist
```

---

## Run locally

**Option A — just open the file (offline):**
Double-click `index.html`. Everything works from `file://` — no server needed.

**Option B — local dev server (Node only, no dependencies):**
```
node scripts/serve.js
```
open http://localhost:8080

**Option C — any static server:**
```
python -m http.server 8080
# or
npx serve
```

### Run the tests

```
node tests/test.js            # 42 pure-logic unit tests (validators + bulk)
```
Open `tests/browser-smoke.html` in a browser (or run it headless) for integration checks
of rendering and the export pipeline.

---

## Build the standalone offline version

Everything needed for offline use is already in the repo (no CDN at runtime). To package a
clean, self-contained copy and a ZIP:

```
npm run build        # or:  node scripts/build-offline.js
```

Output:
- `dist/barcode-studio-offline/` — a folder with only the files the app needs
- `dist/barcode-studio-offline.zip` — same folder as an archive

Copy `barcode-studio-offline` anywhere (USB stick, air-gapped machine) and open
`index.html`. Because it performs no external requests, the app is usable indefinitely.

---

## Dependencies

All libraries are vendored locally (`vendor/`) for guaranteed offline use:

| Library | Version | Licence | Source |
| --- | --- | --- | --- |
| JsBarcode | 3.11.6 | MIT | jsdelivr / npm `jsbarcode` |
| jsPDF | 2.5.1 | MIT | jsdelivr / npm `jspdf` |
| JSZip | 3.10.1 | MIT | jsdelivr / npm `jszip` |

To refresh a vendored copy yourself:
```
curl -o vendor/JsBarcode.all.min.js https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js
curl -o vendor/jspdf.umd.min.js   https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js
curl -o vendor/jszip.min.js       https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js
```

---

## Notes on output quality

- PNG exports rasterise the crisp SVG at the selected "Export quality" scale (up to 8×),
  so bars have sharp edges suitable for printing and scanning.
- PDF pages are sized to the barcode, with the background preserved.
- Printing uses the browser's print dialog on a clean page containing only the barcode.

## Licence

MIT — free to use and modify.