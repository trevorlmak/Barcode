/*
 * build-offline.js
 * ---------------------------------------------------------------------------
 * Packages a standalone, offline-ready copy of the app.
 *   - copies index.html, css/, js/ and vendor/ into dist/barcode-studio-offline/
 *   - zips that folder into dist/barcode-studio-offline.zip
 * The app does not fetch anything at runtime, so the copy is fully offline.
 * Run with:  node scripts/build-offline.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT_DIR = path.join(DIST, 'barcode-studio-offline');
const ZIP = path.join(DIST, 'barcode-studio-offline.zip');

const INCLUDE = ['index.html', 'css', 'js', 'vendor'];
const EXCLUDE = new Set(['.git', 'dist', 'node_modules', 'tests', 'scripts']);

function collect(base) {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (EXCLUDE.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.push(full);
    }
  };
  walk(base);
  return files;
}

function copyTree() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const rel of INCLUDE) {
    const src = path.join(ROOT, rel);
    const dst = path.join(OUT_DIR, rel);
    if (!fs.existsSync(src)) {
      console.error('Missing path:', rel);
      process.exit(1);
    }
    if (fs.statSync(src).isDirectory()) fs.cpSync(src, dst, { recursive: true });
    else fs.cpSync(src, dst);
  }
  fs.copyFileSync(path.join(ROOT, 'README.md'), path.join(OUT_DIR, 'README.md'));
}

function zipDir() {
  fs.rmSync(ZIP, { force: true });
  const platform = process.platform;
  try {
    if (platform === 'win32') {
      execSync(
        `powershell -NoProfile -Command "Compress-Archive -Path '${OUT_DIR}\\*' -DestinationPath '${ZIP}' -Force"`,
        { stdio: 'inherit' }
      );
    } else {
      execFileSync('zip', ['-r', ZIP, OUT_DIR], { stdio: 'inherit' });
    }
  } catch (err) {
    console.warn('ZIP creation failed (zip tooling unavailable?). The folder copy is still usable.');
    console.warn(err.message);
    process.exit(1);
  }
}

console.log('Building offline bundle...');
copyTree();
zipDir();
const count = collect(OUT_DIR).length;
console.log(`Done. ${count} files copied.`);
console.log('  Folder : ' + OUT_DIR);
console.log('  ZIP    : ' + ZIP);