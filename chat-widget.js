/**
 * Edura · Chat Widget
 * ─────────────────────────────────────────────────────────────────
 * כפתור צף + overlay שמטעין את chat-engine.js בעמוד.
 * הוספה: <script src="chat-widget.js" defer></script>
 */

(function () {
  'use strict';

  const STYLES = `
    /* a11y — focus + reduced motion */
    .ew-overlay a:focus-visible, .ew-overlay button:focus-visible, .ew-overlay input:focus-visible,
    .ew-fab:focus-visible {
      outline: 2px solid #14B8A6; outline-offset: 2px;
    }
    @media (prefers-reduced-motion: reduce) {
      .ew-fab, .ew-overlay, .ew-panel { transition: none !important; }
    }
    .ew-fab {
      position: fixed; bottom: 24px; left: 24px;
      width: 56px; height: 56px;
      background: #0B2A4A;
      color: #fff;
      border-radius: 50%;
      box-shadow: 0 6px 20px rgba(11,42,74,.35);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: transform .15s ease, box-shadow .15s ease;
      z-index: 9998;
      border: none;
    }
    .ew-fab:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(11,42,74,.45);
    }
    .ew-fab svg { width: 26px; height: 26px; }
    .ew-fab-label {
      position: absolute;
      bottom: 70px;
      background: #0B2A4A; color: #fff;
      padding: 8px 14px; border-radius: 8px;
      font-size: 13px; font-weight: 600;
      white-space: nowrap;
      font-family: 'Heebo', sans-serif;
      pointer-events: none;
      opacity: 0;
      transform: translateY(4px);
      transition: opacity .2s, transform .2s;
    }
    .ew-fab:hover .ew-fab-label { opacity: 1; transform: translateY(0); }

    .ew-overlay {
      position: fixed; inset: 0;
      background: rgba(26,43,38,.45);
      z-index: 9999;
      display: flex; align-items: flex-end; justify-content: flex-start;
      opacity: 0; pointer-events: none;
      transition: opacity .2s ease;
      padding: 0;
    }
    .ew-overlay.open { opacity: 1; pointer-events: auto; }

    .ew-panel {
      width: 400px; max-width: 100vw;
      height: min(640px, calc(100vh - 24px));
      background: #F8FAFC;
      box-shadow: 0 -4px 32px rgba(0,0,0,.18);
      display: flex; flex-direction: column;
      transform: translateY(100%);
      transition: transform .25s ease;
      border-top-left-radius: 16px;
      border-top-right-radius: 16px;
      margin: 0 12px 12px;
      overflow: hidden;
      font-family: 'Heebo', 'Assistant', sans-serif;
      direction: rtl;
    }
    .ew-overlay.open .ew-panel { transform: translateY(0); }

    .ew-panel-header {
      background: #0B2A4A;
      color: #fff;
      padding: 12px 16px;
      display: flex; align-items: center; justify-content: space-between;
      flex-shrink: 0;
    }
    .ew-panel-brand {
      display: flex; flex-direction: column; gap: 2px;
    }
    .ew-panel-logo { height: 32px; width: auto; display: block; }
    .ew-panel-title-sub {
      font-size: 11px; font-weight: 500; opacity: .8;
      letter-spacing: 0.5px;
    }
    .ew-panel-footer {
      padding: 8px 14px;
      background: #fff;
      border-top: 1px solid #E2E8F0;
      display: flex; justify-content: space-between; align-items: center;
      font-size: 11px; color: #64748B;
      flex-shrink: 0;
    }
    .ew-panel-footer strong { color: #1E3A5F; font-weight: 700; }
    .ew-panel-social { display: flex; gap: 6px; }
    .ew-panel-social a {
      width: 22px; height: 22px;
      display: flex; align-items: center; justify-content: center;
      border: 1px solid #E2E8F0; border-radius: 50%;
      color: #64748B; font-size: 10px; font-weight: 700;
      text-decoration: none;
      transition: all .15s;
    }
    .ew-panel-social a:hover { color: #0B2A4A; border-color: #0B2A4A; }
    .ew-close {
      background: rgba(255,255,255,.15);
      border: none; color: #fff;
      width: 44px; height: 44px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 20px;
      display: flex; align-items: center; justify-content: center;
    }
    .ew-close:hover { background: rgba(255,255,255,.25); }

    #ew-chat-root {
      flex: 1;
      display: flex; flex-direction: column;
      background: #F8FAFC;
      overflow: hidden;
    }

    /* inherit chat-engine styles by reusing class names */
    #ew-chat-root .ec-stream {
      flex: 1; overflow-y: auto;
      padding: 16px;
      display: flex; flex-direction: column; gap: 12px;
    }
    #ew-chat-root .ec-msg { display: flex; flex-direction: column; gap: 8px; max-width: 88%; }
    #ew-chat-root .ec-msg-bot { align-self: flex-start; }
    #ew-chat-root .ec-msg-user { align-self: flex-end; align-items: flex-end; }
    #ew-chat-root .ec-bubble {
      padding: 10px 14px; border-radius: 14px;
      font-size: 14px; line-height: 1.5;
      box-shadow: 0 1px 2px rgba(26,43,38,.06);
    }
    #ew-chat-root .ec-msg-bot .ec-bubble {
      background: #CCFBF1; color: #0B2A4A;
      border-bottom-right-radius: 4px;
    }
    #ew-chat-root .ec-msg-user .ec-bubble {
      background: #0B2A4A; color: #fff;
      border-bottom-left-radius: 4px;
    }
    #ew-chat-root .ec-actions { display: flex; flex-wrap: wrap; gap: 6px; }
    #ew-chat-root .ec-action {
      min-height: 40px;
      padding: 9px 14px;
      background: #fff; border: 1.5px solid #14B8A6;
      color: #0B2A4A; border-radius: 999px;
      font-size: 13px; font-weight: 600; cursor: pointer;
    }
    #ew-chat-root .ec-action:hover:not(:disabled) {
      background: #14B8A6; color: #fff;
    }
    #ew-chat-root .ec-action:disabled { opacity: .5; cursor: not-allowed; }

    #ew-chat-root .ec-job-card {
      background: #F8FAFC; border: 1px solid #EEF2F6;
      border-radius: 12px; padding: 14px;
    }
    #ew-chat-root .ec-job-source {
      font-size: 11px; font-weight: 600; color: #14B8A6;
      text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;
    }
    #ew-chat-root .ec-job-title {
      font-size: 15px; font-weight: 700; color: #0B2A4A;
      margin-bottom: 8px; line-height: 1.4;
    }
    #ew-chat-root .ec-job-tags {
      display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;
    }
    #ew-chat-root .ec-tag {
      font-size: 10px; font-weight: 600; padding: 3px 7px;
      border-radius: 6px; background: #fff; color: #1E3A5F;
      border: 1px solid #E2E8F0;
    }
    #ew-chat-root .ec-job-snippet {
      font-size: 12px; color: #1E3A5F;
      margin-bottom: 8px; line-height: 1.5;
    }
    #ew-chat-root .ec-job-contact {
      font-size: 11px; color: #1E3A5F; margin-bottom: 3px;
    }
    #ew-chat-root .ec-job-contact a { color: #0B2A4A; font-weight: 600; text-decoration: none; }
    #ew-chat-root .ec-job-date {
      font-size: 10px; color: #64748B; font-weight: 400;
      text-transform: none; letter-spacing: 0;
    }
    #ew-chat-root .ec-job-actions { display: flex; gap: 6px; }
    #ew-chat-root .ec-job-cta {
      flex: 1; text-align: center;
      padding: 9px 14px;
      background: #D97706; color: #fff;
      border-radius: 8px;
      font-size: 13px; font-weight: 700;
      text-decoration: none;
    }
    #ew-chat-root .ec-job-cta:hover { background: #B45309; }
    #ew-chat-root .ec-job-cta-tel { background: #0B2A4A; }
    #ew-chat-root .ec-job-cta-tel:hover { background: #1E3A5F; }
    #ew-chat-root .ec-job-cta-link {
      background: #fff; color: #0B2A4A;
      border: 1.5px solid #E2E8F0;
    }
    #ew-chat-root .ec-job-cta-link:hover { background: #F8FAFC; border-color: #0B2A4A; }
    #ew-chat-root .ec-job-save {
      padding: 9px 12px;
      border: 1.5px solid #E2E8F0;
      background: #fff;
      color: #1E3A5F; border-radius: 8px;
      font-size: 13px; font-weight: 600; cursor: pointer;
    }

    #ew-chat-root .ec-status {
      padding: 8px 16px; color: #64748B; font-size: 12px;
      text-align: center; display: none;
    }
    #ew-chat-root .ec-input-row {
      display: flex; gap: 6px;
      padding: 10px 12px;
      border-top: 1px solid #E2E8F0;
      background: #fff;
      flex-shrink: 0;
    }
    #ew-chat-root .ec-input-row input {
      flex: 1; padding: 9px 12px;
      border: 1.5px solid #E2E8F0;
      border-radius: 999px;
      font-size: 14px; font-family: inherit;
      outline: none;
    }
    #ew-chat-root .ec-input-row input:focus { border-color: #14B8A6; }
    #ew-chat-root .ec-send-btn {
      padding: 9px 16px;
      background: #0B2A4A; color: #fff;
      border-radius: 999px;
      border: none; cursor: pointer;
      font-weight: 700; font-size: 14px;
    }

    @media (max-width: 480px) {
      .ew-panel {
        width: 100%; height: 100vh;
        margin: 0; border-radius: 0;
      }
      .ew-fab { bottom: 16px; left: 16px; }
    }
  `;

  const FAB_ICON = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function injectStyles() {
    if (document.getElementById('ew-styles')) return;
    const s = document.createElement('style');
    s.id = 'ew-styles';
    s.textContent = STYLES;
    document.head.appendChild(s);
  }

  function ensureChatEngine(callback) {
    if (window.EduraChat) { callback(); return; }
    const existing = document.querySelector('script[data-ew-chat-engine]');
    if (existing) { existing.addEventListener('load', callback); return; }
    const s = document.createElement('script');
    s.src = 'chat-engine.js';
    s.dataset.ewChatEngine = '1';
    s.onload = callback;
    document.head.appendChild(s);
  }

  function buildWidget() {
    injectStyles();

    const fab = document.createElement('button');
    fab.className = 'ew-fab';
    fab.type = 'button';
    fab.setAttribute('aria-label', 'פתח בוט חיפוש משרה');
    fab.innerHTML = FAB_ICON + '<span class="ew-fab-label">מצא לי משרה</span>';

    const overlay = document.createElement('div');
    overlay.className = 'ew-overlay';
    overlay.innerHTML =
      '<div class="ew-panel" role="dialog" aria-modal="true" aria-labelledby="ew-dialog-title">' +
        '<h2 id="ew-dialog-title" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">בוט חיפוש משרה אדורה</h2>' +
        '<div class="ew-panel-header">' +
          '<div class="ew-panel-brand">' +
            '<svg class="ew-panel-logo" viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
              '<text x="100" y="42" text-anchor="middle" direction="rtl" font-family="Heebo,sans-serif" font-weight="900" font-size="36" letter-spacing="-1.5" fill="#ffffff">אדור<tspan fill="#5EEAD4">ה</tspan></text>' +
              '<circle cx="74" cy="50" r="2" fill="#5EEAD4"/>' +
              '<circle cx="118" cy="50" r="2" fill="#5EEAD4"/>' +
            '</svg>' +
            '<div class="ew-panel-title-sub">בוט חיפוש משרה</div>' +
          '</div>' +
          '<button class="ew-close" type="button" aria-label="סגור">×</button>' +
        '</div>' +
        '<div id="ew-chat-root"></div>' +
        '<div class="ew-panel-footer">' +
          '<span>עוצב ע"י <strong>מיטל פלג</strong> · &copy; 2026</span>' +
          '<span class="ew-panel-social">' +
            '<a href="https://www.linkedin.com/in/meytal-peleg-839265378" target="_blank" rel="noopener" aria-label="LinkedIn">in</a>' +
            '<a href="https://www.instagram.com/learni.ai/" target="_blank" rel="noopener" aria-label="Instagram">ig</a>' +
            '<a href="https://www.facebook.com/profile.php?id=752991207892637" target="_blank" rel="noopener" aria-label="Facebook">fb</a>' +
          '</span>' +
        '</div>' +
      '</div>';

    document.body.appendChild(fab);
    document.body.appendChild(overlay);

    const chatRoot = overlay.querySelector('#ew-chat-root');
    const closeBtn = overlay.querySelector('.ew-close');
    let chatStarted = false;

    let lastFocused = null;
    function open() {
      lastFocused = document.activeElement;
      overlay.classList.add('open');
      if (!chatStarted) {
        ensureChatEngine(() => {
          const chat = new window.EduraChat(chatRoot);
          chat.start();
          chatStarted = true;
          setTimeout(() => closeBtn.focus(), 200);
        });
      } else {
        setTimeout(() => closeBtn.focus(), 200);
      }
    }
    function close() {
      overlay.classList.remove('open');
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    fab.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildWidget);
  } else {
    buildWidget();
  }
})();
