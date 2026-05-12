---
name: אדורה — מאגר הקופי הרשמי
description: copy.js בריפו edura. מאגרי משפטים שנונים שמיטל בנתה עם סוכן קופי - openings, loading, heroTicker, toasts ועוד
type: reference
originSessionId: 3679c05c-fa29-4556-9031-563966d83842
---
מאגר הקופי הרשמי של אדורה: `Downloads/edura/copy.js`. נטען לכל דפי האתר כ-`window.EduraCopy`.

**מאגרים זמינים:**
- `EduraCopy.openings` — פתיחות צ'אט (6 משפטים)
- `EduraCopy.loading` — טעינות כלליות (7)
- `EduraCopy.teacherLoading` — טעינות מורים (4)
- `EduraCopy.tenderLoading` — טעינות מכרזים (3)
- `EduraCopy.parsing` — ניתוח טקסט (4)
- `EduraCopy.heroSubs` — כותרות משנה Hero
- `EduraCopy.heroTicker` — **15 משפטים שנונים למארקי/ticker** ("14 קבוצות פייסבוק. 6 לוחות. יועצת ש'אולי מכירה'. סוף.")
- `EduraCopy.searchPlaceholders` — placeholders לחיפוש
- `EduraCopy.empty*` — מצבי ריקות
- `EduraCopy.toasts` — הודעות מערכת
- `EduraCopy.networkError`, `fourOhFour`

**API:**
- `EduraCopy.pick(arr)` — אקראי
- `EduraCopy.pickToast(key)` — הודעת toast לפי מפתח

**How to apply:**
- כשמיטל מבקשת משפטים שנונים/מצחיקים בכל דף של אדורה — לטעון `<script src="copy.js"></script>` ולהשתמש במאגרים, לא להמציא חדשים
- אסור להמציא משפטים מקבילים — תמיד ללכת למאגר הרשמי
- אם צריך משפט לפיצ'ר חדש — להוסיף לקטגוריה הנכונה ב-copy.js, לא לכתוב inline
- ה-copy.js נמצא ב-`Downloads/edura/copy.js` (ריפו edura, לא ort-presentation-builder)
