"""
ממזג את 3 מקורות המורים ל-teachers.json אחיד:
  - raw/igm-teachers.json (ארגון המורים — מאגר מורים מחפשי עבודה)
  - fb-teachers.json (פייסבוק — קבוצה 1)
  - fb-teachers-2.json (פייסבוק — קבוצה 2)
"""
import json, re, hashlib
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).parent
IGM_RAW_SRC = ROOT / 'raw' / 'igm-teachers.json'   # primary (raw)
IGM_PARSED_SRC = ROOT / 'teachers.json'             # fallback — pull existing igm entries
FB1_SRC = ROOT / 'fb-teachers.json'
FB2_SRC = ROOT / 'fb-teachers-2.json'
OUT = ROOT / 'teachers.json'

REGION_NORMALIZE = {
    'ירושלים והסביבה': 'ירושלים',
    'אזור ירושלים': 'ירושלים',
    'מרכז': 'מרכז', 'אזור המרכז': 'מרכז', 'מרכז הארץ': 'מרכז',
    'דרום': 'דרום', 'אזור הדרום': 'דרום',
    'צפון': 'צפון', 'אזור הצפון': 'צפון',
    'שפלה': 'שפלה', 'חיפה': 'צפון', 'אזור חיפה': 'צפון',
    'השרון': 'מרכז', 'השפלה': 'שפלה',
    'גוש דן': 'מרכז', 'אזור גוש דן': 'מרכז',
    'אזור ת"א': 'מרכז', 'תל אביב': 'מרכז',
}

CITY_TO_REGION = {
    # ירושלים
    'ירושלים': 'ירושלים', 'מבשרת ציון': 'ירושלים', 'מעלה אדומים': 'ירושלים',
    'גבעת זאב': 'ירושלים', 'מטה יהודה': 'ירושלים', 'מודיעין עילית': 'ירושלים',
    'בית שמש': 'שפלה',
    # מרכז
    'תל אביב': 'מרכז', 'תל אביב - יפו': 'מרכז', 'תל אביב-יפו': 'מרכז',
    'רמת גן': 'מרכז', 'גבעתיים': 'מרכז', 'בני ברק': 'מרכז',
    'הרצליה': 'מרכז', 'רעננה': 'מרכז', 'כפר סבא': 'מרכז', 'הוד השרון': 'מרכז',
    'רמת השרון': 'מרכז', 'פתח תקווה': 'מרכז', 'ראשון לציון': 'מרכז',
    'חולון': 'מרכז', 'בת ים': 'מרכז', 'נתניה': 'מרכז', 'רחובות': 'מרכז',
    'נס ציונה': 'מרכז', 'יבנה': 'מרכז', 'ראש העין': 'מרכז', 'יהוד': 'מרכז',
    'אור יהודה': 'מרכז', 'גני תקווה': 'מרכז', 'שוהם': 'מרכז',
    'קרית אונו': 'מרכז', 'קריית אונו': 'מרכז', 'אבן יהודה': 'מרכז',
    'כפר יונה': 'מרכז', 'אלעד': 'מרכז',
    'יהוד-מונוסון': 'מרכז', 'אום אל-פחם': 'מרכז',
    'באקה אל-גרביה': 'מרכז', 'פרדס חנה-כרכור': 'מרכז',
    # שפלה
    'מודיעין': 'שפלה', 'לוד': 'שפלה', 'רמלה': 'שפלה', 'גדרה': 'שפלה',
    'באר יעקב': 'שפלה', 'מודיעין-מכבים-רעות': 'שפלה',
    # דרום
    'אשדוד': 'דרום', 'אשקלון': 'דרום', 'באר שבע': 'דרום',
    'דימונה': 'דרום', 'אילת': 'דרום', 'נתיבות': 'דרום',
    'אופקים': 'דרום', 'שדרות': 'דרום', 'קרית גת': 'דרום', 'קריית גת': 'דרום',
    # צפון
    'חיפה': 'צפון', 'נצרת': 'צפון', 'נוף הגליל': 'צפון',
    'עכו': 'צפון', 'נהריה': 'צפון', 'טבריה': 'צפון', 'צפת': 'צפון',
    'כרמיאל': 'צפון', 'מגדל העמק': 'צפון', 'עפולה': 'צפון',
    'יקנעם עילית': 'צפון', 'יקנעם': 'צפון', 'בית שאן': 'צפון',
    'זכרון יעקב': 'צפון', 'חדרה': 'צפון', 'בנימינה': 'צפון',
    'מעלות תרשיחא': 'צפון', 'קרית שמונה': 'צפון',
    'קרית ביאליק': 'צפון', 'קרית ים': 'צפון', 'קרית מוצקין': 'צפון',
    'קרית אתא': 'צפון', 'קרית טבעון': 'צפון',
    'מזרעה': 'צפון', 'בוסתן הגליל': 'צפון', 'טורעאן': 'צפון',
    'טמרה': 'צפון', 'אבטליון': 'צפון', 'סכנין': 'צפון',
    'שפרעם': 'צפון', 'אעבלין': 'צפון',
    'חריש': 'מרכז',
    'העמקים': 'צפון', 'גליל תחתון': 'צפון', 'גליל עליון': 'צפון',
    'יזרעאל': 'צפון', 'עמק יזרעאל': 'צפון', 'עמק בית שאן': 'צפון',
}

