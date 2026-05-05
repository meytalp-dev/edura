"""
Cleanup pass on jobs-pending.json — infer missing/generic fields from description.

Run: python data/cleanup-pending.py
"""
import json
import re
import sys
from pathlib import Path

PENDING = Path(__file__).parent / 'jobs-pending.json'

# Canonical city → list of spelling/abbreviation variants found in real text.
# Order of variants matters: more-specific/longer first within a list.
CITY_VARIANTS = {
    'ירושלים': ['ירושלים', 'י-ם', 'י"ם', 'י״ם'],
    'תל אביב': ['תל אביב', 'תל-אביב', 'ת"א', 'ת״א', 'ת"א-יפו'],
    'רמת גן': ['רמת גן', 'ר"ג', 'ר״ג'],
    'גבעתיים': ['גבעתיים'],
    'הרצליה': ['הרצליה'],
    'רעננה': ['רעננה'],
    'כפר סבא': ['כפר סבא', 'כ"ס', 'כ״ס'],
    'פתח תקווה': ['פתח תקווה', 'פתח תקוה', 'פ"ת', 'פ״ת'],
    'בני ברק': ['בני ברק', 'ב"ב', 'ב״ב'],
    'ראשון לציון': ['ראשון לציון', 'ראשל"צ', 'ראשל״צ'],
    'חולון': ['חולון'],
    'בת ים': ['בת ים', 'בת-ים'],
    'רחובות': ['רחובות'],
    'נתניה': ['נתניה'],
    'אשדוד': ['אשדוד'],
    'אשקלון': ['אשקלון'],
    'באר שבע': ['באר שבע', 'ב"ש', 'ב״ש', 'באר-שבע'],
    'דימונה': ['דימונה'],
    'אילת': ['אילת'],
    'חיפה': ['חיפה'],
    'נצרת': ['נצרת'],
    'עכו': ['עכו'],
    'טבריה': ['טבריה'],
    'צפת': ['צפת'],
    'כרמיאל': ['כרמיאל'],
    'נהריה': ['נהריה'],
    'עפולה': ['עפולה'],
    'בית שאן': ['בית שאן', 'בית-שאן'],
    'קריית שמונה': ['קריית שמונה', 'קרית שמונה'],
    'מודיעין': ['מודיעין מכבים רעות', 'מודיעין-מכבים-רעות', 'מודיעין'],
    'בית שמש': ['בית שמש', 'בית-שמש'],
    'לוד': ['לוד'],
    'רמלה': ['רמלה'],
    'קריית גת': ['קריית גת', 'קרית גת'],
    'ערד': ['ערד'],
    'שדרות': ['שדרות'],
    'אופקים': ['אופקים'],
    'קריית מלאכי': ['קריית מלאכי', 'קרית מלאכי'],
    'יבנה': ['יבנה'],
    'גן יבנה': ['גן יבנה'],
    'אור יהודה': ['אור יהודה'],
    'קריית אונו': ['קריית אונו', 'קרית אונו'],
    'גני תקווה': ['גני תקווה', 'גני תקוה'],
    'כוכב יאיר': ['כוכב יאיר'],
    'קדימה צורן': ['קדימה-צורן', 'קדימה צורן', 'קדימה'],
    'אבן יהודה': ['אבן יהודה'],
    'זכרון יעקב': ['זכרון יעקב', 'זיכרון יעקב'],
    'חדרה': ['חדרה'],
    'כפר יונה': ['כפר יונה'],
    'קריית ביאליק': ['קריית ביאליק', 'קרית ביאליק'],
    'קריית מוצקין': ['קריית מוצקין', 'קרית מוצקין'],
    'קריית ים': ['קריית ים', 'קרית ים'],
    'ביתר עילית': ['ביתר עילית', 'ביתר-עילית'],
    'מודיעין עילית': ['מודיעין עילית', 'מודיעין-עילית'],
    'אלעד': ['אלעד'],
    'עמנואל': ['עמנואל'],
    'אריאל': ['אריאל'],
    'קריית ארבע': ['קריית ארבע', 'קרית ארבע'],
    'ראש העין': ['ראש העין', 'ראש-העין'],
    'שוהם': ['שוהם'],
    'נס ציונה': ['נס ציונה', 'נס-ציונה'],
    'יהוד': ['יהוד מונוסון', 'יהוד'],
    # Settlements
    'אפרת': ['אפרת'],
    'גבע בנימין': ['גבע בנימין'],
    'אדם': ['אדם'],
    'עפרה': ['עפרה'],
    'הר אדר': ['הר אדר'],
    'מעלה אדומים': ['מעלה אדומים'],
    'בית אל': ['בית אל'],
    'אלונים': ['אלונים'],
    'יוקנעם': ['יוקנעם', 'יקנעם'],
    'מגדל העמק': ['מגדל העמק', 'מגדל-העמק'],
    'נצרת עילית': ['נצרת עילית', 'נוף הגליל'],
    # Regional councils
    'מטה בנימין': ['מטה בנימין', 'מטה-בנימין'],
    'גוש עציון': ['גוש עציון'],
    'חבל מודיעין': ['חבל מודיעין'],
    'דרום השרון': ['דרום השרון'],
    'עמק חפר': ['עמק חפר'],
    'עמק יזרעאל': ['עמק יזרעאל'],
    'מגידו': ['מגידו'],
    'גליל עליון': ['גליל עליון'],
    'גליל תחתון': ['גליל תחתון'],
    'גלבוע': ['גלבוע'],
    'בקעת בית שאן': ['בקעת בית שאן'],
    'בקעת הירדן': ['בקעת הירדן'],
    'מטה יהודה': ['מטה יהודה'],
    'שדות נגב': ['שדות נגב'],
    'בני שמעון': ['בני שמעון'],
    'אשכול': ['אשכול'],
    'מעלה יוסף': ['מעלה יוסף'],
    'מטה אשר': ['מטה אשר'],
    'משגב': ['משגב'],
    'מבואות החרמון': ['מבואות החרמון'],
    'חוף הכרמל': ['חוף הכרמל'],
    'יואב': ['יואב'],
    'לכיש': ['לכיש'],
    'הר חברון': ['דרום הר חברון', 'הר חברון'],
    'בנימין': ['בנימין'],
    'שומרון': ['שומרון'],
    # Yishuvim added after manual review
    'טירת הכרמל': ['טירת הכרמל', 'טירת-הכרמל'],
    'תל מונד': ['תל מונד', 'תל-מונד'],
    'שילה': ['שילה'],
    'אליקים': ['אליקים'],
    'רעות': ['רעות'],
    'בית דגן': ['בית דגן'],
    'גן רווה': ['גן רווה'],
    'גזר': ['גזר'],
    'מבשרת ציון': ['מבשרת ציון', 'מבשרת'],
    'אבו גוש': ['אבו גוש', 'אבו-גוש'],
    'נווה אילן': ['נווה אילן'],
    'גני תקווה': ['גני תקווה', 'גני תקוה'],
    'יבנאל': ['יבנאל'],
    'מצפה רמון': ['מצפה רמון'],
    'יד בנימין': ['יד בנימין'],
    'בית יצחק': ['בית יצחק'],
    'גדרה': ['גדרה'],
    'נצר סרני': ['נצר סרני'],
}

