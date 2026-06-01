# Handoff ללירון — עיצוב, UX וקופי של Edura

> **למי שיש Claude Code:** תני לקלוד-קוד שלך לקרוא את המסמך הזה לפני שמתחילים. הוא מסביר איפה מותר לגעת ואיפה אסור — כדי לא לשבור את שכבת הנתונים שמיטל כבר עיבדה.

## ההקשר בקצרה

- **Edura** = לוח דרושים למשרות הוראה · 127 מורות + מאות משרות
- את ה-repo: `github.com/meytalp-dev/edura` (של מיטל; את הוזמנת כ-collaborator)
- אתר חי: `https://edura.co.il`
- **חלוקה ברורה:**
  - **מיטל** עובדת על שכבת **הנתונים** — סריקות אוטומטיות (igm/itu/Facebook/שתיל), ניקוי, מיזוג, האלגוריתם של ההתאמה
  - **את** עובדת על שכבת **המוצג** — איך זה נראה, איך זה מרגיש, איך זה כתוב, איך זה זורם
- אפס התנגשויות אם נשמור על החלוקה

## 🟢 קבצים שאת חופשייה לערוך

| קובץ | מה לעשות |
|---|---|
| כל קובצי `*.html` | מבנה, CSS, אנימציות, layout, רספונסיביות, hover, מצבים. גם תוכל להוסיף HTMLים חדשים |
| `copy.js` | **כל הקופי של האתר** — heroTicker, פתיחים, toasts, microcopy. **לא להמציא משפטים inline ב-HTML — תמיד דרך copy.js**. זה מאגר הקופי הרשמי |
| תמונות, אייקונים, SVG | להחליף, להוסיף, לעדכן |
| קבצי CSS חדשים (`styles.css`, `tokens.css`...) | רוצה לפצל החוצה מ-HTML? בבקשה |
| קבצי JS חדשים (`ui.js`, `animations.js`...) | אינטראקציות, microinteractions, transitions |
| Fonts / Icons | להוסיף לפי הצורך (Heebo/Assistant/Playpen Sans Hebrew נמצאים כבר במערכת) |
| `README.md` | תיעוד |

## 🔴 קבצים שאסור לגעת — שכבת הנתונים של מיטל

| קובץ | למה |
|---|---|
| `data/jobs.json` | המשרות הציבוריות (הרשומות המאושרות) — מיטל מנהלת ב-staging |
| `data/jobs-pending.json` | משרות בהמתנה לאישור — לא לגעת |
| `data/jobs-public.json`, `data/jobs-private.json` | פיצול ציבורי/פרטי של המשרות |
| `data/teachers.json` | 127 המורות — מקור משולש (igm + 2 קבוצות Facebook) |
| `data/teachers-pending.json` | מורות בהמתנה לאישור |
| `data/teachers-public.json`, `data/teachers-private.json` | פיצול ציבורי/פרטי של המורות |
| `data/fb-teachers.json`, `data/fb-teachers-2.json` | תוצרי סריקה אוטומטית מפייסבוק |
| `data/manual-edits.json` | תיקונים ידניים של מיטל |
| `data/scan-fresh.json` | מסמן מה חדש (לתצוגת "🆕") |
| `data/partners.json` | רשימת שותפים |
| `data/principal-positions.json`, `data/principal-positions.round1.json` | משרות ניהול ייעודיות |
| `matching.js` | אלגוריתם ההתאמה משרה-מורה — לוגיקה רגישה |
| `region-zones.js` | מיפוי אזורי גיאוגרפי לישראל |
| `jobs-scanner-apps-script.js` | סקריפט סריקה צד-שרת |
| כל קובץ `add-*.py`, `make-*.py`, `cleanup-*.py` | סקריפטי Python של pipeline הנתונים |
| `staging.html` | כלי אישור פנימי של מיטל |

## 🟡 קבצים שעדיף לא לגעת — אבל אם חייבת, דברי עם מיטל

| קובץ | למה זהירות |
|---|---|
| `chat-engine.js`, `chat-widget.js` | מנוע הצ'אט הוא לוגיקה. עיצוב הצ'אט = כן. הלוגיקה = לא |
| `analytics.js` | מעקב אנליטיקה — שינוי כאן ישבור דוחות |
| `feedback-widget.js` | ווידג'ט פידבק — מחובר ל-Apps Script |
| `chat.html` | המבנה רגיש לצ'אט. עיצוב = כן; שינוי data attributes = דברי איתי |

## 🟡 אזורים רגישים בקוד — ID-ים שאם תשני אותם, האתר נשבר

ה-JavaScript ב-Edura קורא ל-ID-ים האלה. **עיצוב = חופשי. הסרת/שינוי שם של ה-ID = שובר את האתר.**

מ-`index.html`:
```
#menu-toggle, #drawer, #drawer-overlay
#city-input, #city-suggest, #city-go
#subject-chips, #subject-query, #subject-query-clear
#level-chips, #active-filters, #clear-all
#discovery, #row-hot, #row-hot-wrap, #row-fresh-wrap, #row-all-title
#job-modal, #modal-content
#cookies-banner
```

