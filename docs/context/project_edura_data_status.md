---
name: Edura — סטטוס נתונים אמיתיים
description: 726 משרות אמיתיות נאספו מ-3 מקורות, מחווטות ל-design-preview-atlas, פעילות ב-GitHub Pages
type: project
originSessionId: 0b5198f5-bd2e-448a-b2e8-2dfd6457ff89
---
# Edura — סטטוס נתוני משרות (25.4.2026, סבב 2)

## הושלם

**726 משרות אמיתיות** נגרדו ב-Playwright ושמורות לדיסק עם רשומות מלאות.

### מקורות
- **igm (ארגון המורים)** — 285 משרות, schema מלא: school+subject+scope+region+city+contact+email+phone+info
- **itu (הסתדרות המורים)** — 198 משרות, schema חלקי: title+subject+institute+excerpt (אין email/phone בלוח האינדקס)
- **shatil** — 243 משרות, schema מלא: title+description+contact+email+jobType+zones

### קבצים
- `docs/edura/data/raw/{igm,itu,shatil}-jobs.json` — גולמי לכל מקור
- `docs/edura/data/jobs.json` — איחוד 726 רשומות עם schema אחיד: `{id, source, source_name, school, title, subject, role, region, sub_area, city, scope, contact_name, email, phone, date, date_iso, snippet, description, url}`
- `docs/edura/data/merge.py` — סקריפט מיזוג + נורמליזציה (אזורים, תפקידים, תאריכים)

### חיווט ל-HTML
`docs/edura/design-preview-atlas.html` טוען דינמית את `data/jobs.json`:
- 8 כרטיסי dummy → רנדרר JS שמייצר 726 כרטיסים אמיתיים
- כל ה-"818" → `<span class="total-jobs-count">726</span>` שמתעדכן ב-renderer
- סינון region/level/sector/subject/role/scope עובד על הנתונים האמיתיים

### פילוח
- by_source: shatil 243 · itu 198 · igm 285
- by_region: מרכז 292 · ירושלים 57 · צפון 69 · שפלה 23 · דרום 37 · ארצי 9 · לא זוהה 239 (רובם itu)
- by_role: מורה 628 · מחנך/ת 38 · רכז/ת 21 · מדריך/ה 22 · יועץ/ת 5 · מטפל/ת 6 · סייע/ת 6

## פעיל

- Commit: `a7c31a1` ב-main
- URL חי: https://meytalp-dev.github.io/ort-training/edura/design-preview-atlas.html

## פתוחים לעתיד

1. **itu לא חושף email/phone באינדקס** — צריך click-through לדף פרטים אם רוצים
2. **itu ללא region** — 198 רשומות מסומנות "(לא זוהה)". ניתן לחלץ region מ-institute
3. **שתיל emails** — רובם דרך proxy `nathan+jXXXX+s599@app.civi.co.il` (Civi.co.il CRM)
4. **פייסבוק 61 פוסטים** — לא נכללים, נשמרו רק stats במקור
5. **רענון יומי** — סקריפט הגריד הוא חד-פעמי, יש להפוך לטריגר

## כללי גריד שעבדו

1. **igm** — `&p1=20` (לא `&p1=1`) מחזיר את כל 285 הרשומות בעמוד אחד, מוטמעות ב-`<script>` כ-`json.rows`
2. **itu** — קליק חוזר על "טען עוד" + `data-careerid` selector
3. **shatil** — `?field_main_roles_job_target_id[]=40` (ID 40 = הוראה), פאגינציה `&page=N`. דף פרטים: `.region-content` selector (לא `.field--name-body` — זה תפס chrome של האתר)
