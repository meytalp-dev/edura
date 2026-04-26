"""
ממיר את raw/igm-teachers.json ל-teachers.json עם schema אחיד.
"""
import json, re
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / 'raw' / 'igm-teachers.json'
OUT = ROOT / 'teachers.json'

REGION_NORMALIZE = {
    'ירושלים והסביבה': 'ירושלים',
    'מרכז': 'מרכז', 'דרום': 'דרום', 'צפון': 'צפון',
    'שפלה': 'שפלה', 'חיפה': 'צפון',
}


def derive_level(text):
    t = text or ''
    if re.search(r'חינוך\s+מיוחד|חנ[״"\']מ', t): return 'חינוך מיוחד'
    if re.search(r'חט[״"\']ב|חטיבת\s+ביניים', t): return 'חטיבת ביניים'
    if re.search(r'יסודי', t): return 'יסודי'
    if re.search(r'תיכון|חטיבה\s+עליונה|בגרות', t): return 'תיכון'
    if re.search(r'גן\s+ילדים|גננת', t): return 'גן'
    return ''


def main():
    with open(SRC, encoding='utf-8') as f:
        raw = json.load(f)

    teachers = []
    for t in raw['teachers']:
        ad_date = t.get('ad_date', '')
        m = re.match(r'(\d{2})/(\d{2})/(\d{4})', ad_date)
        date_iso = f'{m.group(3)}-{m.group(2)}-{m.group(1)}' if m else ''
        subject = (t.get('subject') or '').strip()
        teachers.append({
            'id': f'igm-t-{t.get("id")}',
            'source': 'igm',
            'source_name': 'ארגון המורים',
            'name': (t.get('fullname') or '').strip(),
            'subject': subject,
            'level': derive_level(subject + ' ' + (t.get('job_length') or '')),
            'region': REGION_NORMALIZE.get(t.get('location_heb_title', ''), t.get('location_heb_title', '')),
            'sub_area': t.get('sub_area', ''),
            'city': (t.get('city') or '').strip(),
            'scope': (t.get('job_length') or '').strip(),
            'email': (t.get('email') or '').strip(),
            'phone': (t.get('phone') or '').strip(),
            'date': ad_date,
            'date_iso': date_iso,
            'url': raw.get('source_url', ''),
        })

    teachers.sort(key=lambda t: t.get('date_iso', ''), reverse=True)

    from collections import Counter
    by_region = Counter(t['region'] or '(לא זוהה)' for t in teachers)
    by_subject = Counter(t['subject'] or '(לא זוהה)' for t in teachers)

    out = {
        'updated_at': '2026-04-26',
        'total': len(teachers),
        'by_region': dict(by_region),
        'by_subject': dict(by_subject.most_common(20)),
        'teachers': teachers,
    }
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f'Wrote {OUT.name} with {len(teachers)} teachers')


if __name__ == '__main__':
    main()