# School-name → city overrides for cases where city isn't extractable from text alone
# (e.g., "חטב רבין אזור" — אזור is too short to safely substring-match,
# but as a school suffix it's diagnostic)
SCHOOL_CITY_OVERRIDES = {
    'חטב רבין אזור': 'אזור',
    'יצחק נבון': 'נתניה',  # known via ynavon.co.il email domain
    'מקיף רוגוזין': 'מגדל העמק',  # ORT Rogozin
}

# Flatten variants → canonical map. Sort by variant length so longer wins.
CITY_VARIANT_TO_CANONICAL = []  # list of (variant, canonical)
for canonical, variants in CITY_VARIANTS.items():
    for v in variants:
        CITY_VARIANT_TO_CANONICAL.append((v, canonical))
CITY_VARIANT_TO_CANONICAL.sort(key=lambda x: -len(x[0]))

KNOWN_SUBJECTS = [
    'מתמטיקה', 'אנגלית', 'עברית', 'ספרות', 'לשון', 'תנ"ך', 'תושב"ע', 'היסטוריה',
    'אזרחות', 'גיאוגרפיה', 'גאוגרפיה', 'פיזיקה', 'פיסיקה', 'כימיה', 'ביולוגיה',
    'מדעי המחשב', 'מחשבים', 'תקשוב', 'מדעים', 'מדע וטכנולוגיה', 'חינוך גופני',
    'אומנות', 'אמנות', 'מוסיקה', 'מוזיקה', 'ערבית', 'צרפתית', 'ספרדית', 'רוסית',
    'תקשורת', 'רובוטיקה', 'תיאטרון', 'יזמות', 'תיירות', 'חקלאות', 'חינוך מיוחד',
    'גיל הרך', 'מסחר', 'דיגיטל', 'אופנה', 'עיצוב', 'בריאות', 'סיעוד', 'רפואה',
    'הנדסה', 'אלקטרוניקה', 'מכונאות', 'חשמל', 'אדריכלות', 'תזונה', 'תרפיה',
    'קולנוע', 'צילום', 'אנימציה', 'טכנולוגיה', 'אגרונומיה',
]

GENERIC_SUBJECT_PATTERN = re.compile(r'^(מורה כולל|מורה לכל|כולל|כללי|אחר|מורה|הוראה)\s*(/?ת)?\s*$')


