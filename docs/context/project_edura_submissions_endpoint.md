---
name: Edura — Submissions endpoint פעיל
description: Apps Script endpoint נפרד לשליחת מועמדויות, פרסום משרות והרשמה להתראות. נבנה ב-26.4.2026 בעקבות פידבק רחל ודני.
type: project
originSessionId: f57ea07e-5960-474e-80f2-4b90b717271d
---
# Edura — Submissions endpoint

**URL:** `https://script.google.com/macros/s/AKfycbwleldcwH8c5k9OZ8EMDIKZ8veRbrtO1M7XwYFWg7HHbEV-SrZkLTElbFRiq4cHPlyarw/exec`
**קובץ:** `~/Downloads/edura/submissions-apps-script.gs`
**Sheet:** "Edura — פניות והרשמות"
**מחובר ב:** `index.html` + `saved.html` כקבוע `SUBMISSIONS_URL`
**Deploy:** 26.4.2026 (אחרי הפידבק של רחל ודני)

## 4 actions
- `submit_application` — שליחת מועמדות (קו"ח עולה ל-Drive ב-attachment)
- `submit_job` — מנהלים מפרסמים משרה
- `subscribe_alerts` — מורות שמבקשות התראה יומית
- `subscribe_principal` — הרשמה לסבב מכרזי ניהול הבא

## דפים חדשים שנוצרו באותה משימה
- `about.html` — מי אנחנו, למה נוצר, 14 מקורות, שקיפות (3 לאווים: מכירת נתונים, ספאם, דמי תיווך — **ללא** "לא חוסמים מאחורי תשלום" כי מיטל לא רוצה להתחייב להמשך)
- `saved.html` — המשרות שלי + טפסי הרשמה להתראות

## Trigger יומי
`installDailyAlerts()` — שולח 06:15 משרות חדשות מ-24 שעות לכל מורה לפי קריטריונים. **טרם מותקן** (צריך להריץ ידנית פעם אחת ב-Apps Script).

## Why
מיטל קיבלה פידבק מ-2 פרסונות (רחל ודני) שדרשו: דף "על אדורה" + endpoint שליחה אמיתי במקום mailto. שני אלה ירדו לאוויר ב-26.4.2026.

## How to apply
- אם מיטל מדווחת על תקלת שליחה — לבדוק את ה-Sheet "applications"/"posted_jobs"/"alerts", ואת טאב ה-log שם
- לפני קריאה לאחד ה-actions — לבדוק שה-URL בתוקף (Apps Script לפעמים מחליף URL כשעושים deploy חדש)
- אם מיטל אומרת שלא הגיע מייל אישור — שתבדוק תיקיית spam קודם
