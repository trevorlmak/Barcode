# Test checklist

Use this checklist to confirm every feature works. Tick each box after checking it.

## Generation & validation

- [ ] Opening `index.html` shows the dashboard with a preview area and controls.
- [ ] Default example (`5901234123457`) validates as EAN-13 and shows a preview immediately.
- [ ] Typing updates the preview live without pressing Generate.
- [ ] Choosing each format updates the hint text and placeholder:
  - [ ] **Code 128** — `ABC-123456` renders.
  - [ ] **Code 39** — lowercase input `abc-123` renders uppercase and shows a warning.
  - [ ] **EAN-13** — `590123412345` auto-fills the check digit → `5901234123457`.
  - [ ] **EAN-8** — `96385074` renders; wrong checksum (e.g. `96385070`) shows an error.
  - [ ] **UPC-A** — `03600029145` auto-fills → `036000291452`.
  - [ ] **ITF** — `12345` (odd) shows "even number of digits" error; `123456` renders.
  - [ ] **Codabar** — `123456` auto-wraps to `A123456A`; `x123` shows an error.
- [ ] Code 128 rejects non-ASCII (e.g. `héllo`) with a clear message.
- [ ] Empty input shows a neutral "enter data" prompt, not an error.

## Customization

- [ ] Bar width / height / margin / text size / text-margin sliders change the preview.
- [ ] Foreground and background color pickers (and hex text inputs) update the preview.
- [ ] "Show human-readable text" checkbox hides/shows the text under the barcode.
- [ ] Text position (bottom/top) works.
- [ ] Changing format re-validates and re-renders.
- [ ] **Reset** restores defaults and clears the input.
- [ ] Light/dark toggle switches the whole UI and remembers the choice.

## Download & print

- [ ] **Download PNG** saves a properly-scaled PNG with crisp edges.
- [ ] **Download SVG** saves a valid vector file.
- [ ] **Download PDF** saves a PDF sized to the barcode.
- [ ] **Print** opens a clean print dialog containing only the barcode.
- [ ] Filenames are sanitized (no illegal characters, invalid inputs prevented).

## Bulk generation

- [ ] Pasting a list generates one card per line with valid/invalid signalling.
- [ ] `value,FORMAT` override works per line (e.g. `CODE39-001,CODE39`).
- [ ] **Load sample** fills and generates a mixed, multi-format example.
- [ ] Uploading a CSV (with optional `value,format` header) works and skips the header row.
- [ ] Each valid card has working PNG / SVG / Print buttons.
- [ ] **Download ZIP (PNG)** downloads an archive with unique, zero-padded filenames.
- [ ] **Download ZIP (SVG)** works.
- [ ] **Print all** opens a sheet of all generated barcodes.
- [ ] Clear removes everything and hides the download bar.

## Offline & long-term use

- [ ] With the network disabled, the app still loads and works from `file://` (no CDN requests).
- [ ] No analytics, tracking, ads or external API calls (check the Network tab in DevTools).
- [ ] `npm run build` produces `dist/barcode-studio-offline/` and a `.zip`.
- [ ] The built folder alone runs the app as long as the OS can open HTML files.

## Tests

- [ ] `node tests/test.js` → all tests pass (42 unit tests).
- [ ] `tests/browser-smoke.html` loads with all checks passing (rendering + export pipeline).