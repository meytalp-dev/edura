"""
מסנן את jobs-pending.json לפי הקריטריונים של מיטל (8.6.2026):

1. הסר משרות שפורסמו לפני יותר מ-4 שבועות (date_iso < cutoff)
2. הסר משרות בלי עיר (cleanup-pending.py כבר ניסה להשלים)
3. הסר משרות בלי מקצוע
4. הסר משרות בלי שם בית ספר
5. הסר משרות בלי פרטי קשר (לא email וגם לא phone)
6. הסר את השדות: source, source_name, url, sub_area מכל משרה

הרץ:  python data/filter-pending.py
"""
import json, sys, io
from datetime import date, timedelta
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PENDING = Path(__file__).parent / 'jobs-pending.json'
BACKUP = Path(__file__).parent / 'jobs-pending.backup.json'

CUTOFF_DAYS = 28
TODAY = date.today()
CUTOFF = (TODAY - timedelta(days=CUTOFF_DAYS)).isoformat()  # YYYY-MM-DD

STRIP_FIELDS = ['source', 'source_name', 'url', 'sub_area']


def main():
    data = json.loads(PENDING.read_text(encoding='utf-8'))
    jobs = data.get('jobs', [])
    original_count = len(jobs)

    # Backup before destructive change
    BACKUP.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')

    kept = []
    reasons = {
        'too_old': 0,
        'no_city': 0,
        'no_subject': 0,
        'no_school': 0,
        'no_contact': 0,
    }
    removed_samples = {k: [] for k in reasons}

    for job in jobs:
        # 1. Date filter — drop anything older than CUTOFF
        d = (job.get('date_iso') or '').strip()
        if d and d < CUTOFF:
            reasons['too_old'] += 1
            if len(removed_samples['too_old']) < 3:
                removed_samples['too_old'].append(f"{job.get('id')} ({d})")
            continue

        # 2. Missing city
        city = (job.get('city') or '').strip()
        if not city:
            reasons['no_city'] += 1
            if len(removed_samples['no_city']) < 3:
                removed_samples['no_city'].append(f"{job.get('id')} — {job.get('title','')[:40]}")
            continue

        # 3. Missing subject
        subject = (job.get('subject') or '').strip()
        if not subject:
            reasons['no_subject'] += 1
            if len(removed_samples['no_subject']) < 3:
                removed_samples['no_subject'].append(f"{job.get('id')} — {city} · {job.get('school','')[:30]}")
            continue

        # 4. Missing school
        school = (job.get('school') or '').strip()
        if not school:
            reasons['no_school'] += 1
            if len(removed_samples['no_school']) < 3:
                removed_samples['no_school'].append(f"{job.get('id')} — {city} · {subject}")
            continue

        # 5. Missing contact (need at least one: email or phone)
        email = (job.get('email') or '').strip()
        phone = (job.get('phone') or '').strip()
        if not email and not phone:
            reasons['no_contact'] += 1
            if len(removed_samples['no_contact']) < 3:
                removed_samples['no_contact'].append(f"{job.get('id')} — {city} · {school[:30]}")
            continue

        # 6. Strip source/url fields
        for f in STRIP_FIELDS:
            if f in job:
                del job[f]

        kept.append(job)

    # Rebuild aggregates from id prefix (since source field was stripped)
    by_source = {}
    by_region = {}
    by_level = {}
    by_subject = {}
    for j in kept:
        src = (j.get('id', '').split('-', 1)[0]) or 'unknown'
        by_source[src] = by_source.get(src, 0) + 1
        r = j.get('region') or '(לא זוהה)'
        by_region[r] = by_region.get(r, 0) + 1
        l = j.get('level') or '(לא זוהה)'
        by_level[l] = by_level.get(l, 0) + 1
        s = j.get('subject') or '(לא זוהה)'
        by_subject[s] = by_subject.get(s, 0) + 1

    new_data = {
        'scanned_at': data.get('scanned_at', TODAY.isoformat()),
        'filtered_at': TODAY.isoformat(),
        'cutoff_date': CUTOFF,
        'total_pending': len(kept),
        'by_source': by_source,
        'by_region': by_region,
        'by_level': by_level,
        'by_subject': dict(sorted(by_subject.items(), key=lambda x: -x[1])[:20]),
        'jobs': kept,
    }

    PENDING.write_text(json.dumps(new_data, ensure_ascii=False, indent=2), encoding='utf-8')

    total_removed = sum(reasons.values())
    print(f'═══ סינון jobs-pending.json (cutoff: {CUTOFF}) ═══')
    print(f'מתוך {original_count} משרות:')
    print(f'  ✓ נשארו: {len(kept)}')
    print(f'  ✗ הוסרו: {total_removed}')
    print()
    print('סיבות להסרה:')
    for reason, count in reasons.items():
        label = {
            'too_old': f'ישנות (לפני {CUTOFF})',
            'no_city': 'בלי עיר',
            'no_subject': 'בלי מקצוע',
            'no_school': 'בלי שם בית ספר',
            'no_contact': 'בלי פרטי קשר',
        }[reason]
        print(f'  · {label}: {count}')
        for s in removed_samples[reason]:
            print(f'      {s}')
    print()
    print(f'משרות שנשארו לפי מקור: {by_source}')
    print(f'משרות שנשארו לפי אזור: {by_region}')
    print(f'גיבוי נשמר ב-{BACKUP.name}')


if __name__ == '__main__':
    main()
