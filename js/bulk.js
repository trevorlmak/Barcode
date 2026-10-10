/*
 * bulk.js
 * ---------------------------------------------------------------------------
 * Parsing helpers for bulk barcode generation:
 *   - a small RFC-4180-ish CSV parser (handles quotes, commas, CRLF)
 *   - a line-based parser for one-value-per-line text input
 * Pure logic only (no DOM) so it can be unit tested in Node.
 * ---------------------------------------------------------------------------
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./validators.js'));
  } else {
    root.BulkParser = factory(root.BarcodeValidators);
  }
})(typeof self !== 'undefined' ? self : this, function (Validators) {
  'use strict';

  /**
   * Parse CSV text into an array of rows (each row is an array of cells).
   * Supports quoted fields, escaped quotes ("") and both CRLF/LF.
   */
  function parseCSV(text) {
    var rows = [];
    var row = [];
    var cell = '';
    var inQuotes = false;
    var i = 0;
    var len = text.length;

    while (i < len) {
      var ch = text.charAt(i);

      if (inQuotes) {
        if (ch === '"') {
          if (text.charAt(i + 1) === '"') {
            cell += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          i++;
          continue;
        }
        cell += ch;
        i++;
        continue;
      }

      if (ch === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (ch === ',') {
        row.push(cell);
        cell = '';
        i++;
        continue;
      }
      if (ch === '\r') {
        // swallow CR; LF handled below (or CR alone)
        if (text.charAt(i + 1) === '\n') {
          i++;
          continue;
        }
        row.push(cell);
        cell = '';
        rows.push(row);
        row = [];
        i++;
        continue;
      }
      if (ch === '\n') {
        row.push(cell);
        cell = '';
        rows.push(row);
        row = [];
        i++;
        continue;
      }
      cell += ch;
      i++;
    }

    // flush trailing cell / row
    if (cell.length > 0 || row.length > 0) {
      row.push(cell);
      rows.push(row);
    }
    return rows;
  }

  function looksLikeFormat(token) {
    if (!token) return false;
    var trimmed = token.trim();
    for (var i = 0; i < Validators.FORMAT_LIST.length; i++) {
      var id = Validators.FORMAT_LIST[i].id;
      if (id.toLowerCase() === trimmed.toLowerCase() || Validators.FORMAT_LIST[i].label.toLowerCase() === trimmed.toLowerCase()) {
        return id;
      }
    }
    return false;
  }

  function resolveFormat(token, fallback) {
    return looksLikeFormat(token) || fallback;
  }

  /**
   * Parse free-form text: one entry per line.
   * Each line may be "value" or "value<,|;|tab>format".
   */
  function parseLines(text, defaultFormat) {
    var items = [];
    var lines = String(text).split(/\r\n|\r|\n/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line.trim()) continue;
      var split = splitValueAndFormat(line);
      items.push({
        source: 'text',
        line: i + 1,
        raw: split.value,
        format: resolveFormat(split.format, defaultFormat)
      });
    }
    return items;
  }

  function splitValueAndFormat(line) {
    // Prefer comma, then semicolon, then tab.
    var separators = [',', ';', '\t'];
    for (var s = 0; s < separators.length; s++) {
      var sep = separators[s];
      var idx = line.lastIndexOf(sep);
      if (idx > 0) {
        var maybeFormat = line.slice(idx + 1).trim();
        if (looksLikeFormat(maybeFormat)) {
          return { value: line.slice(0, idx).trim(), format: maybeFormat };
        }
      }
    }
    return { value: line.trim(), format: '' };
  }

  /**
   * Parse CSV text. The first column is the value, an optional second
   * column may name the format. A header row containing "value"/"data"
   * (and optionally "format") is detected and skipped.
   */
  function parseCSVItems(text, defaultFormat) {
    var rows = parseCSV(text);
    var items = [];
    var start = 0;

    if (rows.length && rows[0].length) {
      var first = (rows[0][0] || '').trim().toLowerCase();
      var second = (rows[0][1] || '').trim().toLowerCase();
      if (first === 'value' || first === 'data' || first === 'barcode' || first === 'code') {
        start = 1;
        if (second && second !== 'format') {
          start = 1; // still skip header row
        }
      }
    }

    for (var i = start; i < rows.length; i++) {
      var row = rows[i];
      if (!row.length) continue;
      var value = (row[0] == null ? '' : String(row[0])).trim();
      if (!value) continue;
      var fmt = row.length > 1 ? resolveFormat(row[1], defaultFormat) : defaultFormat;
      items.push({ source: 'csv', line: i + 1, raw: value, format: fmt });
    }
    return items;
  }

  /**
   * Validate a list of parsed items. Returns a new array with a `result`
   * property attached to each item.
   */
  function validateItems(items) {
    return items.map(function (item) {
      return {
        source: item.source,
        line: item.line,
        raw: item.raw,
        format: item.format,
        result: Validators.validate(item.format, item.raw)
      };
    });
  }

  function summarize(validated) {
    var valid = 0;
    var invalid = 0;
    validated.forEach(function (item) {
      if (item.result.valid) valid++; else invalid++;
    });
    return { total: validated.length, valid: valid, invalid: invalid };
  }

  return {
    parseCSV: parseCSV,
    parseLines: parseLines,
    parseCSVItems: parseCSVItems,
    validateItems: validateItems,
    summarize: summarize,
    looksLikeFormat: looksLikeFormat
  };
});