LEVEL_NORMALIZE = {
    'יסודי': 'יסודי', 'בית ספר יסודי': 'יסודי', 'יסודית': 'יסודי',
    'חט"ב': 'חטיבת ביניים', 'חטב': 'חטיבת ביניים', 'חטיבת ביניים': 'חטיבת ביניים',
    'חטיבה': 'חטיבת ביניים',
    'תיכון': 'תיכון', 'על-יסודי': 'תיכון', 'על יסודי': 'תיכון',
    'גן': 'גן', 'גני ילדים': 'גן',
    'חינוך מיוחד': 'חינוך מיוחד', 'חנ"מ': 'חינוך מיוחד', 'חנמ': 'חינוך מיוחד',
}


def derive_level(text):
    t = text or ''
    if re.search(r'חינוך\s+מיוחד|חנ[״"\']מ', t): return 'חינוך מיוחד'
    if re.search(r'חט[״"\']ב|חטיבת\s+ביניים', t): return 'חטיבת ביניים'
    if re.search(r'יסודי', t): return 'יסודי'
    if re.search(r'תיכון|חטיבה\s+עליונה|בגרות', t): return 'תיכון'
    if re.search(r'גן\s+ילדים|גננת', t): return 'גן'
    return ''


def parse_area(area):
    """מחזיר (region, city) מתוך שדה area של פייסבוק.
    תומך ב-'מרכז / השרון', 'בני ברק', 'צפון / דרום', 'ראשון לציון והסביבה'."""
    if not area:
        return ('', '')
    # ניקוי תוספות: 'והסביבה', 'בלבד', סוגריים, מקפים
    cleaned = area
    cleaned = re.sub(r'\s*\([^)]*\)', ' ', cleaned)         # הסר סוגריים
    cleaned = re.sub(r'\s*[—–\-]\s*', ' / ', cleaned)        # מקף ארוך → מפריד
    cleaned = re.sub(r'\bוהסביבה\b|\bבלבד\b|\bקרוב\sל[^\s/,]*', ' ', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    parts = [p.strip() for p in re.split(r'[/,]', cleaned) if p.strip()]
    cities_found = []
    regions_found = []
    for p in parts:
        # עיר מדויקת
        if p in CITY_TO_REGION:
            cities_found.append(p)
            regions_found.append(CITY_TO_REGION[p])
            continue
        # אזור מדויק
        if p in REGION_NORMALIZE:
            regions_found.append(REGION_NORMALIZE[p])
            continue
        # נסיון התאמה חלקית — עיר בתוך p
        matched_city = False
        for city, reg in CITY_TO_REGION.items():
            if city in p:
                cities_found.append(city)
                regions_found.append(reg)
                matched_city = True
                break
        if matched_city:
            continue
        # נסיון התאמת אזור חלקית
        for key, val in REGION_NORMALIZE.items():
            if key in p:
                regions_found.append(val)
                break
    # ייחודיות בסדר הופעה
    def uniq(seq):
        seen = set(); out = []
        for x in seq:
            if x not in seen:
                seen.add(x); out.append(x)
        return out
    cities_found = uniq(cities_found)
    regions_found = uniq(regions_found)
    city = cities_found[0] if cities_found else ''
    if len(regions_found) == 0:
        region = ''
    elif len(regions_found) == 1:
        region = regions_found[0]
    else:
        region = regions_found  # מערך — matching.js תומך
    return (region, city)


def transform_igm():
    # Preferred: parse from raw if available
    if IGM_RAW_SRC.exists():
        with open(IGM_RAW_SRC, encoding='utf-8') as f:
            raw = json.load(f)
        out = []
        for t in raw['teachers']:
            ad_date = t.get('ad_date', '')
            m = re.match(r'(\d{2})/(\d{2})/(\d{4})', ad_date)
            date_iso = f'{m.group(3)}-{m.group(2)}-{m.group(1)}' if m else ''
            subject = (t.get('subject') or '').strip()
            out.append({
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
                'notes': '',
                'email': (t.get('email') or '').strip(),
                'phone': (t.get('phone') or '').strip(),
                'fb_url': '',
                'date': ad_date,
                'date_iso': date_iso,
                'url': raw.get('source_url', ''),
            })
        return out
    # Fallback: keep igm-source rows from existing teachers.json
    if not IGM_PARSED_SRC.exists():
        return []
    with open(IGM_PARSED_SRC, encoding='utf-8') as f:
        existing = json.load(f)
    return [t for t in existing.get('teachers', []) if t.get('source') == 'igm']


def transform_fb(src_path, src_id, src_name):
    if not src_path.exists():
        return []
    with open(src_path, encoding='utf-8') as f:
        raw = json.load(f)
    out = []
    for t in raw.get('teachers', []):
        subject = (t.get('subject') or '').strip()
        area = (t.get('area') or '').strip()
        level = (t.get('level') or '').strip()
        scope = (t.get('scope') or '').strip()
        notes = (t.get('notes') or '').strip()
        fb_url = (t.get('fb_url') or '').strip()
        region, city = parse_area(area)
        canon_level = LEVEL_NORMALIZE.get(level, level) or derive_level(subject + ' ' + notes)
        # id יציב על בסיס fb_url
        url_hash = hashlib.sha1((fb_url or (subject + area + notes)).encode('utf-8')).hexdigest()[:10]
        out.append({
            'id': f'{src_id}-{url_hash}',
            'source': src_id,
            'source_name': src_name,
            'name': '',
            'subject': subject,
            'level': canon_level,
            'region': region,
            'sub_area': area,
            'city': city,
            'scope': scope,
            'notes': notes,
            'email': '',
            'phone': '',
            'fb_url': fb_url,
            'date': raw.get('updated', ''),
            'date_iso': raw.get('updated', ''),
            'url': raw.get('source_url', ''),
        })
    return out


def main():
    igm = transform_igm()
    fb1 = transform_fb(FB1_SRC, 'fb1', 'פייסבוק · מאגר מורים 1')
    fb2 = transform_fb(FB2_SRC, 'fb2', 'פייסבוק · מאגר מורים 2')

    all_teachers = igm + fb1 + fb2

    # ייחודיות לפי id
    seen = set()
    unique = []
    for t in all_teachers:
        if t['id'] in seen:
            continue
        seen.add(t['id'])
        unique.append(t)

    unique.sort(key=lambda t: t.get('date_iso', ''), reverse=True)

    def region_str(r):
        if isinstance(r, list):
            return ' / '.join(r) if r else '(לא זוהה)'
        return r or '(לא זוהה)'

    by_region = Counter(region_str(t.get('region')) for t in unique)
    by_subject = Counter((t.get('subject') or '(לא זוהה)') for t in unique)
    by_source = Counter(t.get('source') for t in unique)

    out = {
        'updated_at': '2026-04-27',
        'total': len(unique),
        'by_source': dict(by_source),
        'by_region': dict(by_region),
        'by_subject': dict(by_subject.most_common(30)),
        'teachers': unique,
        'privacy_note': 'נתוני מורים אנונימיים — שמות, מיילים וטלפונים מוסתרים בצד הלקוח.',
    }
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f'Wrote {OUT.name} with {len(unique)} teachers (igm={len(igm)}, fb1={len(fb1)}, fb2={len(fb2)})')


if __name__ == '__main__':
    main()
