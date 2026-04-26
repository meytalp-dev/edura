# אדורה · Edura

לוח דרושים ייעודי לחינוך · [edura.co.il](https://edura.co.il)

מאגרגת משרות הוראה ממקורות פתוחים: ארגון המורים, הסתדרות המורים, שתיל ועוד. בוט חכם בעברית, התאמה דו-כיוונית בין מורים למשרות, ומכרזי ניהול בית-ספר.

## מבנה

```
/                      דף בית · כל המשרות
chat.html              בוט חיפוש (3 מסלולים)
teachers.html          מאגר מורים מחפשי עבודה
manager-form.html      טופס פרסום משרה למנהלים
manager-tenders.html   מכרזי ניהול בתי"ס
data/                  jobs.json · teachers · principal positions
matching.js            מנוע התאמה
chat-engine.js         לוגיקת הבוט
analytics-apps-script.gs   GAS endpoint לאנליטיקס
jobs-scanner-apps-script.js   סקריפט גריד יומי
```

## מקורות איסוף

- ארגון המורים (igm.org.il)
- הסתדרות המורים (itu.org.il)
- שתיל (jobs.shatil.org.il)
- קבוצות פייסבוק ציבוריות

## דיפלוי

GitHub Pages מ-`main` שורש. `CNAME` מצביע ל-`edura.co.il`.

## פיתוח

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## רישיון

© 2026 אדורה — פרויקט של [מיטל פלג](https://www.linkedin.com/in/meytalpeleg). מאגרי הדאטה מקבלים השראה מ-spec.md.
