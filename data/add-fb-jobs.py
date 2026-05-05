"""
Add FB-scraped jobs to jobs-pending.json. Dedup by id + url against both files.
"""
import json
from pathlib import Path
from datetime import date

PENDING = Path(__file__).parent / 'jobs-pending.json'
LIVE = Path(__file__).parent / 'jobs.json'
TODAY = str(date.today())

# Jobs scraped from "דרושים - מורים מהלב" group on 5.5.2026
FB_JOBS = [
    {
        'post_id': '2117230688851926',
        'school': 'בית ספר מונטסורי יער',
        'subject': 'מחנך/ת',
        'role': 'מחנך/ת',
        'level': 'יסודי',
        'city': 'רמת השרון',
        'region': 'מרכז',
        'scope': 'מלאה',
        'email': 'Office@montessori-school.org.il',
        'phone': '',
        'snippet': 'בית ספר מונטסורי יער ברמת השרון מחפש מחנכת שותפה לתלתון בוגר (ד-ו). משרה מלאה. הדרכה הנחייה צמודה ועבודת צוות מעצימה.',
    },
    {
        'post_id': '2116894755552186',  # comment by אושרית פרץ
        'school': 'בית ספר אשכול',
        'subject': 'חינוך מיוחד',
        'role': 'מחנך/ת',
        'level': 'יסודי',
        'city': 'באר שבע',
        'region': 'דרום',
        'scope': '',
        'email': '',
        'phone': '0523948354',
        'snippet': 'בית ספר אשכול בבאר שבע מחפש מחנכות לכיתת חנ"מ תקשורת.',
        'contact_name': 'אושרית פרץ',
    },
    {
        'post_id': '2117119552196373',
        'school': 'חט"ב אלתרמן',
        'subject': 'אנגלית / מדעים / תרבות יהודית',
        'role': 'מורה',
        'level': 'חטיבת ביניים',
        'city': 'נתניה',
        'region': 'מרכז',
        'scope': '',
        'email': '',
        'phone': '052-8289550',
        'snippet': 'חטיבת ביניים "אלתרמן" נתניה מחפשת מורים להצטרף למשפחתנו. דרושים מורים לאנגלית, מדעים ותרבות יהודית-ישראלית.',
    },
    {
        'post_id': '2116057225635939',  # comment by שלומית פרנטה
        'school': 'בית ספר יסודי',
        'subject': 'מורה',
        'role': 'ממלא/ת מקום',
        'level': 'יסודי',
        'city': 'יהוד',
        'region': 'מרכז',
        'scope': 'חלקית',
        'email': '',
        'phone': '0546703066',
        'snippet': 'בבית ספר יסודי ביהוד דרושים ממלאי מקום.',
        'contact_name': 'שלומית פרנטה',
    },
    {
        'post_id': '2114950322413296',  # comment by Einat Vardi
        'school': 'תיכון עמית מן',
        'subject': 'חינוך מיוחד',
        'role': 'מורה',
        'level': 'תיכון',
        'city': 'פרדס חנה',
        'region': 'מרכז',
        'scope': '',
        'email': '',
        'phone': '',
        'snippet': 'בתיכון עמית מן בפרדס חנה מחפשים מורים לחינוך מיוחד לשנה הבאה.',
        'contact_name': 'Einat Vardi',
    },
    {
        'post_id': '2117054145536247',
        'school': 'בית ספר בן גוריון',
        'subject': 'חינוך מיוחד / מוסיקה',
        'role': 'מחנך/ת',
        'level': 'יסודי',
        'city': 'בת ים',
        'region': 'מרכז',
        'scope': 'מלאה',  # מורה למוסיקה - חצי משרה
        'email': 'Zofitrooo@gmail.com',
        'phone': '0523434380',
        'snippet': 'לבית ספר יסודי משפחתי וחמים דרושים: מחנכים ומורים עמיתים לכיתות חנ"מ, מורה למוסיקה (חצי משרה).',
    },
    {
        'post_id': '2117052655536396',
        'school': '',
        'subject': 'חינוך גופני',
        'role': 'מורה',
        'level': 'יסודי',
        'city': 'חולון',
        'region': 'מרכז',
        'scope': 'חלקית',  # חצי משרה
        'email': '',
        'phone': '',
        'snippet': 'מורה לחינוך גופני? יסודי בחולון מחפש אותך לשנת תשפ"ז לחצי משרה. פרטים בפרטי.',
        'contact_name': 'Tali Halili',
    },
    {
        'post_id': '2117044688870526',
        'school': 'הדרים',
        'subject': 'מחנך/ת',
        'role': 'מחנך/ת',
        'level': '',
        'city': '',
        'region': '',
        'scope': '',
        'email': '1002229481@educ.org.il',
        'phone': '052-4685058',
        'snippet': 'בית הספר "הדרים" מחפש מחנכת. אנו מחפשים מנהיגות חינוכית, ניהול כיתה מיטבי, יחסי אנוש מעולים, רצון להתפתח.',
        'contact_name': 'מיה',
    },
    {
        'post_id': '2117044045537257',
        'school': 'מועצה אזורית אשכול',
        'subject': 'מיומנויות למידה',
        'role': 'מורה / מדריך/ה',
        'level': 'יסודי',
        'city': 'אשכול',
        'region': 'דרום',
        'scope': 'חלקית',
        'email': '',
        'phone': '',
        'snippet': 'דרושים/ות מורים/ות ומדריכים/ות לפרויקט חינוכי במועצה אזורית אשכול. הוראת מיומנויות למידה לתלמידי כיתות ו׳. תאריכים: 17-31.5.',
        'contact_name': 'May Asulin',
    },
    {
        'post_id': '2117032055538456',
        'school': '',
        'subject': 'אנגלית',
        'role': 'מורה / מדריך/ה',
        'level': 'תיכון',
        'city': 'חולון',
        'region': 'מרכז',
        'scope': 'חלקית',  # פעמיים עד 4 בשבוע
        'email': '',
        'phone': '',
        'snippet': 'דרושים/ות מורים/ות ומדריכים/ות עם שליחות לעבודה משמעותית עם נוער בסיכון. תגבור והכנה לבגרות באנגלית. מיקום: חולון. פעמיים עד 4 פעמים בשבוע, 8:40-13:40.',
        'contact_name': 'May Asulin',
    },
    {
        'post_id': '2117019295539732',
        'school': '',
        'subject': 'פיזיקה',
        'role': 'מורה / מדריך/ה',
        'level': 'תיכון',
        'city': 'מעלה אדומים',
        'region': 'ירושלים',
        'scope': 'חלקית',  # ימי שישי בלבד
        'email': '',
        'phone': '',
        'snippet': 'דרושים/ות מורים/ות ומדריכים/ות למעלה אדומים. הוראת פיזיקה לבגרות - שיעורי תגבור. ימי שישי 8:00-12:00. שכר מתגמל למתאימים/ות.',
        'contact_name': 'May Asulin',
    },
]


