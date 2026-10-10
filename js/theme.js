/*
 * theme.js
 * Light/dark theme handling with localStorage persistence.
 * Exposes window.BarcodeTheme.
 */
(function (root) {
  'use strict';

  var STORAGE_KEY = 'barcode-theme';
  var media = root.matchMedia ? root.matchMedia('(prefers-color-scheme: dark)') : null;

  function stored() {
    try { return root.localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function preferred() {
    if (media && media.matches) return 'dark';
    return 'light';
  }

  function apply(theme) {
    var resolved = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', resolved);
    try { root.localStorage.setItem(STORAGE_KEY, resolved); } catch (e) { /* ignore */ }
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: resolved } }));
    return resolved;
  }

  function current() {
    var attr = document.documentElement.getAttribute('data-theme');
    return attr === 'dark' ? 'dark' : 'light';
  }

  function toggle() {
    return apply(current() === 'dark' ? 'light' : 'dark');
  }

  function init() {
    var theme = stored() || preferred();
    document.documentElement.setAttribute('data-theme', theme);
    if (media) {
      var handler = function (e) {
        if (!stored()) apply(e.matches ? 'dark' : 'light');
      };
      if (media.addEventListener) media.addEventListener('change', handler);
      else if (media.addListener) media.addListener(handler);
    }
    return theme;
  }

  root.BarcodeTheme = { init: init, apply: apply, toggle: toggle, current: current };
})(typeof self !== 'undefined' ? self : this);
