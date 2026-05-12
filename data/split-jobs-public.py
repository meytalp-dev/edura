# -*- coding: utf-8 -*-
"""
Edura — מפצל את jobs.json לשני קבצים:

  1. jobs-public.json   — מתפרסם ב-GitHub Pages. רק שדות לא-רגישים.
  2. jobs-private.json  — מקומי בלבד (gitignored). גיבוי מלא של כל הפרטים.

הסיבה: אסור ששם בית הספר, איש קשר, מייל, טלפון או URL ייחשפו באתר.
המתעניינים נשלחים דרך טופס "אני מעוניין/ת" → המייל מגיע לאדורה →
אדורה לוחצת "אשרי שליחה" → המערכת מעבירה לבית הספר.

הרצה:
    python data/split-jobs-public.py
"""

import json
import os
import sys
from pathlib import Path

# שדות שמותר לפרסם באתר
PUBLIC_FIELDS = [
    "id",
    "source",        # itu / igm / shatil / fb — לסטטיסטיקה, לא חושף בית ספר
    "city",
    "subject",
    "role",
    "level",
    "sector",
    "region",
    "sub_area",
    "scope",
    "date_iso",      # תאריך פרסום
]

# שדות שיורדים מהציבורי (נשמרים רק ב-private)
PRIVATE_FIELDS = [
    "source_name",   # "הסתדרות המורים" וכו' — לא רגיש אבל לא נחוץ באתר
    "school",
    "title",         # חלק מהכותרות מכילות שם בית ספר
    "snippet",       # חלק מהsnippets מכילים שם בית ספר
    "description",   # תיאור מלא — לא לציבור (חוזר ל"מבחן עין" של מתעניין רציני)
    "contact_name",
    "email",
    "phone",
    "url",           # קישור למקור — חושף בית ספר
    "date",          # פורמט מקורי, date_iso מספיק לציבורי
]


def split_jobs(input_path: Path, public_path: Path, private_path: Path) -> None:
    if not input_path.exists():
        print(f"שגיאה: לא נמצא קובץ {input_path}", file=sys.stderr)
        sys.exit(1)

    with input_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    jobs = data.get("jobs", [])
    if not jobs:
        print("אזהרה: לא נמצאו משרות במקור", file=sys.stderr)

    public_jobs = []
    for job in jobs:
        public_jobs.append({k: job.get(k, "") for k in PUBLIC_FIELDS})

    # קובץ ציבורי — רק metadata לסטטיסטיקה + המשרות עם השדות הציבוריים בלבד
    public_data = {
        "updated_at": data.get("updated_at", ""),
        "total": data.get("total", len(public_jobs)),
        "by_source": data.get("by_source", {}),
        "by_region": data.get("by_region", {}),
        "by_role": data.get("by_role", {}),
        "by_level": data.get("by_level", {}),
        "by_sector": data.get("by_sector", {}),
        "by_scope": data.get("by_scope", {}),
        "by_subject": data.get("by_subject", {}),
        "jobs": public_jobs,
    }

    # קובץ פרטי — כל הנתונים המלאים בדיוק כפי שהם
    with public_path.open("w", encoding="utf-8") as f:
        json.dump(public_data, f, ensure_ascii=False, indent=2)

    with private_path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✓ {len(public_jobs)} משרות פוצלו")
    print(f"  ציבורי: {public_path}  ({public_path.stat().st_size // 1024} KB)")
    print(f"  פרטי:   {private_path}  ({private_path.stat().st_size // 1024} KB)")
    print()
    print("שדות ציבוריים:", ", ".join(PUBLIC_FIELDS))
    print("שדות שירדו: ", ", ".join(PRIVATE_FIELDS))


def main() -> None:
    here = Path(__file__).parent.resolve()
    input_path = here / "jobs.json"
    public_path = here / "jobs-public.json"
    private_path = here / "jobs-private.json"
    split_jobs(input_path, public_path, private_path)


if __name__ == "__main__":
    main()
