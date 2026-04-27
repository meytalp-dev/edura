/**
 * Edura · Copy Bank
 * ─────────────────────────────────────────────────────────────────
 * מאגר מרכזי של משפטי קריצה ברוטציה לכל האתר והצ'אט.
 * נטען לפני chat-engine.js וה-HTML של הדפים — אם נטען, משתמשים
 * ב-window.EduraCopy. אחרת chat-engine.js נופל לערכים שמוגדרים אצלו.
 *
 * שימוש:
 *   document.querySelector('.hero-sub').textContent = EduraCopy.pick(EduraCopy.heroSubs);
 *   showToast(EduraCopy.pickToast('save_added'));
 */
(function () {
  'use strict';

  const C = {};

  // ─── 5 מאגרי הצ'אט המקוריים (מקור אמת — היה ב-chat-engine.js) ───
  C.openings = [
    'שלום! 14 קבוצות פייסבוק, 6 לוחות, ושיחות טלפון לחברה ש"אולי מכירה מישהי" — תרגיעו, הגעתם הביתה.',
    'שלום! אנחנו יודעים. חיפשתם בכל מקום, התעייפתם, וכמעט הסתפקתם בפחות. בואו נתחיל מחדש.',
    'שלום! עוד פוסט "מחפש/ת משרה" בקבוצה? עוד "דרוש/ה מורה דחוף"? נשמתם עמוק — הגעתם למקום הנכון.',
    'שלום! החיפוש הזה כבר חודשיים, נכון? בואו נצמצם את זה ל-30 שניות.',
    'שלום! עברתם 3 לוחות, 5 קבוצות, ויועצת השכלה אחת — סוף סוף הגעתם למקום שנותן תשובה.',
    'שלום! אם הגעתם עד אליי — אתם כבר עברתם את החלק הקשה. עכשיו הקלות.'
  ];

  C.loading = [
    'סורקים משרות מהר יותר ממורה תורנית במסדרון',
    'מוצאים לכם משרה לפני שצלצל הצלצול',
    'מחפשים בית ספר עם פסטרמה טרייה במקרר',
    'בודקים מי מציע פרטניות בלי מילוי מקום מוסווה',
    'מאתרים משרות עם תקשורת בוואטסאפ עד 21:00',
    'מחפשים מנהל שעונה לטלפון לפני הצלצול',
    'מאתרים משרות שבהן המיזוג באמת עובד'
  ];

  C.teacherLoading = [
    'מאתרים מורים שכבר עברו את שלב המחברות הראשון',
    'בוחרים מורים שלא יברחו אחרי חודש',
    'סורקים פרופילים בלי שאלות מיותרות',
    'מאתרים מורים שמכירים את ה"מיצב" וצוחקים על זה'
  ];

  C.tenderLoading = [
    'מאתרים מכרזי ניהול בלי 80 עמודי טופס',
    'בודקים אילו בתי ספר באמת מחפשים מנהל/ת',
    'סורקים מכרזים פתוחים — בלי תוכניות חמש שנתיות'
  ];

  C.parsing = [
    'קוראים את מה שכתבתם בעיון של בודק בגרויות',
    'מנתחים את הבקשה בלי עט אדום',
    'מחפשים את המילים החשובות, לא את הניסוח',
    'מבינים את הצורך, לא רק את הכותרת'
  ];

  // ─── חדשים: לדפי האתר ───

  // כותרות משנה ל-hero ב-index (רוטציה ב-page load)
  C.heroSubs = [
    'הגעתם ללוח המשרות הגדול בישראל למשרות הוראה — מאות משרות חמות מכל הזרמים, המגזרים והאזורים, מתעדכן יומי. הרשמה חינם.',
    '14 קבוצות פייסבוק, 6 לוחות, ויועצת אחת ש"אולי מכירה מישהי" — נמאס לכם? גם לנו. אסףנו את הכל למקום אחד. הרשמה חינם.',
    'משרות הוראה אמיתיות, מתעדכנות כל יום, בלי ספאם ובלי דמי תיווך. כי החיפוש הזה כבר חודשיים, נכון?',
    'מאות משרות מכל הזרמים והמגזרים, במקום אחד, בלי לחפור ב-20 קבוצות וואטסאפ. הרשמה חינם, התראות יומיות.'
  ];

  // משפטים קצרים ברוטציה אוטומטית מתחת לכותרת ("רצים" עם fade)
  C.heroTicker = [
    '14 קבוצות פייסבוק. 6 לוחות. יועצת ש"אולי מכירה". סוף.',
    'משרה אחת טובה שווה 200 פוסטים בקבוצה.',
    'הצלצול צלצל. גם החיפוש שלכם צריך להיגמר.',
    'כי "דרוש מורה דחוף" זה לא תיאור תפקיד.',
    'בלי ספאם, בלי דמי תיווך, בלי "תשלחי קו״ח אולי יש משהו".',
    'מתחילים עם "מחפש/ת", מסיימים עם "מצאתי".',
    'המשרה הבאה שלכם לא מסתתרת בקבוצת וואטסאפ.',
    'פעם בחודש להוריד פוסט. פעם ביום לקבל התראה.',
    'ברירות אמיתיות, לא רק "משרה אחת בעיר רחוקה".',
    'כי "גמיש בשעות" זה לא תמיד מה שזה נשמע.',
    'תפקידים אמיתיים — לא "רכזת + מחנכת + תורנית הסעות".',
    'הקיץ קצר. החיפוש לא צריך להיות.',
    'כי גם בחינוך מותר לדעת מה השכר לפני הראיון.',
    'אם הגעתם עד כאן — חצי הדרך כבר נעשתה.'
  ];

  // ─── מארקי "מצחיקים" לדפי נחיתה — תצפיות חיי בית ספר ───
  C.funnyMarquee = [
    'בית ספר עם טוסטר שעובד באמת',
    'פסטרמה טרייה במקרר חדר מורים',
    'מנהל שלא שולח מייל ב-23:47',
    'חדר מורים שבו הקפה לא נגמר ב-9:30',
    'מקרר בלי שלט "של נורית — אל תיגעו!"',
    'פרויקטור שלא דורש 7 דקות התנעה',
    'מערכת שעות שלא מתחלפת ביום ראשון ב-7:54',
    'מנהלת שזוכרת איך קוראים לבן שלך',
    'ראיון שמסתיים ב-"מתי את יכולה להתחיל"',
    'ועדת שיבוץ שלא מתחילה רק בנובמבר',
    'מילוי מקום שלא תופס אותך באמצע הקפה',
    'טיול שנתי שלא תופס אותך מורה תורנית',
    'מיזוג שעובד גם ביוני',
    'הורה שעונה ב-WhatsApp לפני 22:00'
  ];

  // placeholders לתיבת חיפוש (רוטציה)
  C.searchPlaceholders = [
    'נסו: "אנגלית רעננה חצי משרה", "רכזת שכבה ירושלים"',
    'נסו: "מחנכת ז\' מרכז", "מורה למתמטיקה תיכון דרום"',
    'נסו: "יועצת חינוכית חצי משרה צפון", "רכז שכבה ירושלים"',
    'נסו: "מורה לחינוך מיוחד פתח תקווה", "מנהלת חטיבת ביניים"'
  ];

  // Empty states לפי הקשר
  C.emptyJobsFilter = [
    { h: 'אין משרות שעונות לסינון הזה', p: 'נסו לרחב — לפעמים המשרה הכי טובה היא בעיר השכנה.' },
    { h: 'בלשון המקצוע: "אין התאמה כרגע"', p: 'נסו להוריד פילטר אחד או שניים — ברוב המקרים זה פותר.' },
    { h: 'הסינון הזה הדוק מאוד', p: 'גם אנחנו הופתענו. ננסה משהו פתוח יותר?' },
    { h: 'לא מצאנו כרגע — אבל זה לא אומר שאין', p: 'הרשמו להתראה, ונשלח ברגע שתיפתח משרה תואמת.' }
  ];

  C.emptyJobsError = [
    { h: 'משהו תקוע אצלנו לרגע', p: 'בלי לחץ — תרעננו בעוד שנייה ונחזור לדרך.' },
    { h: 'התקשורת בין השרתים נפלה', p: 'בערך כמו אינטרנט בכיתה ביום ראשון. רענון יעזור.' }
  ];

  C.emptyTeachersFilter = [
    { h: 'אין מורים שעונים לסינון הזה', p: 'נסו אזור או מקצוע אחר — המאגר מתעדכן כל יום.' },
    { h: 'הסינון הזה הדוק מדי', p: 'תורידו פילטר אחד וננסה שוב.' },
    { h: 'לא מצאנו מורים לקריטריונים שלכם', p: 'תרגיעו — נמצא. נסו לרחב את החיפוש.' }
  ];

  C.emptyTeachersError = [
    { h: 'משהו תקוע אצלנו לרגע', p: 'תרעננו בעוד רגע. אנחנו לא הולכים לאף מקום.' }
  ];

  C.emptyTenders = [
    { h: 'אין מכרזים פתוחים שעונים לסינון', p: 'מכרזי ניהול מתעדכנים שבועית. הרשמו לסבב הבא בכפתור למעלה.' },
    { h: 'הסינון לא החזיר תוצאות', p: 'נסו מילת מפתח אחרת או הסירו פילטר אחד.' },
    { h: 'אין מכרזים מתאימים כרגע', p: 'זה שקט — בעיקר בקיץ. הרשמו והתראה תגיע ברגע שייפתח חדש.' }
  ];

  C.emptyTendersError = [
    { h: 'בעיה זמנית בטעינת המכרזים', p: 'תרעננו בעוד רגע — לא צריך לחפש את הקובץ ידנית.' }
  ];

  C.emptySaved = [
    { h: 'עדיין לא שמרתם משרות', p: 'בעמוד הבית — לחיצה על הלב שומרת את המשרה הנה לצפייה מאוחר יותר.' },
    { h: 'הרשימה ריקה', p: 'תחזרו לדף הבית, תשמרו משרות מעניינות בלחיצה על הלב — והן יחכו פה.' }
  ];

  // Toasts לפי אירוע (success-cases בלבד; שגיאות validation נשארות בהירות)
  C.toasts = {
    save_added: [
      'נשמר. בלי לפספס את הצלצול.',
      'נשמר ✓ — מחכה לכם ב"המשרות שלי".',
      'שמרנו. הפעם זה לא ייעלם בתחתית התיבה.'
    ],
    save_removed: [
      'הוסר מהרשימה.',
      'מחקנו. רשימה נקייה, ראש נקי.'
    ],
    apply_sent: [
      'נשלח. עברתם את החלק הקשה.',
      'הקו"ח בדרך — לא לתיבה של אף אחד, אלינו.',
      'קיבלנו ✓ הפעם המייל לא ייעלם.'
    ],
    post_sent: [
      'קיבלנו את המשרה. נעלה אותה ב-24 שעות.',
      'נשלח ✓ — עוד יום, ויש לכם מורות שפונות.',
      'התקבל. נעלה תוך 24 שעות, בלי לטרטר אתכם.'
    ],
    alert_subscribed: [
      'נרשמתם להתראות. 06:15 — לפני הקפה.',
      'מעולה ✓ ההתראה הראשונה תגיע מחר בבוקר.',
      'רשום. בלי ספאם, בלי "הצעות מיוחדות" — רק משרות חדשות.'
    ],
    principal_subscribed: [
      'רשום. נעדכן ברגע שייפתח סבב מכרזי ניהול חדש.',
      'נרשמתם ✓ סבב הבא — אתם הראשונים לדעת.'
    ],
    teacher_added: [
      'פרטיך הוכנו לשליחה. נוסיף אותך למאגר ב-24 שעות.',
      'נשלח ✓ עוד יום אחד, ומנהלים יראו אותך.'
    ],
    welcome: [
      'ברוכים הבאים. הגעתם הביתה.',
      'בואו נתחיל. הצעד הראשון מאחוריכם.'
    ]
  };

  // הודעות שגיאה כלליות (network/server)
  C.networkError = [
    'בעיה זמנית בחיבור. נסו שוב בעוד רגע.',
    'הקשר נפל. כמו שיחה במסדרון ביום ראשון. רעננו — זה יעבוד.'
  ];

  // 404
  C.fourOhFour = [
    { h: 'הדף הזה ברח כמו ממלא מקום ביום שני בבוקר.', p: 'בואו נחזיר אתכם הביתה.' },
    { h: 'הקישור הזה כבר לא ב"מיצב".', p: 'אבל יש לנו מאות משרות שכן. דף הבית ←' },
    { h: 'התלמיד הזה לא הגיע לשיעור.', p: 'אבל יש לנו תלמידים אחרים — חזרו לדף הבית.' }
  ];

  // ─── עזרי בחירה ───
  C.pick = function (arr) {
    if (!Array.isArray(arr) || !arr.length) return '';
    return arr[Math.floor(Math.random() * arr.length)];
  };

  C.pickToast = function (key) {
    const arr = C.toasts[key];
    return C.pick(arr);
  };

  C.pickEmpty = function (arr) {
    const e = C.pick(arr);
    if (!e) return '';
    return '<div class="empty"><h3>' + e.h + '</h3><p>' + e.p + '</p></div>';
  };

  // ─── Marquee — שרשרת נעה של קריצות הבוט ───
  // מציבה רצועה דקה לפני אלמנט יעד (ברירת מחדל: <footer>).
  // המשפטים נבחרים אקראית מהבנקים, מסתובבים אינסוף, נעצרים ב-hover,
  // ומכבדים prefers-reduced-motion (אז סטטי, בלי תנועה).
  C.mountMarquee = function (opts) {
    opts = opts || {};
    const beforeSelector = opts.before || 'footer';
    const target = document.querySelector(beforeSelector);
    if (!target) return;
    if (document.querySelector('.edura-marquee')) return; // כבר הותקן

    // 8 משפטים אקראיים מ-3 בנקים מגוונים (לא רק טעינה)
    const pool = []
      .concat(C.loading.map(s => ({ s, k: 'loading' })))
      .concat(C.teacherLoading.map(s => ({ s, k: 'teacher' })))
      .concat(C.parsing.map(s => ({ s, k: 'parsing' })));

    // shuffle ובחירת 8
    const shuffled = pool.slice().sort(() => Math.random() - 0.5).slice(0, 8);

    // הזרקת CSS פעם אחת
    if (!document.getElementById('edura-marquee-style')) {
      const style = document.createElement('style');
      style.id = 'edura-marquee-style';
      style.textContent = `
        .edura-marquee {
          background: linear-gradient(90deg, #F0FDFA 0%, #FEF3C7 50%, #FDF2F8 100%);
          border-top: 1px solid #E2E8F0;
          border-bottom: 1px solid #E2E8F0;
          overflow: hidden;
          padding: 10px 0;
          font-family: 'Heebo', 'Assistant', sans-serif;
          font-size: 13.5px;
          font-weight: 500;
          color: #475569;
          position: relative;
          direction: ltr;
        }
        .edura-marquee::before, .edura-marquee::after {
          content: '';
          position: absolute;
          top: 0; bottom: 0;
          width: 60px;
          z-index: 2;
          pointer-events: none;
        }
        .edura-marquee::before { left: 0; background: linear-gradient(90deg, #F0FDFA, transparent); }
        .edura-marquee::after  { right: 0; background: linear-gradient(270deg, #FDF2F8, transparent); }
        .edura-marquee-track {
          display: inline-flex;
          white-space: nowrap;
          animation: edura-marquee-roll 55s linear infinite;
          will-change: transform;
        }
        .edura-marquee:hover .edura-marquee-track { animation-play-state: paused; }
        .edura-marquee-item {
          display: inline-flex;
          align-items: center;
          padding: 0 18px;
          direction: rtl;
        }
        .edura-marquee-dot {
          display: inline-block;
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #14B8A6;
          margin-inline-start: 18px;
          opacity: 0.55;
          flex-shrink: 0;
        }
        @keyframes edura-marquee-roll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .edura-marquee-track { animation: none; }
          .edura-marquee { padding: 12px 16px; text-align: center; white-space: normal; }
          .edura-marquee-track { display: block; white-space: normal; }
          .edura-marquee-item:not(:first-child) { display: none; }
          .edura-marquee-dot { display: none; }
        }
        @media (max-width: 600px) {
          .edura-marquee { font-size: 12.5px; padding: 8px 0; }
          .edura-marquee-item { padding: 0 14px; }
        }
      `;
      document.head.appendChild(style);
    }

    // בנייה — duplicate items כדי שהלולאה תהיה רציפה
    const marquee = document.createElement('div');
    marquee.className = 'edura-marquee';
    marquee.setAttribute('aria-hidden', 'true');
    const track = document.createElement('div');
    track.className = 'edura-marquee-track';
    const items = shuffled.map(o =>
      '<span class="edura-marquee-item">' + o.s +
      '<span class="edura-marquee-dot"></span></span>'
    ).join('');
    track.innerHTML = items + items; // כפול לרצף חלק
    marquee.appendChild(track);

    target.parentNode.insertBefore(marquee, target);
  };

  window.EduraCopy = C;

  // mount אוטומטי אם הדף סימן data-edura-marquee על ה-body
  document.addEventListener('DOMContentLoaded', () => {
    if (document.body && document.body.dataset.eduraMarquee === 'on') {
      C.mountMarquee();
    }
  });
})();
