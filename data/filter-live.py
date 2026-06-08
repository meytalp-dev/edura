"""
מסיר מ-jobs.json משרות שפורסמו לפני יותר מ-4 שבועות,
ומריץ split-jobs-public.py לעדכון הקובץ הציבורי.

הרץ:  python data/filter-live.py
"""
import json, sys, io, subprocess
from datetime import date, timedelta
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ROOT = Path(__file__).parent
LIVE = ROOT / 'jobs.json'
BACKUP = ROOT / 'jobs.backup.json'

CUTOFF_DAYS = 28
TODAY = date.today()
CUTOFF = (TODAY - timedelta(days=CUTOFF_DAYS)).isoformat()


def main():
    data = json.loads(LIVE.read_text(encoding='utf-8'))
    jobs = data.get('jobs', [])
    original = len(jobs)

    BACKUP.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')

    kept = []
    removed = 0
    for j in jobs:
        d = (j.get('date_iso') or '').strip()
        if d and d < CUTOFF:
            removed += 1
            continue
        if not d:
            # בלי תאריך — נשמור (לא הוזכר במפורש להסיר)
            kept.append(j)
            continue
        kept.append(j)

    # Recompute aggregates
    by_source = {}
    by_region = {}
    by_role = {}
    by_level = {}
    by_sector = {}
    by_scope = {}
    by_subject = {}
    for j in kept:
        for field, agg in [
            ('source', by_source),
            ('region', by_region),
            ('role', by_role),
            ('level', by_level),
            ('sector', by_sector),
            ('scope', by_scope),
            ('subject', by_subject),
        ]:
            v = j.get(field, '') or ''
            agg[v] = agg.get(v, 0) + 1

    new_data = {
        'updated_at': TODAY.isoformat(),
        'total': len(kept),
        'by_source': by_source,
        'by_region': by_region,
        'by_role': by_role,
        'by_level': by_level,
        'by_sector': by_sector,
        'by_scope': by_scope,
        'by_subject': dict(sorted(by_subject.items(), key=lambda x: -x[1])[:20]),
        'jobs': kept,
    }

    LIVE.write_text(json.dumps(new_data, ensure_ascii=False, indent=2), encoding='utf-8')

    print(f'═══ סינון jobs.json (cutoff: {CUTOFF}) ═══')
    print(f'מתוך {original} משרות:')
    print(f'  ✓ נשארו: {len(kept)}')
    print(f'  ✗ הוסרו: {removed}')
    print(f'גיבוי נשמר ב-{BACKUP.name}')
    print()
    print('מפעיל split-jobs-public.py לעדכון הקובץ הציבורי...')
    result = subprocess.run([sys.executable, str(ROOT / 'split-jobs-public.py')], capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print('STDERR:', result.stderr)


if __name__ == '__main__':
    main()
