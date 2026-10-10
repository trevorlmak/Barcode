/*
 * test.js — dependency:free Node unit tests for the pure logic modules
 * (validators.js and bulk.js). Run with:  node tests/test.js
 */
'use strict';

const assert = require('assert');
const V = require('../js/validators.js');
const BP = require('../js/bulk.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  \u2713 ' + name);
  } catch (err) {
    failed++;
    console.error('  \u2717 ' + name);
    console.error('      ' + (err && err.message));
  }
}

function section(name) {
  console.log('\n== ' + name + ' ==');
}

/* ----------------------------------------------------------- check digits */
section('GTIN check digit');

test('EAN-13 check digit (4006381333931 body 400638133393)', () => {
  assert.strictEqual(V.computeGTINCheckDigit('400638133393'), 1);
});

test('EAN-13 check digit (5901234123457 body 590123412345)', () => {
  assert.strictEqual(V.computeGTINCheckDigit('590123412345'), 7);
});

test('UPC-A check digit (036000291452 body 03600029145)', () => {
  assert.strictEqual(V.computeGTINCheckDigit('03600029145'), 2);
});

test('EAN-8 check digit (73513537 body 7351353)', () => {
  assert.strictEqual(V.computeGTINCheckDigit('7351353'), 7);
});

/* ----------------------------------------------------------- EAN-13 ----- */
section('EAN-13');

test('valid 13-digit with correct check passes', () => {
  const r = V.validate('EAN13', '5901234123457');
  assert.strictEqual(r.valid, true);
  assert.strictEqual(r.normalized, '5901234123457');
});

test('13-digit with wrong check fails with a helpful message', () => {
  const r = V.validate('EAN13', '5901234123450');
  assert.strictEqual(r.valid, false);
  assert.ok(/check digit/i.test(r.message));
});

test('12 digits gets its check digit added', () => {
  const r = V.validate('EAN13', '590123412345');
  assert.strictEqual(r.valid, true);
  assert.strictEqual(r.normalized, '5901234123457');
  assert.strictEqual(r.corrected, true);
  assert.ok(r.warnings.length > 0);
});

test('letters are rejected', () => {
  assert.strictEqual(V.validate('EAN13', '59012341234A').valid, false);
});

test('wrong length rejected', () => {
  assert.strictEqual(V.validate('EAN13', '59012341234').valid, false);
  assert.strictEqual(V.validate('EAN13', '59012341234567').valid, false);
});

test('empty rejected', () => {
  assert.strictEqual(V.validate('EAN13', '').valid, false);
});

/* ----------------------------------------------------------- EAN-8 ------ */
section('EAN-8');

test('valid 8-digit passes', () => {
  const r = V.validate('EAN8', '96385074');
  assert.strictEqual(r.valid, true);
  assert.strictEqual(r.normalized, '96385074');
});

test('invalid EAN-8 check rejected', () => {
  assert.strictEqual(V.validate('EAN8', '96385070').valid, false);
});

test('7 digits padded with check', () => {
  const r = V.validate('EAN8', '9638507');
  assert.strictEqual(r.valid, true);
  assert.strictEqual(r.normalized, '96385074');
});

/* ----------------------------------------------------------- UPC -------- */
section('UPC-A');

test('valid 12-digit passes', () => {
  const r = V.validate('UPC', '036000291452');
  assert.strictEqual(r.valid, true);
  assert.strictEqual(r.normalized, '036000291452');
});

test('11 digits padded with check', () => {
  const r = V.validate('UPC', '03600029145');
  assert.strictEqual(r.valid, true);
  assert.strictEqual(r.normalized, '036000291452');
});

test('wrong UPC check rejected', () => {
  assert.strictEqual(V.validate('UPC', '036000291450').valid, false);
});

/* ----------------------------------------------------------- CODE128 ---- */
section('Code 128');

test('plain ASCII accepted', () => {
  const r = V.validate('CODE128', 'ABC-123456');
  assert.strictEqual(r.valid, true);
  assert.strictEqual(r.normalized, 'ABC-123456');
});

test('unicode rejected', () => {
  const r = V.validate('CODE128', 'héllo');
  assert.strictEqual(r.valid, false);
  assert.ok(/unsupported/i.test(r.message) || /ASCII/i.test(r.message));
});

/* ----------------------------------------------------------- CODE39 ----- */
section('Code 39');

test('valid chars accepted', () => {
  const r = V.validate('CODE39', 'ABC-123');
  assert.strictEqual(r.valid, true);
});

test('lowercase is uppercased with a warning', () => {
  const r = V.validate('CODE39', 'abc-123');
  assert.strictEqual(r.valid, true);
  assert.strictEqual(r.normalized, 'ABC-123');
  assert.strictEqual(r.corrected, true);
  assert.ok(r.warnings.length > 0);
});

test('unsupported chars rejected', () => {
  const r = V.validate('CODE39', 'TEXT@');
  assert.strictEqual(r.valid, false);
  assert.ok(/@/.test(r.message));
});

