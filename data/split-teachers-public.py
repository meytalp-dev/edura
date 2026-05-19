# -*- coding: utf-8 -*-
"""
Edura — מאחד את teachers.json + fb-teachers.json + fb-teachers-2.json לקובץ אחד.

  1. teachers-public.json    — נדחף ל-GitHub Pages. כולל את כל פרטי המורה
                                ושלוש המקורות מאוחדים ל-array אחד.
  2. teachers-private.json   — מקומי בלבד (gitignored). גיבוי זהה ל-public.

הערה היסטורית: בעבר (12.5.2026) הופעל "לוקדאון" שהסתיר שמות מורים ופרטי קשר.
הלוקדאון בוטל ב-19.5.2026 לבקשת מיטל — האתר הוא המקום הציבורי לטיפול בפניות.

הרצה:
    python data/split-teachers-public.py
"""

import json
import sys
from pathlib import Path

# שדות שעוברים לקובץ הציבורי — כל המידע על המורה, כולל שם ופרטי קשר
PUBLIC_FIELDS = [
    "id",
    "source",
    "source_name",
    "name",
    "email",
    "phone",
    "url",
    "fb_url",
    "subject",
    "level",
    "region",
    "sub_area",
    "city",
    "scope",
    "date",
    "date_iso",
    "contact_via_platform",
    "notes",
]

# (נשמר לתיעוד — אחרי ביטול הלוקדאון אין יותר שדות פרטיים)
PRIVATE_FIELDS = []


def load_json(path: Path):
    if not path.exists():
        return None
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def main() -> None:
    here = Path(__file__).parent.resolve()
    main_path = here / "teachers.json"
    fb1_path = here / "fb-teachers.json"
    fb2_path = here / "fb-teachers-2.json"
    public_path = here / "teachers-public.json"
    private_path = here / "teachers-private.json"

    main_data = load_json(main_path)
    fb1_data = load_json(fb1_path)
    fb2_data = load_json(fb2_path)

    if not main_data:
        print(f"שגיאה: לא נמצא קובץ {main_path}", file=sys.stderr)
        sys.exit(1)

    main_teachers = main_data.get("teachers", [])
    fb1_teachers = (fb1_data or {}).get("teachers", [])
    fb2_teachers = (fb2_data or {}).get("teachers", [])

    all_private = main_teachers + fb1_teachers + fb2_teachers
    print(f"מקורות: main={len(main_teachers)}  fb1={len(fb1_teachers)}  fb2={len(fb2_teachers)}")

    public_teachers = []
    for t in all_private:
        public_teachers.append({k: t.get(k, "") for k in PUBLIC_FIELDS})

    public_data = {
        "updated_at": main_data.get("updated_at", ""),
        "total": len(public_teachers),
        "by_source": main_data.get("by_source", {}),
        "by_region": main_data.get("by_region", {}),
        "by_subject": main_data.get("by_subject", {}),
        "by_level": main_data.get("by_level", {}),
        "by_scope": main_data.get("by_scope", {}),
        "teachers": public_teachers,
    }

    private_data = {
        "updated_at": main_data.get("updated_at", ""),
        "total": len(all_private),
        "teachers": all_private,
    }

    with public_path.open("w", encoding="utf-8") as f:
        json.dump(public_data, f, ensure_ascii=False, indent=2)
    with private_path.open("w", encoding="utf-8") as f:
        json.dump(private_data, f, ensure_ascii=False, indent=2)

    print(f"\nסה\"כ {len(all_private)} מורים פוצלו")
    print(f"  ציבורי: {public_path}  ({public_path.stat().st_size // 1024} KB)")
    print(f"  פרטי:   {private_path}  ({private_path.stat().st_size // 1024} KB)")
    print()
    print("שדות ציבוריים:", ", ".join(PUBLIC_FIELDS))
    print("שדות שירדו: ", ", ".join(PRIVATE_FIELDS))


if __name__ == "__main__":
    main()
