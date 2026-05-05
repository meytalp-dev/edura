"""
Build initial teachers-pending.json with 7 teachers scraped from
'דרושים - מורים מהלב' FB group on 5.5.2026. Each record carries fb_url to original post.
"""
import json
import hashlib
from pathlib import Path
from datetime import date

PENDING = Path(__file__).parent / 'teachers-pending.json'
LIVE = Path(__file__).parent / 'teachers.json'
GROUP_ID = '852268618681479'
TODAY = str(date.today())


def fb_url(post_id):
    return f'https://www.facebook.com/groups/{GROUP_ID}/posts/{post_id}/'


def make_id(post_id, name):
    if not name or name.startswith('חבר אנונימי') or '_' in name or any(c.isdigit() for c in name):
        # anonymous — derive id from post + handle
        h = hashlib.sha1((post_id + (name or '')).encode('utf-8')).hexdigest()[:10]
        return f'fb-mlb-{h}'
    return f'fb-mlb-{post_id}'


# Teachers seeking work, scraped 2026-05-05
TEACHERS = [
    {
        'name': 'שולמית ג.',
        'subject': 'חינוך מיוחד / מורת שילוב',
        'level': 'יסודי / חטיבת ביניים',
        'region': 'ירושלים',
        'city': '',
        'scope': '',
        'notes': 'תואר ראשון בחינוך מיוחד. ניסיון בחטיבה וביסודי. מעוניינת במשרה מורת שילוב (או מחנכת) באזור ירושלים.',
        'post_id': '2116409532267375',
        'date_iso': '2026-05-04',  # "לפני 1 ימים"
    },
    {
        'name': 'חבר אנונימי 683',
        'subject': 'מורת שילוב',
        'level': '',
        'region': '',
        'city': '',
        'scope': 'מלאה',
        'notes': 'מחפשת משרת שילוב (מורת שילוב — משרה מלאה) לשנת הלימודים הבאה.',
        'post_id': '2117195078855487',
        'date_iso': '2026-05-05',
    },
    {
        'name': 'Shira Reshef',
        'subject': 'היסטוריה / ספרות',
        'level': '',
        'region': 'מרכז',
        'city': 'תל אביב',
        'scope': '',
        'notes': 'מורה להיסטוריה וספרות עם ותק 3 שנים, מחפשת משרה בתל אביב.',
        'post_id': '2116679895573672',
        'date_iso': '2026-05-05',
    },
    {
        'name': 'LoyalFrog3621',
        'subject': 'חינוך מיוחד',
        'level': '',
        'region': 'דרום',
        'city': 'באר שבע',
        'scope': '',
        'notes': 'מחפש משרה בחינוך מיוחד באזור הדרום באר שבע והסביבה.',
        'post_id': '2116685912239737',
        'date_iso': '2026-05-05',
    },
    {
        'name': 'LovelyFlamingo1480',
        'subject': 'אזרחות',
        'level': 'חטיבת ביניים',
        'region': 'צפון',
        'city': 'קריות',
        'scope': 'חלקית',  # "שליש משרה"
        'notes': 'חיפוש שליש משרה בהוראת אזרחות בקריות בלבד, בצפון, חט"ב לשנה הבאה.',
        'post_id': '2116056335636028',
        'date_iso': '2026-05-04',
    },
    {
        'name': 'מרים',
        'subject': 'חינוך מיוחד',
        'level': '',
        'region': '',
        'city': '',
        'scope': '',
        'notes': 'מחנכת בחינוך המיוחד והרגיל, ספורטאית. מחפשת בית לשנת הלימודים הבאה אחרי שנה אינטנסיבית בחינוך המיוחד המורכב. עבודה מהלב, יכולת בניית קשר אישי עם תלמידים והפיכת הורים לשותפים.',
        'post_id': '2116988338876161',
        'date_iso': '2026-05-05',
    },
    {
        'name': 'Rahaf Dagash',
        'subject': 'ייעוץ חינוכי / חינוך מיוחד',
        'level': '',
        'region': 'צפון',
        'city': '',
        'scope': '',
        'notes': 'בת 24, תואר ראשון בייעוץ חינוכי וחינוך מיוחד + תעודת הוראה. מחפשת משרת סטאז׳ בחינוך המיוחד בצפון.',
        'post_id': '2116974758877519',
        'date_iso': '2026-05-05',
    },
]


def main():
    live = json.loads(LIVE.read_text(encoding='utf-8')) if LIVE.exists() else {'teachers': []}
    pending_existing = json.loads(PENDING.read_text(encoding='utf-8')) if PENDING.exists() else {'teachers': []}

    existing_ids = {t.get('id', '') for t in live.get('teachers', [])} | {t.get('id', '') for t in pending_existing.get('teachers', [])}
    existing_urls = {t.get('url', '') for t in live.get('teachers', [])} | {t.get('fb_url', '') for t in live.get('teachers', [])}

    new_records = []
    skipped = 0
    for t in TEACHERS:
        rec_id = make_id(t['post_id'], t['name'])
        url = fb_url(t['post_id'])
        if rec_id in existing_ids or url in existing_urls:
            skipped += 1
            continue
        record = {
            'id': rec_id,
            'source': 'fb-mlb',
            'source_name': 'פייסבוק · דרושים מורים מהלב',
            'name': t.get('name', ''),
            'subject': t.get('subject', ''),
            'level': t.get('level', ''),
            'region': t.get('region', ''),
            'sub_area': t.get('city', ''),
            'city': t.get('city', ''),
            'scope': t.get('scope', ''),
            'notes': t.get('notes', ''),
            'email': '',
            'phone': '',
            'fb_url': url,
            'date': t.get('date_iso', TODAY),
            'date_iso': t.get('date_iso', TODAY),
            'url': url,
            '_scanned_at': TODAY,
        }
        new_records.append(record)

    # Merge with existing pending (prepend new)
    all_pending = new_records + pending_existing.get('teachers', [])

    # Aggregate
    from collections import Counter
    by_src = Counter()
    for t in all_pending:
        by_src[t.get('source', '')] += 1

    out = {
        'scanned_at': TODAY,
        'total_pending': len(all_pending),
        'by_source': dict(by_src.most_common()),
        'teachers': all_pending,
    }
    PENDING.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Added: {len(new_records)} | Skipped: {skipped} | Total pending teachers: {len(all_pending)}')


if __name__ == '__main__':
    main()