קטגוריות וצ'יפים (אסור לשנות שמות):
```
#cat-all, #cat-math, #cat-english, #cat-hebrew, #cat-science,
#cat-special, #cat-history, #cat-mehanech, #cat-counselor,
#cat-sport, #cat-art, #cat-bible, #cat-other
```

**מה כן אפשר?**
- לשנות צבעים, פונטים, גדלים, רקעים, מרווחים, shadows, radius
- להוסיף אנימציות (CSS transitions, GSAP, וכו')
- להוסיף sections חדשים
- לשנות את ה-card design של משרה ושל מורה
- לעצב את ה-modal/drawer לגמרי מחדש (כל עוד שמרת על ה-ID-ים)
- לפצל את ה-CSS לקובץ נפרד
- לשנות את הטיפוגרפיה לחלוטין
- לכתוב את הקופי מחדש (דרך `copy.js`)

## 📝 על הקופי — חשוב

ב-Edura יש **מאגר קופי רשמי** ב-`copy.js`. הכלל: **אסור להמציא משפטים inline ב-HTML**. אם רוצה להוסיף או לשנות טקסט, זה הולך דרך `copy.js`.

מה יש שם:
- `heroTicker` — 15+ משפטים שעוברים בלולאה ב-hero
- `openings` — פתיחות לדפים השונים
- `toasts` — הודעות פעולה
- microcopy לכפתורים, placeholder-ים, מצבי-ריק וכו'

זה נותן לנו: שינוי קופי בנקודה אחת ↔ עדכון בכל האתר.

## 🧪 איך לבחון מקומית

```bash
# בתוך תיקיית הפרויקט:
python -m http.server 8000
# או:
npx serve .

# פתחי דפדפן: http://localhost:8000
```

ככה תראי שינויים בזמן אמת + תוכלי לוודא שה-JavaScript עובד.

## 🚀 איך לדחוף שינויים

```bash
# יצירת branch חדש לעבודה (מומלץ — לא לדחוף ישר ל-main):
git checkout -b design/<תיאור-קצר>

# עבודה רגילה:
git add -A
git commit -m "design: <תיאור קצר של השינוי>"
git push -u origin design/<תיאור-קצר>

# פתחי PR ב-github.com/meytalp-dev/edura/pulls
# מיטל תעבור ותאשר, אז זה ממוזג ל-main
# GitHub Pages מתעדכן אוטומטית תוך 1-2 דקות
```

**למה PR ולא push ישר ל-main?**
- main = האתר החי ב-edura.co.il. כל push = פריסה מיידית.
- PR נותן רגע לבדוק שלא נשבר משהו לפני שזה עולה לאוויר.
- אם את 100% בטוחה בשינוי קטן (תיקון רווח, החלפת צבע), אפשר גם ישיר ל-main.

## 🤝 איך זרימת העבודה איתנו עובדת

1. **את עובדת ב-branch שלך** → דוחפת
2. **פותחת PR** → מיטל רואה את ה-preview
3. **מיטל מאשרת + ממזגת** → הקישור החי `edura.co.il` מתעדכן

**אם רוצה לראות את הנתונים האחרונים של מיטל (אחרי סריקה חדשה):**
- `git pull origin main` לפני שמתחילה לעבוד — תקבלי את הכי עדכני
- אם את לא נוגעת ב-`data/` או ב-`matching.js` — אין סיכוי לקונפליקט

## ❓ שאלות נפוצות

**ש: יכולה לשנות את ה-CSS לחלוטין?**
ת: כן — את חופשייה. רק תוודאי שה-ID-ים הקריטיים נשארו.

**ש: יכולה להחליף את כל ה-HTML של דף שלם (למשל index)?**
ת: כן, כל עוד שמרת על ה-ID-ים הקריטיים + שטעינת `copy.js` ושאר ה-`<script>` נשמרה.

**ש: יכולה לבנות את האתר מחדש ב-React/Vue/Svelte?**
ת: זה שינוי גדול. דברי עם מיטל קודם — צריך לוודא ש-`data/*.json` עדיין נטענים נכון ושה-Apps Script של staging לא נשבר.

**ש: יכולה להוסיף דפים חדשים (לדוגמה דף לעצמאיות, דף לבתי ספר)?**
ת: כן, מעולה. רק תקראי לזה בשם ברור (`for-self-employed.html`, `for-schools.html`) ותוסיפי קישור מ-`index.html`.

**ש: מה אם אני שוברת משהו בטעות?**
ת: 3 שכבות הגנה:
1. **לוקלי**: בודקת מקומית לפני push
2. **PR**: מיטל רואה לפני שזה ממוזג
3. **Git**: תמיד אפשר `git revert` — כלום לא אבוד

**ש: אם יש לי רעיון לשנות את הלוגיקה (matching, staging)?**
ת: דברי עם מיטל. אל תיגעי ישירות.

**ש: יש מקום שאני יכולה לראות איך האתר עובד היום, מקצה לקצה?**
ת: כן, `SETUP.md` ו-`spec.md` בריפו. גם פשוט להסתובב ב-`edura.co.il` ולחקור.

---

**💜 ברוכה הבאה ל-Edura!** את הולכת להעלות את האתר ברמה ויזואלית. הנתונים מוכנים — הגיע הזמן שיראו מצוין.