def main():
    pending = json.loads(PENDING.read_text(encoding='utf-8'))
    live = json.loads(LIVE.read_text(encoding='utf-8'))

    existing_ids = {j.get('id', '') for j in pending['jobs']} | {j.get('id', '') for j in live['jobs']}
    existing_urls = {j.get('url', '') for j in pending['jobs']} | {j.get('url', '') for j in live['jobs']}

    added = 0
    skipped = 0
    new_records = []
    for fb in FB_JOBS:
        post_id = fb['post_id']
        rec_id = f'fb-{post_id}'
        url = f'https://www.facebook.com/groups/852268618681479/posts/{post_id}/'
        if rec_id in existing_ids or url in existing_urls:
            skipped += 1
            print(f'Skipped (duplicate): {rec_id}')
            continue

        record = {
            'id': rec_id,
            'source': 'fb',
            'source_name': 'דרושים - מורים מהלב',
            'school': fb.get('school', ''),
            'title': '',  # buildJobTitle handles this from subject
            'subject': fb.get('subject', ''),
            'role': fb.get('role', ''),
            'level': fb.get('level', ''),
            'sector': '',
            'region': fb.get('region', ''),
            'sub_area': '',
            'city': fb.get('city', ''),
            'scope': fb.get('scope', ''),
            'contact_name': fb.get('contact_name', ''),
            'email': fb.get('email', ''),
            'phone': fb.get('phone', ''),
            'date': TODAY,
            'date_iso': TODAY,
            'snippet': fb.get('snippet', ''),
            'description': fb.get('snippet', ''),
            'url': url,
            '_scanned_at': TODAY,
        }
        new_records.append(record)
        added += 1

    # Prepend new records to pending jobs
    pending['jobs'] = new_records + pending['jobs']
    pending['total_pending'] = len(pending['jobs'])
    # Recompute by_source
    from collections import Counter
    by_src = Counter()
    for j in pending['jobs']:
        by_src[j.get('source', '')] += 1
    pending['by_source'] = dict(by_src.most_common())
    pending['scanned_at'] = TODAY

    PENDING.write_text(json.dumps(pending, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'\nAdded: {added} | Skipped: {skipped} | Total pending now: {pending["total_pending"]}')


if __name__ == '__main__':
    main()
