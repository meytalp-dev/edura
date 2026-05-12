---
name: Edura — לוקדאון מידע ציבורי
description: 2026-05-12 הופרדו jobs.json לציבורי+פרטי. השדות הרגישים יורדו מהאתר. flow חדש "אני מעוניינ/ת" עובר דרך Edura
type: project
originSessionId: a580feeb-a94d-4f7b-b13b-3cef3a6d127e
---
## מה נעשה (12.5.2026)

הופרדו פרטי המשרות ל-2 קבצים:
- `data/jobs-public.json` — 11 שדות בלבד, נדחף ל-Git (id, source, city, subject, role, level, sector, region, sub_area, scope, date_iso)
- `data/jobs-private.json` — גיבוי מלא, gitignored
- `data/jobs.json` + `data/jobs-pending.json` — גם gitignored כעת

**Why:** מיטל ביקשה אבטחה אמיתית — שאף משתמש באתר לא יראה שם בית ספר, איש קשר, טלפון, מייל. כל ההתאמות צריכות לעבור דרך Edura.

**How to apply:**
- כל סריקה חדשה → `python data/split-jobs-public.py` → commit&push של `jobs-public.json`
- `submit_application` ב-Apps Script מתעלם מ-`schoolEmail` מהלקוח
- `forward_application` (POST חדש) + `get_interest` (GET חדש) + `admin/forward-interest.html` (חדש) מטפלים בזרימת אישור→שליחה
- שדות רגישים גם הוסרו מ-`getApprovedListings_` (PUBLIC_JOB_FIELDS whitelist)
- index.html, chat-engine.js, israel-map.html כולם טוענים `jobs-public.json`
- `SECURITY-NOTES.md` במקור — מסביר את המודל לעמית/כל מתכנת חדש

## עדיין לא הושלם

1. **teachers.json** — אותה בעיה: דחיפת מייל/טלפון של מורות לציבור. צריך אותו פיצול לציבורי+פרטי.
2. **teachers.html** עדיין מציג email/phone.
3. **publish-job.html** — מנהלים שולחים שם+מייל+טלפון של בית הספר. השדות נשמרים ב-Apps Script (תקין) אבל ה-`getApprovedListings_` מסנן אותם (תקין). הצורה כשלעצמה לא הוגנת — שולחת ל-Apps Script העל-HTTPS, סבבה.

## קישורים

- Repo: https://github.com/meytalp-dev/edura
- SECURITY-NOTES.md ב-root של הריפו
- Apps Script לפניות: `submissions-apps-script.gs` (מיטל מפעילה ב-Google Sheets)
- ADMIN_EMAIL: meytal@edura.co.il
- APPROVE_SECRET: edura-approve-2026-meytal (אם מחליפים — לשנות ב-Deploy)

## שותף הפיתוח

עמית אביטבול (מהשותפות החדשה לעסק מערכת ניהול בית ספר) קיבל הזדמנות לבדוק את האבטחה — שלחנו לו לינק ל-repo + SECURITY-NOTES.md.
