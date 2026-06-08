"""
ממזג _scratch_igm.json + _scratch_itu.json → jobs-pending.json
- שומר את כל הממתינים הקיימים ב-jobs-pending.json (לא נמחקים)
- מוסיף משרות חדשות מ-scratch אם ה-id/URL לא קיימים בlive (jobs.json) ולא קיימים ב-pending הקיים
- מוחק את קבצי ה-scratch אחרי המיזוג
"""
import json, sys, io
from pathlib import Path
from datetime import date

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ROOT = Path(__file__).parent
LIVE = ROOT / 'jobs.json'
PENDING = ROOT / 'jobs-pending.json'
SCRATCH_FILES = ['_scratch_igm.json', '_scratch_itu.json']


def load_json(p, default=None):
    if not p.exists():
        return default if default is not None else {}
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def main():
    live = load_json(LIVE, {'jobs': []})
    pending = load_json(PENDING, {'scanned_at': '', 'total_pending': 0, 'by_source': {}, 'jobs': []})

    existing_ids = set()
    for j in live.get('jobs', []):
        if j.get('id'):
            existing_ids.add(j['id'])
    for j in pending.get('jobs', []):
        if j.get('id'):
            existing_ids.add(j['id'])
    # URL לא משמש לדה-דופ — מקורות igm/itu חולקים URL לכל המשרות בעמוד

    pending_jobs = list(pending.get('jobs', []))
    added_per_source = {}
    skipped_dup = 0
    total_in_scratch = 0

    for fname in SCRATCH_FILES:
        sp = ROOT / fname
        if not sp.exists():
            print(f'⚠ {fname} not found — skipping')
            continue
        data = load_json(sp)
        scratch_jobs = data.get('jobs', [])
        total_in_scratch += len(scratch_jobs)
        for job in scratch_jobs:
            jid = job.get('id', '')
            if jid in existing_ids:
                skipped_dup += 1
                continue
            pending_jobs.append(job)
            if jid:
                existing_ids.add(jid)
            src = job.get('source', 'unknown')
            added_per_source[src] = added_per_source.get(src, 0) + 1

    by_source = {}
    for j in pending_jobs:
        src = j.get('source', 'unknown')
        by_source[src] = by_source.get(src, 0) + 1

    new_pending = {
        'scanned_at': date.today().isoformat(),
        'total_pending': len(pending_jobs),
        'by_source': by_source,
        'jobs': pending_jobs,
    }

    with open(PENDING, 'w', encoding='utf-8') as f:
        json.dump(new_pending, f, ensure_ascii=False, indent=2)

    print(f'✓ jobs-pending.json updated: {len(pending_jobs)} total ({by_source})')
    print(f'  - scratch contained: {total_in_scratch} records')
    print(f'  - added new: {sum(added_per_source.values())} ({added_per_source})')
    print(f'  - skipped duplicates: {skipped_dup}')

    for fname in SCRATCH_FILES:
        sp = ROOT / fname
        if sp.exists():
            sp.unlink()
            print(f'  - removed {fname}')


if __name__ == '__main__':
    main()
