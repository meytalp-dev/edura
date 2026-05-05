"""
Cleanup pass on jobs-pending.json — infer missing/generic fields from description.

Run: python data/cleanup-pending.py
"""
import json
import re
import sys
from pathlib import Path

PENDING = Path(__file__).parent / 'jobs-pending.json'

KNOWN_CITIES = [
    # Major cities
    'ירושלים', 'תל אביב', 'רמת גן', 'גבעתיים', 'הרצליה', 'רעננה', 'כפר סבא',
    'פתח תקווה', 'בני ברק', 'ראשון לציון', 'חולון', 'בת ים', 'רחובות', 'נתניה',
    'אשדוד', 'אשקלון', 'באר שבע', 'דימונה', 'אילת', 'חיפה', 'נצרת', 'עכו',
    'טבריה', 'צפת', 'כרמיאל', 'נהריה', 'עפולה', 'בית שאן', 'קריית שמונה',
    # Mid-sized
    'מודיעין', 'בית שמש', 'לוד', 'רמלה', 'קריית גת', 'ערד', 'שדרות', 'אופקים',
    'קריית מלאכי', 'יבנה', 'גן יבנה', 'אור יהודה', 'קריית אונו', 'גני תקווה',
    'כוכב יאיר', 'קדימה', 'צורן', 'אבן יהודה', 'זכרון יעקב', 'חדרה', 'כפר יונה',
    'קריית ביאליק', 'קריית מוצקין', 'קריית ים', 'ביתר עילית', 'מודיעין עילית',
    'אלעד', 'עמנואל', 'אריאל', 'קריית ארבע', 'ראש העין', 'שוהם', 'נס ציונה',
    # Settlements & towns
    'אפרת', 'גבע בנימין', 'אדם', 'עפרה', 'הר אדר', 'מעלה אדומים', 'גוש עציון',
    'בית אל', 'אלונים', 'יוקנעם', 'מגדל העמק', 'נצרת עילית', 'נוף הגליל',
    # Regional councils
    'מטה בנימין', 'גוש עציון', 'חבל מודיעין', 'דרום השרון', 'עמק חפר',
    'עמק יזרעאל', 'מגידו', 'גליל עליון', 'גליל תחתון', 'גלבוע', 'בקעת בית שאן',
    'בקעת הירדן', 'מטה יהודה', 'שדות נגב', 'בני שמעון', 'אשכול', 'מעלה יוסף',
    'מטה אשר', 'משגב', 'מבואות החרמון', 'חוף הכרמל', 'יואב', 'לכיש',
    'דרום הר חברון', 'הר חברון', 'בנימין', 'שומרון',
]

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
    # Match longest first so "מטה בנימין" wins over "בנימין"
    for c in sorted(KNOWN_CITIES, key=len, reverse=True):
        if c in text:
            return c
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

    # City
    if not job.get('city', '').strip():
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
