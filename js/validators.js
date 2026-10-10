/*
 * validators.js
 * ---------------------------------------------------------------------------
 * Pure validation / normalisation logic for every supported barcode format.
 * No DOM, no external libraries: this file can be loaded in the browser as a
 * plain <script> (exposes window.BarcodeValidators) or required from Node.js
 * for unit testing (module.exports).
 * ---------------------------------------------------------------------------
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarcodeValidators = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Format metadata                                                     */
  /* ------------------------------------------------------------------ */

  var FORMATS = {
    CODE128: {
      id: 'CODE128',
      label: 'Code 128',
      placeholder: 'e.g. ABC-123456',
      sample: 'ABC-123456',
      supportsText: true,
      note: 'Encodes the full ASCII range (0-127). Compact and widely used for shipping and inventory.'
    },
    CODE39: {
      id: 'CODE39',
      label: 'Code 39',
      placeholder: 'e.g. CODE39-001',
      sample: 'CODE39-001',
      supportsText: true,
      note: 'Uppercase letters, digits and - . space $ / + %. Input is converted to uppercase.'
    },
    EAN13: {
      id: 'EAN13',
      label: 'EAN-13',
      placeholder: '12 or 13 digits, e.g. 5901234123457',
      sample: '5901234123457',
      supportsText: true,
      note: '12 digits (check digit computed) or 13 digits (check digit verified).'
    },
    EAN8: {
      id: 'EAN8',
      label: 'EAN-8',
      placeholder: '7 or 8 digits, e.g. 96385074',
      sample: '96385074',
      supportsText: true,
      note: '7 digits (check digit computed) or 8 digits (check digit verified).'
    },
    UPC: {
      id: 'UPC',
      label: 'UPC-A',
      placeholder: '11 or 12 digits, e.g. 036000291452',
      sample: '036000291452',
      supportsText: true,
      note: '11 digits (check digit computed) or 12 digits (check digit verified).'
    },
    ITF: {
      id: 'ITF',
      label: 'ITF (Interleaved 2 of 5)',
      placeholder: 'Even number of digits, e.g. 123456',
      sample: '1234567890',
      supportsText: true,
      note: 'Digits only, an even number of them. Used for cartons and distribution.'
    },
    codabar: {
      id: 'codabar',
      label: 'Codabar',
      placeholder: 'Digits and - $ : / . +  e.g. A123456789B',
      sample: 'A123456789A',
      supportsText: true,
      note: 'Digits and the symbols - $ : / . + with optional A-D start/stop characters.'
    }
  };

  var FORMAT_LIST = [
    FORMATS.CODE128,
    FORMATS.CODE39,
    FORMATS.EAN13,
    FORMATS.EAN8,
    FORMATS.UPC,
    FORMATS.ITF,
    FORMATS.codabar
  ];

  var CODE39_ALLOWED = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%';
  var CODABAR_SYMBOLS = '0123456789-$:/.+';

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  function isDigits(value) {
    return /^[0-9]+$/.test(value);
  }

  /**
   * Compute the GTIN (EAN/UPC) check digit for a body of digits.
   * Weights run 3,1,3,1... starting from the right-most body digit.
   * Works for EAN-8 (7), EAN-13 (12) and UPC-A (11) bodies.
   */
  function computeGTINCheckDigit(body) {
    var sum = 0;
    var weight = 3;
    for (var i = body.length - 1; i >= 0; i--) {
      sum += (body.charCodeAt(i) - 48) * weight;
      weight = weight === 3 ? 1 : 3;
    }
    return (10 - (sum % 10)) % 10;
  }

  function unsupportedChars(value, allowed) {
    var bad = {};
    for (var i = 0; i < value.length; i++) {
      if (allowed.indexOf(value.charAt(i)) === -1) {
        bad[value.charAt(i)] = true;
      }
    }
    return Object.keys(bad);
  }

  function result(format, overrides) {
    var base = {
      valid: false,
      format: format,
      value: '',
      normalized: '',
      corrected: false,
      errors: [],
      warnings: [],
      message: ''
    };
    for (var key in overrides) {
      if (Object.prototype.hasOwnProperty.call(overrides, key)) {
        base[key] = overrides[key];
      }
    }
    if (!base.message) {
      if (base.errors.length) {
        base.message = base.errors.join(' ');
      } else if (base.warnings.length) {
        base.message = base.warnings.join(' ');
      } else {
        base.message = 'Ready to generate.';
      }
    }
    return base;
  }

  function fail(format, value, errors) {
    return result(format, { valid: false, value: value, errors: errors });
  }

  /* ------------------------------------------------------------------ */
  /* Per-format validators                                               */
  /* ------------------------------------------------------------------ */

  function validateCODE128(value) {
    var format = 'CODE128';
    if (!value.length) {
      return fail(format, value, ['Enter some data to encode.']);
    }
    var bad = [];
    for (var i = 0; i < value.length; i++) {
      if (value.charCodeAt(i) > 127) {
        bad.push(value.charAt(i));
      }
    }
    if (bad.length) {
      return fail(format, value, [
        'Code 128 supports ASCII characters 0-127 only. Unsupported: "' + bad.join(' ') + '".'
      ]);
    }
    return result(format, { valid: true, value: value, normalized: value, message: 'Valid Code 128 data.' });
  }

  function validateCODE39(value) {
    var format = 'CODE39';
    if (!value.length) {
      return fail(format, value, ['Enter some data to encode.']);
    }
    var warnings = [];
    var normalized = value.toUpperCase();
    if (normalized !== value) {
      warnings.push('Code 39 is uppercase; input converted to uppercase.');
    }
    var bad = unsupportedChars(normalized, CODE39_ALLOWED);
    if (bad.length) {
      return fail(format, value, [
        'Code 39 does not allow: "' + bad.join(' ') + '". Allowed: A-Z, 0-9 and - . space $ / + %.'
      ]);
    }
    return result(format, {
      valid: true,
      value: value,
      normalized: normalized,
      corrected: normalized !== value,
      warnings: warnings,
      message: warnings.length ? warnings[0] : 'Valid Code 39 data.'
    });
  }

  function validateGTIN(format, value, expectedBody) {
    var digits = value.replace(/\s+/g, '');
    if (!digits.length) {
      return fail(format, value, ['Enter the digits to encode.']);
    }
    if (!isDigits(digits)) {
      var bad = unsupportedChars(digits, '0123456789');
      return fail(format, value, [
        format + ' accepts digits only. Remove: "' + bad.join(' ') + '".'
      ]);
    }
    if (digits.length === expectedBody) {
      var check = computeGTINCheckDigit(digits);
      var full = digits + check;
      return result(format, {
        valid: true,
        value: value,
        normalized: full,
        corrected: true,
        warnings: ['Check digit ' + check + ' was added automatically (' + full + ').'],
        message: 'Valid: check digit ' + check + ' added automatically.'
      });
    }
    if (digits.length === expectedBody + 1) {
      var body = digits.slice(0, expectedBody);
      var expected = computeGTINCheckDigit(body);
      var actual = digits.charCodeAt(expectedBody) - 48;
      if (expected === actual) {
        return result(format, {
          valid: true,
          value: value,
          normalized: digits,
          message: 'Valid ' + format + ' with correct check digit.'
        });
      }
      return fail(format, value, [
        'Invalid check digit: expected ' + expected + ' but got ' + actual + '.'
      ]);
    }
    var range = format + ' requires ' + expectedBody + ' or ' + (expectedBody + 1) + ' digits';
    return fail(format, value, [range + ' (received ' + digits.length + ').']);
  }

  function validateEAN13(value) {
    return validateGTIN('EAN13', value, 12);
  }
  function validateEAN8(value) {
    return validateGTIN('EAN8', value, 7);
  }
  function validateUPC(value) {
    return validateGTIN('UPC', value, 11);
  }

  function validateITF(value) {
    var format = 'ITF';
    var digits = value.replace(/\s+/g, '');
    if (!digits.length) {
      return fail(format, value, ['Enter the digits to encode.']);
    }
    if (!isDigits(digits)) {
      var bad = unsupportedChars(digits, '0123456789');
      return fail(format, value, [
        'ITF accepts digits only. Remove: "' + bad.join(' ') + '".'
      ]);
    }
    if (digits.length % 2 !== 0) {
      return fail(format, value, [
        'ITF requires an even number of digits (received ' + digits.length + ').'
      ]);
    }
    if (digits.length < 4) {
      return result(format, {
        valid: true,
        value: value,
        normalized: digits,
        warnings: ['Very short ITF barcodes may be hard to scan reliably.'],
        message: 'Valid, but very short ITF data.'
      });
    }
    return result(format, { valid: true, value: value, normalized: digits, message: 'Valid ITF data.' });
  }

  function validateCodabar(value) {
    var format = 'codabar';
    if (!value.length) {
      return fail(format, value, ['Enter some data to encode.']);
    }
    if (/^[0-9\-$:/.+]+$/.test(value)) {
      var wrapped = 'A' + value + 'A';
      var badSymbols = unsupportedChars(value, CODABAR_SYMBOLS);
      if (badSymbols.length) {
        return fail(format, value, ['Codabar does not allow: "' + badSymbols.join(' ') + '".']);
      }
      return result(format, {
        valid: true,
        value: value,
        normalized: wrapped,
        corrected: true,
        warnings: ['Start/stop characters A were added automatically.'],
        message: 'Valid: start/stop characters A added automatically.'
      });
    }
    if (/^[A-D][0-9\-$:/.+]+[A-D]$/.test(value)) {
      return result(format, { valid: true, value: value, normalized: value, message: 'Valid Codabar data.' });
    }
    return fail(format, value, [
      'Codabar must be digits/symbols (- $ : / . +) optionally wrapped in A-D start/stop characters, e.g. A12345B.'
    ]);
  }

  var VALIDATORS = {
    CODE128: validateCODE128,
    CODE39: validateCODE39,
    EAN13: validateEAN13,
    EAN8: validateEAN8,
    UPC: validateUPC,
    ITF: validateITF,
    codabar: validateCodabar
  };

  /**
   * Validate a raw string for a given format.
   * @param {string} format
   * @param {string} raw
   * @returns {object} validation result
   */
  function validate(format, raw) {
    if (!VALIDATORS[format]) {
      return fail(format, raw, ['Unknown barcode format: ' + format]);
    }
    return VALIDATORS[format](raw == null ? '' : String(raw));
  }

  /**
   * Convenience: validate and return the normalised value (or null).
   */
  function normalize(format, raw) {
    var r = validate(format, raw);
    return r.valid ? r.normalized : null;
  }

  return {
    FORMATS: FORMATS,
    FORMAT_LIST: FORMAT_LIST,
    computeGTINCheckDigit: computeGTINCheckDigit,
    validate: validate,
    normalize: normalize
  };
});
