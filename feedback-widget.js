/**
 * Edura · Feedback / WhatsApp Widget
 * ─────────────────────────────────────────────────────────────────
 * כפתור צף בפינה הימנית-תחתונה. לחיצה פותחת WhatsApp למיטל.
 * הוספה: <script src="feedback-widget.js" defer></script>
 *
 * לא מתנגש עם chat-widget.js (שיושב בפינה השמאלית).
 */

(function () {
  'use strict';

  var PHONE = '972536256653';
  var TEXT = 'היי מיטל, אני באתר אדורה ויש לי בקשה / נתקלתי בבעיה: ';
  var HREF = 'https://api.whatsapp.com/send?phone=' + PHONE + '&text=' + encodeURIComponent(TEXT);

  var STYLES = '' +
    '.efb-fab{' +
    'position:fixed;top:84px;right:24px;' +
    'display:flex;align-items:center;gap:10px;' +
    'background:#25D366;color:#fff;' +
    'padding:12px 18px 12px 14px;' +
    'border-radius:999px;' +
    'box-shadow:0 6px 20px rgba(37,211,102,.35),0 2px 6px rgba(0,0,0,.08);' +
    'font-family:"Heebo","Assistant",sans-serif;' +
    'font-weight:600;font-size:14px;line-height:1;' +
    'text-decoration:none;cursor:pointer;' +
    'transition:transform .15s ease,box-shadow .15s ease;' +
    'z-index:9997;direction:rtl;' +
    '}' +
    '.efb-fab:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(37,211,102,.45),0 4px 8px rgba(0,0,0,.1);}' +
    '.efb-fab svg{width:22px;height:22px;flex-shrink:0;}' +
    '.efb-fab-label{white-space:nowrap;}' +
    '@media (max-width:560px){' +
    '.efb-fab{padding:14px;border-radius:50%;width:56px;height:56px;justify-content:center;}' +
    '.efb-fab .efb-fab-label{display:none;}' +
    '}';

  var ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 2.1.55 4.15 1.6 5.96L2 22l4.25-1.71c1.74.95 3.71 1.45 5.79 1.45 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.13c-1.83 0-3.62-.49-5.18-1.42l-.37-.22-3.06 1.23 1.25-2.99-.24-.39c-1.02-1.62-1.55-3.49-1.55-5.43 0-5.62 4.57-10.18 10.18-10.18 5.62 0 10.18 4.57 10.18 10.18 0 5.62-4.57 10.18-10.18 10.18-.01 0-.03 0-.04 0z"/>' +
    '<path d="M17.47 14.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.21 5.09 4.5.71.31 1.27.49 1.7.63.71.23 1.36.19 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35z"/>' +
    '</svg>';

  function init() {
    if (document.querySelector('.efb-fab')) return;

    var style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);

    var a = document.createElement('a');
    a.className = 'efb-fab';
    a.href = HREF;
    a.target = '_blank';
    a.rel = 'noopener';
    a.setAttribute('aria-label', 'נתקלתם בבעיה? בקשה? כתבו לי בוואטסאפ');
    a.innerHTML = ICON + '<span class="efb-fab-label">נתקלתם בבעיה? כתבו לי</span>';
    document.body.appendChild(a);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
