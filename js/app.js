/*
 * app.js
 * ---------------------------------------------------------------------------
 * UI orchestration for Barcode Studio. Wires the form controls to the
 * validator, renderer/exporter and bulk modules. Everything runs locally.
 * ---------------------------------------------------------------------------
 */
(function () {
  'use strict';

  var V = window.BarcodeValidators;
  var R = window.BarcodeRender;
  var BP = window.BulkParser;

  var DEFAULTS = {
    width: 2,
    height: 120,
    margin: 10,
    fontSize: 16,
    textMargin: 4,
    textPosition: 'bottom',
    displayValue: true,
    lineColor: '#000000',
    background: '#ffffff',
    exportScale: 3,
    format: 'CODE128'
  };

  var $ = function (id) { return document.getElementById(id); };

  /* --------------------------------------------------------------- refs -- */
  var el = {
    data: $('barcodeData'),
    format: $('formatSelect'),
    bulkFormat: $('bulkFormat'),
    formatNote: $('formatNote'),
    message: $('message'),
    preview: $('previewArea'),
    previewMeta: $('previewMeta'),
    width: $('optWidth'), widthOut: $('optWidthOut'),
    height: $('optHeight'), heightOut: $('optHeightOut'),
    margin: $('optMargin'), marginOut: $('optMarginOut'),
    fontSize: $('optFontSize'), fontSizeOut: $('optFontSizeOut'),
    textMargin: $('optTextMargin'), textMarginOut: $('optTextMarginOut'),
    textPosition: $('optTextPosition'),
    lineColor: $('optLineColor'), lineColorText: $('optLineColorText'),
    background: $('optBackground'), backgroundText: $('optBackgroundText'),
    displayValue: $('optDisplayValue'),
    exportScale: $('optExportScale'),
    bulkInput: $('bulkInput'),
    bulkFile: $('bulkFile'),
    bulkSummary: $('bulkSummary'),
    bulkResults: $('bulkResults'),
    bulkDownloads: $('bulkDownloads'),
    toast: $('toast')
  };

  var state = {
    lastValid: null,   // { value, format, settings }
    bulkItems: [],     // validated items
    toastTimer: null
  };

  /* ---------------------------------------------------------- helpers ----- */
  function readSettings() {
    return {
      width: +el.width.value,
      height: +el.height.value,
      margin: +el.margin.value,
      fontSize: +el.fontSize.value,
      textMargin: +el.textMargin.value,
      textPosition: el.textPosition.value,
      displayValue: el.displayValue.checked,
      lineColor: el.lineColor.value,
      background: el.background.value,
      exportScale: +el.exportScale.value
    };
  }

  function setMessage(text, kind) {
    el.message.textContent = text || '';
    el.message.className = 'message' + (kind ? ' is-' + kind : '');
  }

  function toast(text, isError) {
    el.toast.textContent = text;
    el.toast.className = 'toast is-visible' + (isError ? ' is-error' : '');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () {
      el.toast.className = 'toast';
    }, 3200);
  }

  function setBusy(button, busy, label) {
    if (!button) return;
    if (busy) {
      button.dataset.label = button.textContent;
      button.disabled = true;
      button.textContent = label || 'Working...';
    } else {
      button.disabled = false;
      if (button.dataset.label) {
        button.textContent = button.dataset.label;
        delete button.dataset.label;
      }
    }
  }

  function clearPreview(showEmpty, message) {
    el.preview.innerHTML = '';
    el.preview.classList.remove('is-error');
    el.previewMeta.textContent = '';
    if (showEmpty) {
      var p = document.createElement('p');
      p.className = 'preview-empty';
      p.textContent = message || 'Your barcode preview appears here.';
      el.preview.appendChild(p);
    }
  }

  /* ------------------------------------------------- format selectors ---- */
  function fillFormatSelects() {
    V.FORMAT_LIST.forEach(function (f) {
      [el.format, el.bulkFormat].forEach(function (sel) {
        var opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = f.label;
        sel.appendChild(opt);
      });
    });
    el.format.value = DEFAULTS.format;
    el.bulkFormat.value = DEFAULTS.format;
  }

  function updateFormatNote() {
    var meta = V.FORMATS[el.format.value];
    el.formatNote.textContent = meta ? meta.note : '';
    el.data.placeholder = meta ? meta.placeholder : '';
    el.data.setAttribute('inputmode', isNumericFormat(el.format.value) ? 'numeric' : 'text');
  }

  function isNumericFormat(format) {
    return format === 'EAN13' || format === 'EAN8' || format === 'UPC' || format === 'ITF';
  }

  /* --------------------------------------------------------- preview ----- */
  function refresh() {
    var format = el.format.value;
    var raw = el.data.value;

    if (!raw) {
      state.lastValid = null;
      clearPreview(true, 'Enter some data to generate a barcode.');
      setMessage('Enter some data to generate a barcode.', '');
      return;
    }

    var result = V.validate(format, raw);

    if (!result.valid) {
      state.lastValid = null;
      clearPreview(true, 'Fix the highlighted issues to see a preview.');
      el.preview.classList.add('is-error');
      setMessage(result.message, 'error');
      return;
    }

    try {
      R.renderInto(el.preview, result.normalized, format, readSettings());
      el.previewMeta.textContent = result.normalized + '  \u00b7  ' + V.FORMATS[format].label;
      state.lastValid = { value: result.normalized, format: format, raw: raw };
      var kind = result.warnings.length ? 'warn' : 'ok';
      var prefix = result.warnings.length ? '\u26a0 ' : '\u2713 ';
      setMessage(prefix + result.message, kind);
    } catch (err) {
      state.lastValid = null;
      clearPreview(true, 'Could not render this barcode.');
      el.preview.classList.add('is-error');
      setMessage(err.message || 'Rendering failed.', 'error');
    }
  }

  var refreshTimer = null;
  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refresh, 120);
  }

  /* --------------------------------------------------------- exports ----- */
  function requireValid() {
    if (!state.lastValid) {
      toast('Generate a valid barcode first.', true);
      return null;
    }
    return state.lastValid;
  }

  function doExport(kind, button) {
    var current = requireValid();
    if (!current) return;
    var settings = readSettings();
    var name = current.format + '_' + current.value;
    try {
      if (kind === 'svg') {
        R.exportSVG(current.value, current.format, settings, name);
        toast('SVG downloaded.');
      } else if (kind === 'png') {
        setBusy(button, true, 'Rendering...');
        R.exportPNG(current.value, current.format, settings, name, settings.exportScale)
          .then(function () { toast('PNG downloaded.'); })
          .catch(function (e) { toast(e.message || 'PNG export failed.', true); })
          .then(function () { setBusy(button, false); });
      } else if (kind === 'pdf') {
        setBusy(button, true, 'Building PDF...');
        R.exportPDF(current.value, current.format, settings, name, settings.exportScale)
          .then(function () { toast('PDF downloaded.'); })
          .catch(function (e) { toast(e.message || 'PDF export failed.', true); })
          .then(function () { setBusy(button, false); });
      }
    } catch (err) {
      setBusy(button, false);
      toast(err.message || 'Export failed.', true);
    }
  }

  function doPrint() {
    var current = requireValid();
    if (!current) return;
    try {
      R.printBarcode(current.value, current.format, readSettings(), current.format + ' ' + current.value);
    } catch (err) {
      toast(err.message || 'Printing failed.', true);
    }
  }

  function doReset() {
    el.data.value = '';
    el.format.value = DEFAULTS.format;
    el.width.value = DEFAULTS.width; el.widthOut.textContent = DEFAULTS.width;
    el.height.value = DEFAULTS.height; el.heightOut.textContent = DEFAULTS.height;
    el.margin.value = DEFAULTS.margin; el.marginOut.textContent = DEFAULTS.margin;
    el.fontSize.value = DEFAULTS.fontSize; el.fontSizeOut.textContent = DEFAULTS.fontSize;
    el.textMargin.value = DEFAULTS.textMargin; el.textMarginOut.textContent = DEFAULTS.textMargin;
    el.textPosition.value = DEFAULTS.textPosition;
    el.lineColor.value = DEFAULTS.lineColor; el.lineColorText.value = DEFAULTS.lineColor;
    el.background.value = DEFAULTS.background; el.backgroundText.value = DEFAULTS.background;
    el.displayValue.checked = DEFAULTS.displayValue;
    el.exportScale.value = String(DEFAULTS.exportScale);
    updateFormatNote();
    refresh();
    setMessage('Reset to defaults.', '');
    toast('Reset to defaults.');
  }

  /* ----------------------------------------------------------- bulk ------ */
  function looksLikeCSV(text) {
    var firstLine = text.split(/\r\n|\r|\n/).filter(function (l) { return l.trim(); })[0] || '';
    return firstLine.indexOf(',') !== -1;
  }

  function generateBulk() {
    var text = el.bulkInput.value;
    if (!text.trim()) {
      el.bulkSummary.className = 'message is-error';
      el.bulkSummary.textContent = 'Paste some values or import a CSV file first.';
      el.bulkResults.innerHTML = '';
      el.bulkDownloads.hidden = true;
      return;
    }

    var defaultFormat = el.bulkFormat.value;
    var items = looksLikeCSV(text)
      ? BP.parseCSVItems(text, defaultFormat)
      : BP.parseLines(text, defaultFormat);

    var validated = BP.validateItems(items);
    state.bulkItems = validated;

    var summary = BP.summarize(validated);
    el.bulkSummary.className = 'message ' +
      (summary.invalid ? (summary.valid ? 'is-warn' : 'is-error') : 'is-ok');
    el.bulkSummary.textContent = summary.total + ' item(s): ' +
      summary.valid + ' valid, ' + summary.invalid + ' invalid.';

    renderBulkResults(validated);
    el.bulkDownloads.hidden = summary.valid === 0;
    if (summary.valid === 0) {
      toast('No valid barcodes to download.', true);
    } else {
      toast(summary.valid + ' barcode(s) generated.');
    }
  }

  function renderBulkResults(items) {
    el.bulkResults.innerHTML = '';
    if (!items.length) return;
    var settings = readSettings();

    items.forEach(function (item, index) {
      var card = document.createElement('div');
      card.className = 'bulk-item' + (item.result.valid ? '' : ' is-invalid');

      var preview = document.createElement('div');
      preview.className = 'bulk-item-preview';

      var meta = document.createElement('div');
      meta.className = 'bulk-item-meta';

      if (item.result.valid) {
        try {
          var svg = R.createSVG(item.result.normalized, item.format, settings);
          preview.appendChild(svg);
        } catch (e) {
          preview.textContent = 'Render error';
        }
        var label = document.createElement('div');
        label.className = 'code';
        label.textContent = item.result.normalized;
        meta.appendChild(label);
        var sub = document.createElement('div');
        sub.textContent = V.FORMATS[item.format] ? V.FORMATS[item.format].label : item.format;
        meta.appendChild(sub);
        if (item.result.warnings.length) {
          var w = document.createElement('div');
          w.textContent = '\u26a0 ' + item.result.warnings[0];
          meta.appendChild(w);
        }

        var actions = document.createElement('div');
        actions.className = 'bulk-item-actions';
        actions.appendChild(bulkButton('PNG', function () {
          R.exportPNG(item.result.normalized, item.format, settings,
            V.FORMATS[item.format].id + '_' + item.result.normalized, settings.exportScale)
            .then(function () { toast('PNG downloaded.'); })
            .catch(function (e) { toast(e.message || 'Export failed.', true); });
        }));
        actions.appendChild(bulkButton('SVG', function () {
          try {
            R.exportSVG(item.result.normalized, item.format, settings,
              V.FORMATS[item.format].id + '_' + item.result.normalized);
            toast('SVG downloaded.');
          } catch (e) { toast(e.message || 'Export failed.', true); }
        }));
        actions.appendChild(bulkButton('Print', function () {
          try {
            R.printBarcode(item.result.normalized, item.format, settings, item.result.normalized);
          } catch (e) { toast(e.message || 'Printing failed.', true); }
        }));
        card.appendChild(preview);
        card.appendChild(meta);
        card.appendChild(actions);
      } else {
        preview.textContent = '\u26a0';
        preview.style.fontSize = '1.6rem';
        preview.style.color = 'var(--danger)';
        preview.style.background = 'var(--danger-bg)';
        var header = document.createElement('div');
        header.className = 'code';
        header.style.fontFamily = 'var(--mono)';
        header.textContent = item.raw || '(empty)';
        meta.appendChild(header);
        var err = document.createElement('div');
        err.className = 'bulk-item-error';
        err.textContent = 'Line ' + item.line + ': ' + item.result.message;
        meta.appendChild(err);
        card.appendChild(preview);
        card.appendChild(meta);
      }
      card.dataset.index = String(index);
      el.bulkResults.appendChild(card);
    });
  }

  function bulkButton(label, handler) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-outline';
    b.textContent = label;
    b.addEventListener('click', handler);
    return b;
  }

  function downloadZip(kind, button) {
    if (!window.JSZip) {
      toast('JSZip is not loaded.', true);
      return;
    }
    var valid = state.bulkItems.filter(function (i) { return i.result.valid; });
    if (!valid.length) {
      toast('No valid barcodes to package.', true);
      return;
    }
    var settings = readSettings();
    setBusy(button, true, 'Packaging...');

    var zip = new window.JSZip();
    var used = {};
    var tasks = valid.map(function (item, index) {
      var base = R.sanitizeFilename(item.result.normalized, 'barcode');
      if (used[base]) { base += '_' + index; }
      used[base] = true;
      var name = String(index + 1).padStart(3, '0') + '_' + base;

      if (kind === 'svg') {
        zip.file(name + '.svg', R.renderSVGString(item.result.normalized, item.format, settings));
        return Promise.resolve();
      }
      return R.renderPNGBlob(item.result.normalized, item.format, settings, settings.exportScale)
        .then(function (blob) { zip.file(name + '.png', blob); });
    });

    Promise.all(tasks)
      .then(function () {
        return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      })
      .then(function (blob) {
        R.downloadBlob(blob, 'barcodes-' + kind + '.zip');
        toast('ZIP with ' + valid.length + ' barcode(s) downloaded.');
      })
      .catch(function (e) {
        toast(e && e.message ? e.message : 'ZIP creation failed.', true);
      })
      .then(function () { setBusy(button, false); });
  }

  function printAllBulk() {
    var valid = state.bulkItems.filter(function (i) { return i.result.valid; });
    if (!valid.length) {
      toast('No valid barcodes to print.', true);
      return;
    }
    var settings = readSettings();
    var win = window.open('', '_blank');
    if (!win) {
      toast('Printing was blocked. Allow pop-ups for this page.', true);
      return;
    }
    var doc = win.document;
    doc.open();
    doc.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Barcodes</title><style>' +
      '@page{margin:10mm;} body{font-family:monospace;margin:0;}' +
      '.sheet{display:flex;flex-wrap:wrap;gap:18px;}' +
      '.cell{page-break-inside:avoid;text-align:center;}' +
      '.cap{font-size:11px;margin-top:4px;}' +
      'svg{max-width:260px;height:auto;}' +
      '</style></head><body><div class="sheet">');
    valid.forEach(function (item) {
      try {
        var svg = R.createSVG(item.result.normalized, item.format, settings);
        doc.write('<div class="cell">' +
          R.serializeSVG(svg).replace(/^<\?xml[^>]*\?>\s*/, '') +
          '<div class="cap">' + escapeHTML(item.result.normalized) + '</div></div>');
      } catch (e) { /* skip broken item */ }
    });
    doc.write('</div></body></html>');
    doc.close();
    win.focus();
    var run = function () { try { win.print(); } catch (e) { /* ignore */ } };
    if (doc.readyState === 'complete') setTimeout(run, 250);
    else win.onload = function () { setTimeout(run, 250); };
  }

  function escapeHTML(str) {
    return String(str == null ? '' : str).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ----------------------------------------------------------- events ---- */
  function bindRange(input, output, suffix) {
    input.addEventListener('input', function () {
      output.textContent = input.value + (suffix || '');
      scheduleRefresh();
    });
  }

  function bindColor(colorInput, textInput) {
    colorInput.addEventListener('input', function () {
      textInput.value = colorInput.value;
      scheduleRefresh();
    });
    textInput.addEventListener('input', function () {
      var value = textInput.value.trim();
      if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
        colorInput.value = value.length === 4
          ? '#' + value[1] + value[1] + value[2] + value[2] + value[3] + value[3]
          : value;
        textInput.classList.remove('invalid');
        scheduleRefresh();
      } else {
        textInput.classList.add('invalid');
      }
    });
    textInput.addEventListener('blur', function () {
      if (textInput.classList.contains('invalid')) {
        textInput.value = colorInput.value;
        textInput.classList.remove('invalid');
      }
    });
  }

  function switchTab(name) {
    var isBulk = name === 'bulk';
    $('panel-single').classList.toggle('hidden', isBulk);
    $('panel-bulk').classList.toggle('hidden', !isBulk);
    var singleTab = $('tab-single');
    var bulkTab = $('tab-bulk');
    singleTab.classList.toggle('is-active', !isBulk);
    bulkTab.classList.toggle('is-active', isBulk);
    singleTab.setAttribute('aria-selected', String(!isBulk));
    bulkTab.setAttribute('aria-selected', String(isBulk));
  }

  function bindEvents() {
    el.data.addEventListener('input', scheduleRefresh);
    el.format.addEventListener('change', function () { updateFormatNote(); refresh(); });

    bindRange(el.width, el.widthOut);
    bindRange(el.height, el.heightOut);
    bindRange(el.margin, el.marginOut);
    bindRange(el.fontSize, el.fontSizeOut);
    bindRange(el.textMargin, el.textMarginOut);

    el.textPosition.addEventListener('change', scheduleRefresh);
    el.displayValue.addEventListener('change', scheduleRefresh);
    el.exportScale.addEventListener('change', function () { /* applies on next export */ });

    bindColor(el.lineColor, el.lineColorText);
    bindColor(el.background, el.backgroundText);

    $('generateBtn').addEventListener('click', function () { refresh(); });
    $('resetBtn').addEventListener('click', doReset);
    $('downloadPng').addEventListener('click', function () { doExport('png', this); });
    $('downloadSvg').addEventListener('click', function () { doExport('svg', this); });
    $('downloadPdf').addEventListener('click', function () { doExport('pdf', this); });
    $('printBtn').addEventListener('click', doPrint);

    $('tab-single').addEventListener('click', function () { switchTab('single'); });
    $('tab-bulk').addEventListener('click', function () { switchTab('bulk'); });

    $('bulkGenerate').addEventListener('click', generateBulk);
    $('bulkClear').addEventListener('click', function () {
      el.bulkInput.value = '';
      el.bulkResults.innerHTML = '';
      el.bulkSummary.className = 'message';
      el.bulkSummary.textContent = '';
      el.bulkDownloads.hidden = true;
      state.bulkItems = [];
    });
    $('bulkSample').addEventListener('click', function () {
      el.bulkInput.value = [
        '5901234123457',
        'CODE39-001,CODE39',
        '96385074,EAN8',
        '036000291452',
        'A123456789B,codabar',
        '1234567890,ITF',
        'LOT-2024-0001,CODE128'
      ].join('\n');
      generateBulk();
    });
    $('bulkFile').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        el.bulkInput.value = String(reader.result || '');
        generateBulk();
      };
      reader.onerror = function () { toast('Could not read the CSV file.', true); };
      reader.readAsText(file);
    });
    $('bulkZipPng').addEventListener('click', function () { downloadZip('png', this); });
    $('bulkZipSvg').addEventListener('click', function () { downloadZip('svg', this); });
    $('bulkPrintAll').addEventListener('click', printAllBulk);

    $('themeToggle').addEventListener('click', function () {
      var theme = window.BarcodeTheme.toggle();
      toast(theme === 'dark' ? 'Dark mode' : 'Light mode');
    });

    // Re-render preview when theme changes so background defaults stay readable.
    document.addEventListener('themechange', function () {
      if (state.lastValid) { try { refresh(); } catch (e) { /* ignore */ } }
    });
  }

  /* ------------------------------------------------------------ init ----- */
  function init() {
    if (window.BarcodeTheme) window.BarcodeTheme.init();
    fillFormatSelects();
    updateFormatNote();
    bindEvents();
    refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
