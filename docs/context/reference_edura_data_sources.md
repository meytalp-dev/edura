---
name: Edura — מקורות נתוני מורים ומשרות
description: Edura כולל 3 קבצי מורים נפרדים שצריך למזג ל-teachers.json. הריפו ב-Downloads/edura, לא בריפו של אורט.
type: reference
originSessionId: ef261b5f-fe2a-4870-8601-4a647e14a58f
---
# Edura — מבנה הנתונים

## מיקום הריפו
- **Local:** `C:\Users\meyta\Downloads\edura\`
- **GitHub:** https://github.com/meytalp-dev/edura
- **אתר:** https://edura.co.il
- ב-`docs/edura/` בריפו של אורט יש רק רידיירקטים — הקוד האמיתי בריפו edura

## מורים — 3 מקורות (סה"כ 127)

| קובץ | מקור | כמות | סקריפט המרה |
|---|---|---|---|
| `data/raw/igm-teachers.json` | ארגון המורים | 35 | `data/make-teachers.py` |
| `data/fb-teachers.json` | קבוצת FB 1 | 79 | `data/merge-teachers.py` |
| `data/fb-teachers-2.json` | קבוצת FB 2 | 13 | `data/merge-teachers.py` |

**ה-merger המאוחד:** `data/merge-teachers.py` קורא את כל 3 ויוצר `data/teachers.json`. ה-igm raw לפעמים לא מצוי במחשב — ה-merger נופל-בחזרה לרשומות source=igm מתוך teachers.json הקיים.

**Schema אחיד:** id, source, source_name, name, subject, level, region, sub_area, city, scope, notes, email, phone, fb_url, date, date_iso, url

**parse_area:** ה-FB משתמש בשדה `area` כמחרוזת חופשית ('ראשון לציון והסביבה' / 'מרכז / השרון' / 'צפון — גליל תחתון'). ה-merger מפצל לפי `/`, מפענח עיר→region דרך `CITY_TO_REGION`, מסיר 'והסביבה'/'בלבד'/סוגריים/מקפים. כש-area מציין כמה אזורים → region נשמר כמערך (matching.js תומך).

## משרות — 3 מקורות (סה"כ 436)

`data/jobs.json` נבנה ע"י `data/merge.py` ממקורות:
- `data/raw/igm-jobs.json` (ארגון המורים)
- `data/raw/itu-jobs.json` (הסתדרות המורים)
- `data/raw/shatil-jobs.json` (שתיל)

**`is_teacher_job()`** מסנן רק משרות הוראה אמיתיות (לא צהרון/מועדונית/קו"ח/תרפיסט/מנהל).

## איך להוסיף מקור מורים חדש
1. שמרי את הקובץ ל-`data/<source>.json` עם `{teachers: [...]}` ו-fields: subject, area, level, scope, notes, fb_url
2. עדכני `merge-teachers.py` להוסיף קריאה ל-`transform_fb(NEW_SRC, 'src-id', 'שם תצוגה')`
3. הריצי: `python data/merge-teachers.py`

## איך להוסיף מקור משרות חדש
1. שמרי raw ל-`data/raw/<source>-jobs.json`
2. כתבי `transform_<source>(raw)` ב-`data/merge.py` שמחזיר רשומות בסכמה האחידה
3. הוסיפי קריאה ב-`main()`
4. הריצי: `python data/merge.py`

## Matching — `matching.js`
- MIN_SCORE = 50
- subject exact = 60, partial = 40
- region exact = 30, neighbor = 15
- city = bonus +10 (ולא חובה — לבדוק אם זה עוד תקף)
- level חובה אם שני הצדדים ציינו, עיר חובה אם שני הצדדים ציינו

**ביצועים נוכחיים (2026-04-27):** 127 מורים · 436 משרות · 101 התאמות, 25 מורים עם match, 85 משרות עם match.
