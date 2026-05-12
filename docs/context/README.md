# Edura · Context Files

> חבילת הקשר לעמית או לכל מתכנת/ת חדש/ה שמתחיל/ה לעבוד על Edura.

המסמכים בתיקייה הזו הם snapshot של ההקשר שצברנו על הפרויקט — לא יומן שיחה, אלא תקצירים של החלטות עיקריות, מבנה הנתונים, ה-Apps Scripts, וההיגיון העיצובי.

---

## סדר קריאה מומלץ

1. [`../../SECURITY-NOTES.md`](../../SECURITY-NOTES.md) — **חובה לקרוא קודם.** מסביר את מודל הציבורי/פרטי.
2. [`project_teaching_jobs_board.md`](project_teaching_jobs_board.md) — מהו Edura, למה הוא קיים.
3. [`project_edura_security_lockdown.md`](project_edura_security_lockdown.md) — מה השתנה ב-12.5.2026 (הלוקדאון האחרון).
4. [`project_edura_data_status.md`](project_edura_data_status.md) — מה הנתונים האמיתיים ואיך הם נטענים.
5. [`reference_edura_data_sources.md`](reference_edura_data_sources.md) — מאיפה מגיעים הנתונים (3 מקורות מורים, 4 מקורות משרות).
6. [`project_jobs_scanner.md`](project_jobs_scanner.md) — Apps Script שסורק את הלוחות.
7. [`project_edura_submissions_endpoint.md`](project_edura_submissions_endpoint.md) — Apps Script שני שמטפל בפניות והרשמות.
8. [`reference_edura_copy_bank.md`](reference_edura_copy_bank.md) — איפה מאוחסנים המשפטים והקופי.
9. [`feedback_edura_city_prominent.md`](feedback_edura_city_prominent.md) — החלטת UX מרכזית (העיר תמיד גדולה ובולטת).

---

## איך זה משתלב עם שאר הריפו

```
edura/
├── SECURITY-NOTES.md           ← המודל הציבורי/פרטי
├── index.html                  ← האתר הראשי (edura.co.il)
├── chat-engine.js              ← מנוע הצ'אט-בוט
├── matching.js                 ← מנוע ההתאמה (משקלים)
├── copy.js                     ← מאגר הקופי
├── jobs-scanner-apps-script.js ← Apps Script #1 (סריקה)
├── submissions-apps-script.gs  ← Apps Script #2 (פניות+הרשמות)
├── admin/                      ← דפי ניהול
│   ├── forward-interest.html   ← אישור והעברה לבית הספר
│   ├── matches.html            ← לוח התאמות
│   └── staging.html            ← אישור פרסומים חדשים
├── data/
│   ├── jobs-public.json        ← ⚠️ נדחף ל-Git (רק 11 שדות לא-PII)
│   ├── jobs.json               ← ❌ gitignored (גרסה מלאה)
│   ├── jobs-private.json       ← ❌ gitignored (גיבוי)
│   ├── teachers.json           ← ⚠️ עוד לא הופרד! TODO
│   └── split-jobs-public.py    ← סקריפט הפיצול
└── docs/
    └── context/                ← אתה כאן
```

---

## מה ה-pipeline היומי

1. **06:00 IL** — Apps Script `jobs-scanner` רץ אוטומטית, מעדכן את ה-Sheet הפרטי שלו
2. מיטל מריצה ידנית: `python data/split-jobs-public.py` → מייצר `jobs-public.json` חדש
3. `git add data/jobs-public.json && git commit && git push`
4. GitHub Pages מפיץ את העדכון לאתר

---

## כללים חשובים לעורכ/ת קוד

1. **לעולם** אל תעבירי שדה רגיש מ-`data/jobs.json` ל-`data/jobs-public.json`. ראי את ה-whitelist ב-`data/split-jobs-public.py`.
2. **לעולם** אל תוסיפי שדה רגיש לרינדור ב-`index.html`, `chat-engine.js`, או `israel-map.html`.
3. **לעולם** אל תקבלי `schoolEmail` מהלקוח ב-`submit_application` — תמיד מאדורה.
4. כל פעולה שמשתמשת בטוקן מהמייל **חייבת** לעבור דרך `signToken_()` עם `APPROVE_SECRET`.
5. אם הוספת endpoint POST חדש שמטפל בנתונים — וודאי שיש לו אימות טוקן או הגנת honeypot.

---

## אנשי קשר

- **מיטל פלג** (מייסדת) — meytal@edura.co.il / mlypeleg@gmail.com
- **דומיין:** edura.co.il
- **ריפו:** github.com/meytalp-dev/edura