/* ----------------------------------------------------------- ITF -------- */
section('ITF');

test('even digits accepted', () => {
  const r = V.validate('ITF', '1234567890');
  assert.strictEqual(r.valid, true);
});

test('odd digits rejected', () => {
  const r = V.validate('ITF', '12345');
  assert.strictEqual(r.valid, false);
  assert.ok(/even/i.test(r.message));
});

test('letters rejected', () => {
  assert.strictEqual(V.validate('ITF', '12345A').valid, false);
});

/* ----------------------------------------------------------- Codabar ---- */
section('Codabar');

test('bare digits get wrapped in A-A', () => {
  const r = V.validate('codabar', '123456');
  assert.strictEqual(r.valid, true);
  assert.strictEqual(r.normalized, 'A123456A');
  assert.strictEqual(r.corrected, true);
});

test('explicit A-D start/stop accepted', () => {
  const r = V.validate('codabar', 'B123456C');
  assert.strictEqual(r.valid, true);
  assert.strictEqual(r.normalized, 'B123456C');
});

test('invalid characters rejected', () => {
  assert.strictEqual(V.validate('codabar', '12x45').valid, false);
});

/* ----------------------------------------------------------- unknown ---- */
section('Format sanity');

test('unknown format returns an error', () => {
  const r = V.validate('BOGUS', '123');
  assert.strictEqual(r.valid, false);
});

test('all FORMAT_LIST ids have validators', () => {
  V.FORMAT_LIST.forEach(f => {
    assert.strictEqual(typeof V.validate(f.id, 'check').valid, 'boolean');
  });
});

test('formats object exposes label/note for all entries', () => {
  V.FORMAT_LIST.forEach(f => {
    const meta = V.FORMATS[f.id];
    assert.ok(meta && meta.label && meta.note);
  });
});

/* ----------------------------------------------------------- CSV -------- */
section('CSV parsing');

test('simple CSV rows', () => {
  const rows = BP.parseCSV('a,b\n1,2\n');
  assert.strictEqual(rows.length, 2);
  assert.deepStrictEqual(rows[0], ['a', 'b']);
  assert.deepStrictEqual(rows[1], ['1', '2']);
});

test('CRLF line endings', () => {
  const rows = BP.parseCSV('a,b\r\n1,2\r\n');
  assert.strictEqual(rows.length, 2);
});

test('quoted fields with commas', () => {
  const rows = BP.parseCSV('"hello, world",CODE128');
  assert.deepStrictEqual(rows[0], ['hello, world', 'CODE128']);
});

test('escaped quotes', () => {
  const rows = BP.parseCSV('"say ""hi""",x');
  assert.deepStrictEqual(rows[0], ['say "hi"', 'x']);
});

/* ----------------------------------------------------------- bulk ------- */
section('Bulk parsing');

test('parseLines: values only', () => {
  const items = BP.parseLines('123\n456\n789', 'CODE128');
  assert.strictEqual(items.length, 3);
  assert.strictEqual(items[0].format, 'CODE128');
});

test('parseLines: value,format override', () => {
  const items = BP.parseLines('123\nCODE39-001,CODE39', 'CODE128');
  assert.strictEqual(items[1].format, 'CODE39');
});

test('parseLines: ignores blank lines', () => {
  const items = BP.parseLines('\n123\n\n456\n', 'CODE128');
  assert.strictEqual(items.length, 2);
});

test('parseCSVItems skips header row', () => {
  const items = BP.parseCSVItems('value,format\n123,CODE39\n456\n', 'CODE128');
  assert.strictEqual(items.length, 2);
  assert.strictEqual(items[0].format, 'CODE39');
  assert.strictEqual(items[1].format, 'CODE128');
});

test('validateItems marks valid and invalid items', () => {
  const items = BP.parseLines('5901234123457\nh\u00e9llo', 'CODE128');
  const checked = BP.validateItems(items);
  assert.strictEqual(checked[0].result.valid, true);
  assert.strictEqual(checked[1].result.valid, false);
});

test('summarize counts correctly', () => {
  const items = BP.parseLines('5901234123457\nh\u00e9llo\n123', 'CODE128');
  const checked = BP.validateItems(items);
  const s = BP.summarize(checked);
  assert.strictEqual(s.total, 3);
  assert.strictEqual(s.valid, 2);
  assert.strictEqual(s.invalid, 1);
});

/* ----------------------------------------------------------- E2E -------- */
section('End-to-end validation');

test('known bookstore barcode normalises correctly', () => {
  const r = V.validate('EAN13', '978 3 16 148410 0'.replace(/\s+/g, ''));
  assert.strictEqual(r.valid, true);
  assert.strictEqual(r.normalized, '9783161484100');
});

test('README sample EAN-8 round trips', () => {
  const r = V.validate('EAN8', '7351353');
  assert.strictEqual(r.normalized, '73513537');
  assert.strictEqual(V.validate('EAN8', '73513537').valid, true);
});

/* ------------------------------------------------------------------------ */
console.log('\n----------------------------------------');
console.log(passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);