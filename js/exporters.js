/*
 * exporters.js
 * ---------------------------------------------------------------------------
 * Browser-only rendering and export helpers. Requires the vendors:
 *   - JsBarcode  (window.JsBarcode)
 *   - jsPDF      (window.jspdf.jsPDF)
 *   - JSZip      (window.JSZip)
 * Exposes window.BarcodeRender.
 * ---------------------------------------------------------------------------
 */
(function (root) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  /* ------------------------------------------------------------------ */
  /* Options                                                             */
  /* ------------------------------------------------------------------ */

  /**
   * Translate the UI settings object into JsBarcode options.
   * @param {string} format
   * @param {object} s settings
   */
  function buildOptions(format, s) {
    return {
      format: format,
      width: clamp(s.width, 1, 8),
      height: clamp(s.height, 20, 400),
      displayValue: !!s.displayValue,
      textMargin: clamp(s.textMargin, 0, 40),
      fontSize: clamp(s.fontSize, 8, 40),
      font: 'monospace',
      textAlign: s.textAlign || 'center',
      textPosition: s.textPosition || 'bottom',
      background: s.background || '#ffffff',
      lineColor: s.lineColor || '#000000',
      margin: clamp(s.margin, 0, 60),
      flat: false
    };
  }

  function clamp(value, min, max) {
    var n = Number(value);
    if (!isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  /* ------------------------------------------------------------------ */
  /* SVG rendering                                                       */
  /* ------------------------------------------------------------------ */

  function ensureSvg() {
    var svg = document.createElementNS(SVG_NS, 'svg');
    return svg;
  }

  /**
   * Render a barcode to an SVG element.
   * @returns {SVGElement}
   */
  function createSVG(value, format, settings) {
    if (typeof root.JsBarcode !== 'function') {
      throw new Error('JsBarcode is not loaded.');
    }
    var svg = ensureSvg();
    root.JsBarcode(svg, value, buildOptions(format, settings));
    svg.setAttribute('xmlns', SVG_NS);
    return svg;
  }

  /**
   * Render a barcode into a DOM container (clears it first).
   */
  function renderInto(container, value, format, settings) {
    if (!container) return null;
    while (container.firstChild) container.removeChild(container.firstChild);
    var svg = createSVG(value, format, settings);
    container.appendChild(svg);
    return svg;
  }

  function serializeSVG(svg) {
    var clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', SVG_NS);
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    var source = new XMLSerializer().serializeToString(clone);
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + source;
  }

  function svgDimensions(svg) {
    var width = parseFloat(svg.getAttribute('width'));
    var height = parseFloat(svg.getAttribute('height'));
    if (!width || !height) {
      var box = svg.getBoundingClientRect();
      width = width || box.width || 300;
      height = height || box.height || 150;
    }
    return { width: Math.ceil(width), height: Math.ceil(height) };
  }

  function svgToDataURL(svgString) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
  }

  /**
   * Rasterise an SVG element onto a canvas at a given scale.
   * @param {SVGElement} svg
   * @param {number} scale pixel density multiplier (1-16)
   * @param {string} [background] optional CSS colour painted behind the image
   * @returns {Promise<HTMLCanvasElement>}
   */
  function svgToCanvas(svg, scale, background) {
    var dims = svgDimensions(svg);
    var factor = clamp(scale || 2, 1, 16);
    var canvas = document.createElement('canvas');
    canvas.width = Math.round(dims.width * factor);
    canvas.height = Math.round(dims.height * factor);
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    var xml = serializeSVG(svg);
    var url = svgToDataURL(xml);

    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        if (background) {
          ctx.fillStyle = background;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas);
      };
      img.onerror = function () {
        reject(new Error('Could not rasterise the SVG barcode.'));
      };
      img.src = url;
    });
  }

  function canvasToBlob(canvas) {
    return new Promise(function (resolve, reject) {
      if (canvas.toBlob) {
        canvas.toBlob(function (blob) {
          if (blob) resolve(blob);
          else reject(new Error('Canvas export failed.'));
        }, 'image/png');
      } else {
        try {
          var data = canvas.toDataURL('image/png');
          resolve(dataURLToBlob(data));
        } catch (e) {
          reject(e);
        }
      }
    });
  }

  function dataURLToBlob(dataURL) {
    var parts = dataURL.split(',');
    var mime = parts[0].match(/:(.*?);/)[1];
    var binary = atob(parts[1]);
    var array = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
    return new Blob([array], { type: mime });
  }

  function canvasToDataURL(canvas) {
    return canvas.toDataURL('image/png');
  }

  /* ------------------------------------------------------------------ */
  /* File helpers                                                        */
  /* ------------------------------------------------------------------ */

  function sanitizeFilename(name, fallback) {
    var cleaned = String(name == null ? '' : name)
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/\s+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80);
    return cleaned || fallback || 'barcode';
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ------------------------------------------------------------------ */
  /* Public export functions                                             */
  /* ------------------------------------------------------------------ */

  function exportSVG(value, format, settings, filename) {
    var svg = createSVG(value, format, settings);
    var blob = new Blob([serializeSVG(svg)], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, sanitizeFilename(filename || value) + '.svg');
    return svg;
  }

  function exportPNG(value, format, settings, filename, scale) {
    var svg = createSVG(value, format, settings);
    return svgToCanvas(svg, scale || settings.exportScale || 3, settings.background).then(function (canvas) {
      return canvasToBlob(canvas).then(function (blob) {
        downloadBlob(blob, sanitizeFilename(filename || value) + '.png');
        return blob;
      });
    });
  }

  function exportPDF(value, format, settings, filename, scale) {
    var JsPDF = root.jspdf && root.jspdf.jsPDF;
    if (!JsPDF) throw new Error('jsPDF is not loaded.');
    var svg = createSVG(value, format, settings);
    return svgToCanvas(svg, scale || settings.exportScale || 3, settings.background).then(function (canvas) {
      var imgWidth = canvas.width;
      var imgHeight = canvas.height;
      // Convert pixels to points (96dpi -> 72pt), keep a 24pt margin.
      var ptW = imgWidth * 72 / 96;
      var ptH = imgHeight * 72 / 96;
      var margin = 24;
      var pdf = new JsPDF({
        orientation: ptW >= ptH ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [ptW + margin * 2, ptH + margin * 2]
      });
      pdf.setFillColor(settings && settings.background ? settings.background : '#ffffff');
      pdf.rect(0, 0, ptW + margin * 2, ptH + margin * 2, 'F');
      pdf.addImage(canvasToDataURL(canvas), 'PNG', margin, margin, ptW, ptH);
      pdf.save(sanitizeFilename(filename || value) + '.pdf');
      return pdf;
    });
  }

  /**
   * Open the barcode in a dedicated print window and trigger printing.
   */
  function printBarcode(value, format, settings, label) {
    var svg = createSVG(value, format, settings);
    var win = window.open('', '_blank');
    if (!win) {
      throw new Error('Printing was blocked. Allow pop-ups for this page.');
    }
    var doc = win.document;
    doc.open();
    doc.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' +
      escapeHTML(label || value) + '</title>');
    doc.write('<style>' +
      '@page{margin:12mm;}' +
      'body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;' +
      'font-family:monospace;}' +
      'h1{font-size:14px;margin:0 0 12px;}' +
      'svg{max-width:100%;height:auto;}' +
      '</style></head><body>');
    doc.write('<h1>' + escapeHTML(label || '') + '</h1>');
    doc.write(serializeSVG(svg).replace(/^<\?xml[^>]*\?>\s*/, ''));
    doc.write('</body></html>');
    doc.close();
    win.focus();
    var done = function () {
      try { win.print(); } catch (e) { /* ignore */ }
    };
    if (win.document.readyState === 'complete') {
      setTimeout(done, 150);
    } else {
      win.onload = function () { setTimeout(done, 150); };
    }
  }

  function escapeHTML(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Render a barcode PNG blob without downloading (used by bulk ZIP).
   */
  function renderPNGBlob(value, format, settings, scale) {
    var svg = createSVG(value, format, settings);
    return svgToCanvas(svg, scale || settings.exportScale || 3, settings.background).then(canvasToBlob);
  }

  function renderSVGString(value, format, settings) {
    return serializeSVG(createSVG(value, format, settings));
  }

  root.BarcodeRender = {
    buildOptions: buildOptions,
    createSVG: createSVG,
    renderInto: renderInto,
    serializeSVG: serializeSVG,
    svgToCanvas: svgToCanvas,
    canvasToBlob: canvasToBlob,
    canvasToDataURL: canvasToDataURL,
    sanitizeFilename: sanitizeFilename,
    downloadBlob: downloadBlob,
    exportSVG: exportSVG,
    exportPNG: exportPNG,
    exportPDF: exportPDF,
    printBarcode: printBarcode,
    renderPNGBlob: renderPNGBlob,
    renderSVGString: renderSVGString
  };
})(typeof self !== 'undefined' ? self : this);