def is_generic_subject(s):
    if not s or not s.strip():
        return True
    return bool(GENERIC_SUBJECT_PATTERN.match(s.strip()))


def infer_city(text):
    if not text:
        return None
    # Match by variant (longest first) and return canonical city name
    for variant, canonical in CITY_VARIANT_TO_CANONICAL:
        if variant in text:
            return canonical
    return None


def infer_subject(text):
    if not text:
        return None
    # Patterns ordered most-specific first
    patterns = [
        r'(?:במקצוע|למקצוע|המקצוע)\s+([א-ת"\'/\s]+?)(?=[\s,.;:!?]|$)',
        r'להוראת\s+([א-ת"\'/\s]+?)(?=[\s,.;:!?]|$)',
        r'מורה\s+ל[-\s]?([א-ת"\'/]+(?:\s+[א-ת"\'/]+){0,1})(?=[\s,.;:!?]|$)',
        r'הוראת\s+([א-ת"\'/]+(?:\s+[א-ת"\'/]+){0,1})',
    ]
    for pat in patterns:
        m = re.search(pat, text)
        if m:
            cand = m.group(1).strip().rstrip('.,;:!?')
            if cand and len(cand) > 1 and cand not in ('של', 'את', 'עם', 'על', 'זה'):
                return cand
    # Fallback: known subject substring
    for s in sorted(KNOWN_SUBJECTS, key=len, reverse=True):
        if s in text:
            return s
    return None


def infer_role(text):
    if not text:
        return None
    if re.search(r'דרוש[\s/]+ה?\s*מחנכ', text) or re.search(r'מחנכ[ת/]', text):
        return 'מחנך/ת'
    if re.search(r'דרוש[\s/]+ה?\s*יועצ', text) or re.search(r'יועצ[ת/]', text):
        return 'יועץ/ת'
    if re.search(r'דרוש[\s/]+ה?\s*רכז', text):
        return 'רכז/ת'
    if 'מתמחה הוראה' in text:
        return 'מתמחה הוראה'
    if re.search(r'סייע[ת/\s]', text):
        return 'סייע/ת'
    if 'תרפיסט' in text:
        return 'תרפיסט/ית'
    return None


def infer_level(text):
    if not text:
        return None
    if 'גן ילדים' in text or 'גן חובה' in text:
        return 'גן'
    if 'יסודי' in text or "כיתות א'-ו'" in text:
        return 'יסודי'
    if 'חט"ב' in text or 'חטיבת ביניים' in text or 'חטיבה' in text:
        return 'חטיבת ביניים'
    if 'תיכון' in text or 'חטיבה עליונה' in text:
        return 'תיכון'
    return None


def cleanup_job(job):
    text = ' '.join(filter(None, [
        job.get('description', ''),
        job.get('snippet', ''),
        job.get('school', ''),
        job.get('title', ''),
    ]))
    fixes = []

    # City — first check school-name overrides, then variant dictionary
    if not job.get('city', '').strip():
        school = (job.get('school') or '').strip()
        c = SCHOOL_CITY_OVERRIDES.get(school)
        if not c:
            # Match by ynavon.co.il email domain etc
            email = (job.get('email') or '').lower()
            if 'ynavon' in email:
                c = 'נתניה'
        if not c:
            c = infer_city(text)
        if c:
            job['city'] = c
            fixes.append(f'city={c}')

    # Subject
    if is_generic_subject(job.get('subject', '')):
        s = infer_subject(text)
        if s:
            job['subject'] = s
            fixes.append(f'subject={s}')

    # Role — prefer specific role from text over generic 'מורה'
    current_role = (job.get('role') or '').strip()
    inferred_role = infer_role(text)
    if inferred_role and current_role in ('', 'מורה'):
        job['role'] = inferred_role
        fixes.append(f'role={inferred_role}')

    # Level
    if not job.get('level', '').strip():
        l = infer_level(text)
        if l:
            job['level'] = l
            fixes.append(f'level={l}')

    return fixes


def main():
    data = json.loads(PENDING.read_text(encoding='utf-8'))
    total_fixes = 0
    fixed_jobs = 0
    for job in data['jobs']:
        fixes = cleanup_job(job)
        if fixes:
            fixed_jobs += 1
            total_fixes += len(fixes)

    # Recompute aggregates
    by_source = {}
    for j in data['jobs']:
        s = j.get('source', '')
        by_source[s] = by_source.get(s, 0) + 1
    data['by_source'] = by_source
    data['total_pending'] = len(data['jobs'])

    PENDING.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding='utf-8',
    )

    print(f'Cleaned: {fixed_jobs} jobs · {total_fixes} field fixes')


if __name__ == '__main__':
    main()
