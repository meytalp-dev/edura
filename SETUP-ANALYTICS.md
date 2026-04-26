# הגדרת אנליטיקס לאדורה

זהה לשיטה של גלויות פסח: Google Sheet + Apps Script + JSONP.
חינם, הכל אצלך, בלי שירותים חיצוניים.

---

## 1. גיליון אנליטיקס נפרד

גיליון אנליטיקס ייעודי (לא מתערבב עם משרות/מורים).

1. פתחי [Google Sheets](https://sheets.google.com) → גיליון חדש
2. שם: **"Edura Analytics"**
3. השאירי ריק — הסקריפט ייצור לשונית `Analytics` עם הכותרות אוטומטית בריצה הראשונה
4. העתיקי את ה-Spreadsheet ID מה-URL:
   `https://docs.google.com/spreadsheets/d/`**`SPREADSHEET_ID_HERE`**`/edit`
5. הדביקי ב-`analytics-apps-script.gs` בשורה `var SPREADSHEET_ID = '...'`

(הגיליון הנוכחי שמוטבע: `1-jQCpFVRfTtq2SigUt-ZCO-UQZOm6O5i2nme9jhzVJM`)

---

## 2. להדביק את ה-Apps Script

1. בגיליון: **Extensions → Apps Script**
2. מחקי את התוכן הקיים
3. הדביקי את כל התוכן של [`analytics-apps-script.gs`](analytics-apps-script.gs)
4. **Save** (אייקון דיסקט)
5. **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. **Deploy** → אשרי הרשאות
7. **העתיקי את ה-Web app URL**

---

## 3. להדביק את ה-URL בקוד

1. פתחי [`analytics.js`](analytics.js)
2. שורה 8 — החליפי:
   ```js
   const ANALYTICS_URL = 'PASTE_YOUR_APPS_SCRIPT_URL_HERE';
   ```
   ל:
   ```js
   const ANALYTICS_URL = 'https://script.google.com/macros/s/AKfy.../exec';
   ```
3. שמרי, commit + push

---

## 4. אירועים שנרשמים אוטומטית

| אירוע | מתי | פרטים |
|---|---|---|
| `page_view` | כל כניסה לעמוד | כותרת העמוד |
| `session_end` | כשעוזבים את הדף | שם העמוד |
| `match_badge_click` | לחיצה על "🎯 N מתאימים" | מורה/משרה + מספר התאמות |
| `match_send_email` | "שלחו לבית הספר" במודאל ההתאמה | מורה + משרה |
| `apply_modal_open` | פתיחת טופס שליחת קו"ח | מזהה משרה |
| `apply_submit` | לחיצה על "שלח פנייה" | מזהה משרה + ערוץ |
| `contact_email` / `_phone` / `_wa` | קליק על מייל/טלפון/וואטסאפ ישיר | מזהה |
| `publish_modal_open` | מורה פתח טופס פרסום עצמי | — |
| `publish_submit` | מורה שלח טופס פרסום | מקצוע + אזור |
| `search` | חיפוש חופשי | המילה שחיפשו |
| `filter_<name>` | בחירת פילטר | הערך שנבחר |

---

## 5. דשבורד פשוט בגיליון

בלשונית חדשה תוסיפי טבלאות PIVOT לראות:

- **כניסות לפי יום** — Pivot על תאריך + COUNT אירוע
- **עמודים פופולריים** — Pivot על עמוד + COUNT
- **conversion funnel** — page_view → match_badge_click → match_send_email
- **מילות חיפוש** — סינון אירוע=search + דירוג פרטים
- **מובייל vs דסקטופ** — Pivot על מכשיר

---

## תקלות נפוצות

- **לא רואה אירועים** → בדקי ש-`ANALYTICS_URL` באמת התעדכן ושעשית push
- **שגיאת CORS בקונסול** → ודאי שב-Deploy בחרת "Anyone" ולא "Anyone with Google account"
- **רוצה לעדכן את הסקריפט** → Deploy → Manage deployments → Edit → New version
