// Edura Analytics — JSONP tracker → Google Apps Script → Google Sheet
// Same pattern as docs/passover-cards.
// To activate: paste your Apps Script Web App URL into ANALYTICS_URL below.

(function (root) {
  'use strict';

  const ANALYTICS_URL = 'https://script.google.com/macros/s/AKfycbyHpWdYzpi3FGJS9dUgYndDEYXNBorW5CrJEbkBvIqDda2fTjdl-8Jdmnr1E-yAprLI/exec';

  const _start = Date.now();
  const _device = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
  const _page = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
  const _session = (() => {
    try {
      let s = sessionStorage.getItem('edura_session');
      if (!s) {
        s = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        sessionStorage.setItem('edura_session', s);
      }
      return s;
    } catch (e) {
      return 'nosession';
    }
  })();

  function isConfigured() {
    return ANALYTICS_URL && ANALYTICS_URL !== 'PASTE_YOUR_APPS_SCRIPT_URL_HERE';
  }

  function track(event, details) {
    if (!isConfigured()) return;
    try {
      const url = ANALYTICS_URL +
        '?callback=_eduraTrackCb' +
        '&event=' + encodeURIComponent(event) +
        '&details=' + encodeURIComponent(details || '') +
        '&page=' + encodeURIComponent(_page) +
        '&device=' + _device +
        '&session=' + _session +
        '&duration=' + Math.round((Date.now() - _start) / 1000) +
        '&referrer=' + encodeURIComponent(document.referrer || 'direct');
      const s = document.createElement('script');
      s.src = url;
      s.onload = () => s.remove();
      s.onerror = () => s.remove();
      document.head.appendChild(s);
    } catch (e) { /* silent */ }
  }

  // sendBeacon for end-of-session (more reliable than JSONP on unload)
  function trackBeacon(event, details) {
    if (!isConfigured() || !navigator.sendBeacon) return;
    try {
      const url = ANALYTICS_URL +
        '?callback=_eduraTrackCb' +
        '&event=' + encodeURIComponent(event) +
        '&details=' + encodeURIComponent(details || '') +
        '&page=' + encodeURIComponent(_page) +
        '&device=' + _device +
        '&session=' + _session +
        '&duration=' + Math.round((Date.now() - _start) / 1000) +
        '&referrer=' + encodeURIComponent(document.referrer || 'direct');
      navigator.sendBeacon(url);
    } catch (e) { /* silent */ }
  }

  root._eduraTrackCb = function () {};

  // Auto: page_view immediately; session_end on unload
  track('page_view', document.title || _page);
  window.addEventListener('beforeunload', () => trackBeacon('session_end', _page));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') trackBeacon('visibility_hidden', _page);
  });

  root.EduraAnalytics = { track, isConfigured };
})(typeof window !== 'undefined' ? window : globalThis);
