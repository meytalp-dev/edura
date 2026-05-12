# Edura · מודל אבטחת מידע

> מסמך זה מסביר את המודל שמיושם כדי שמידע רגיש (שם בית הספר, איש קשר, טלפון, מייל) לא ייחשף לציבור. אם אתה עורך/ת את הקוד — חובה לקרוא לפני כל שינוי שמושך מ-`jobs.json` או מ-`teachers.json`.

---

## הגדרה — מה רגיש ומה לא

### שדות **ציבוריים** (מותרים באתר ובחיפוש)
- `id`
- `source` (itu / igm / shatil / fb)
- `city`, `region`, `sub_area`
- `subject`, `role`
- `level`, `sector`, `scope`
- `date_iso`

### שדות **רגישים** (אסור שיעלו ל-GitHub Pages או יישלחו ל-browser)
- `school` (שם בית הספר)
- `title`, `snippet`, `description` (מכילים שם בית ספר)
- `contact_name`
- `email`, `phone`
- `url` (קישור למקור — חושף את בית הספר)

---

## ארכיטקטורה — איך זה מיושם

### 1. שני קבצי דאטה נפרדים

| קובץ | תוכן | מתפרסם? |
|------|------|---------|
| `data/jobs.json` | כל השדות (מקור מלא) | ❌ **gitignored** — לא נדחף ל-GitHub |
| `data/jobs-pending.json` | רשומות חדשות שטרם אושרו (מלא) | ❌ **gitignored** |
| `data/jobs-private.json` | גיבוי מקומי מלא | ❌ **gitignored** |
| `data/jobs-public.json` | רק 11 שדות ציבוריים | ✅ **נדחף** ל-GitHub Pages |

> כל סקירה חדשה (`jobs-scanner-apps-script.js`) שמייצרת `jobs.json` חייבת לרוץ אחריה: `python data/split-jobs-public.py` כדי לעדכן את `jobs-public.json`.

### 2. אתר ציבורי (`index.html`)

- טוען **רק** את `data/jobs-public.json` (`fetch('data/jobs-public.json')`)
- מציג רק את 11 השדות הציבוריים
- אין כפתורי "טלפון" / "מייל" / "WhatsApp"
- כפתור יחיד: **"אני מעוניינ/ת"** → פותח טופס

### 3. טופס "אני מעוניינ/ת"

- שדות: שם, מייל, טלפון, הערה
- שולח POST ל-Apps Script (`SUBMISSIONS_URL`) עם action=`submit_application`
- ה-payload מכיל **רק** פרטי המתעניינ/ת + `jobId` — לא `schoolEmail`, לא `school`
- ה-Apps Script מתעלם בכוונה מ-`schoolEmail` גם אם הלקוח ינסה לשלוח (תקיפה)

### 4. Apps Script — `submissions-apps-script.gs`

#### `submit_application` (action=`submit_application`):
1. שמירת הפנייה ב-Sheet `applications` עם `status=pending-forward`
2. שליחת **מייל לאדורה בלבד** (`ADMIN_EMAIL`) עם:
   - פרטי המתעניינ/ת
   - `jobId` מודגש
   - **קישור חתום** ל-`admin/forward-interest.html?ref=REFID&token=TOKEN`
3. אישור אוטומטי למתעניינ/ת במייל

#### `forward_application` (action=`forward_application`, POST):
- מקבל: `refId`, `token`, `schoolEmail`, `schoolName`, `adminNote`
- מאמת את `token` (חתימת `signToken_('interest', refId)` עם `APPROVE_SECRET`)
- קורא את הפנייה מהגיליון ושולח אותה ל-`schoolEmail` + CC ל-`ADMIN_EMAIL`
- מעדכן את הסטטוס ל-`forwarded`

#### `get_interest` (action=`get_interest`, GET):
- מקבל: `ref`, `token`
- מחזיר את הפנייה ה-pending (לטעינה ב-admin page)

### 5. אדמין — `admin/forward-interest.html`

מיטל נכנסת לקישור מהמייל. העמוד:
1. טוען את הפנייה דרך `get_interest`
2. מציג את הפרטים + תיבת מייל בית הספר
3. מיטל מחפשת ב-`jobs-private.json` (מקומי, אצלה) לפי `job_id` ומוצאת את כתובת בית הספר
4. מכניסה לתיבה ולוחצת "שלחי לבית הספר"
5. ה-`forward_application` שולח את המייל המקצועי לבית הספר עם CC לאדורה

---

## חתימת טוקנים

```javascript
function signToken_(type, refId) {
  const raw = type + '|' + refId + '|' + APPROVE_SECRET;
  // SHA-256 → 24 hex chars
}
```

- `APPROVE_SECRET` נשמר בקוד ה-Apps Script (לא נחשף ל-frontend)
- שני סוגי חתימות:
  - `signToken_('interest', refId)` — לאישור פניות
  - `signToken_('job', refId)` / `signToken_('teacher', refId)` — לאישור פרסומים שמנהלים/מורות שלחו

---

## מה נשאר לעשות (todo עתידי)

1. **`data/teachers.json` עדיין נדחף ל-Git עם פרטי מורים מלאים.** צריך לחזור על תהליך הפיצול גם כאן:
   - יצירת `data/teachers-public.json` (רק שם פרטי, מקצוע, אזור, עיר, scope, notes)
   - הסתרת מייל/טלפון של מורות מהאתר
   - הוספת טופס "אני מעוניינ/ת לפגוש את המורה" עם flow זהה

2. **`teachers.html` עדיין טוען `teachers.json` ומציג email/phone.** צריך לעדכן.

3. **`saved.html`** טוען פרטי קשר מ-localStorage. כי שינינו את הסכמה — שמורים חדשים לא יכילו מייל/טלפון. אבל שמורים ישנים אצל משתמשים עדיין שם.

4. **תיעוד למיטל** — Quick Start איך להפעיל את ה-flow אחרי כל סריקה: `python data/split-jobs-public.py && git add data/jobs-public.json && git commit -m "..." && git push`.

5. **בדיקות אוטומטיות** — pre-commit hook שמונע push של `jobs.json` בטעות (גם אם `.gitignore` יוסר בטעות).

---

## בדיקה ידנית של אבטחה

קלון את הריפו וטען את `data/jobs-public.json` בדפדפן. אם רואה אחד מהשדות הבאים — **כשל**:
`school`, `contact_name`, `email`, `phone`, `url`, `description`, `snippet`, `title`.

```bash
grep -E '"(school|contact_name|email|phone|url|description|snippet|title)"' data/jobs-public.json
# מצופה: שורות 0
```

תפעיל את האתר מקומית (`python -m http.server 8000`) וב-DevTools → Network → `jobs-public.json` בודק את התגובה.

---

## אנשי קשר

- **מיטל פלג** — מייסדת, mlypeleg@gmail.com / meytal@edura.co.il
- **דומיין:** edura.co.il (CNAME ב-GitHub Pages)
- **ריפו:** https://github.com/meytalp-dev/edura
