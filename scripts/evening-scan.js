#!/usr/bin/env node
// Edura · Evening Scan
// ──────────────────────────────────────────────────
// סורק את הדאטה הנוכחי, משווה לסנאפשוט מהפעם הקודמת, מזהה משרות+מורים
// חדשים שנוספו מאז, מחשב את המאצ'ים החדשים ביותר, וכותב ל-data/scan-fresh.json
// כדי שהדף admin/matches.html יציג סימון "🆕 חדש".
//
// להפעלה ידנית: node scripts/evening-scan.js
// ──────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const SUBMISSIONS_URL = 'https://script.google.com/macros/s/AKfycbwleldcwH8c5k9OZ8EMDIKZ8veRbrtO1M7XwYFWg7HHbEV-SrZkLTElbFRiq4cHPlyarw/exec?action=approved';
const OUTPUT = path.join(ROOT, 'data', 'scan-fresh.json');

// load matching engines (UMD-style — they attach to globalThis)
require(path.join(ROOT, 'matching.js'));
require(path.join(ROOT, 'region-zones.js'));
const M = globalThis.EduraMatch;
const Z = globalThis.EduraZones;

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { return fallback; }
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      // Apps Script redirects — follow once
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetch(res.headers.location).then(resolve, reject);
      }
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { resolve({ ok: false, jobs: [], teachers: [] }); }
      });
    }).on('error', reject);
  });
}

function nsj(r) {
  const ts = r.timestamp || '';
  const dateIso = ts ? String(ts).slice(0, 10) : '';
  return {
    id: r.ref_id, source: 'submitted',
    title: (r.subject ? r.subject + ' · ' : '') + (r.school || ''),
    school: r.school || '', subject: r.subject || '', role: r.role || '',
    region: r.region || '', city: r.city || '', level: r.level || '',
    scope: r.scope || '', email: r.email || '', phone: r.phone || '',
    contact_name: r.contact_name || '', date_iso: dateIso
  };
}
function nst(r) {
  const ts = r.timestamp || '';
  const dateIso = ts ? String(ts).slice(0, 10) : '';
  return {
    id: r.ref_id, source: 'submitted', name: r.name || '',
    subject: r.subject || '', level: r.level || '',
    region: r.region || '', city: r.city || '', scope: r.scope || '',
    email: r.email || '', phone: r.phone || '', date_iso: dateIso
  };
}
function deriveRegion(area) {
  if (/ירושלים|בית\s*שמש|מבשרת/.test(area)) return 'ירושלים';
  if (/באר\s*שבע|אשדוד|אשקלון|נגב|דרום|דימונה|ערד|קריית\s*גת|קרית\s*גת|אילת/.test(area)) return 'דרום';
  if (/חיפה|נשר|טבעון|קריות|כרמיאל|צפת|עכו|נצרת|עפולה|חריש|חדרה|פרדס\s*חנה|ואדי\s*ערה|צפון|טבריה|גליל|כרמל/.test(area)) return 'צפון';
  return 'מרכז';
}
function nfb(t, i, sn) {
  return {
    id: 'fb-' + sn + '-' + i, source: 'facebook', source_name: sn,
    name: '', subject: t.subject || '', level: t.level || '',
    region: deriveRegion(t.area || ''), sub_area: t.area || '',
    city: '', scope: t.scope || '', notes: t.notes || '',
    email: '', phone: '', url: t.fb_url || ''
  };
}

function splitC(c) {
  if (!c) return [];
  return String(c).split(/[,/|]/).map(s => s.trim()).filter(Boolean);
}
function locationTier(teacher, job) {
  const tCities = splitC(teacher.city);
  const jCities = splitC(job.city);
  let best = null;
  for (const tc of tCities) for (const jc of jCities) {
    const tier = Z.locationTier(tc, jc);
    if (tier === 'same-city') return 'same-city';
    if (tier === 'same-zone' && best !== 'same-city') best = 'same-zone';
  }
  return best;
}

(async () => {
  const startedAt = new Date().toISOString();
  console.log('[evening-scan] starting at', startedAt);

  // 1. Load all data sources
  const jobsData = readJson(path.join(ROOT, 'data', 'jobs.json'), { jobs: [] });
  const teachersData = readJson(path.join(ROOT, 'data', 'teachers.json'), { teachers: [] });
  const fb1 = readJson(path.join(ROOT, 'data', 'fb-teachers.json'), { teachers: [] });
  const fb2 = readJson(path.join(ROOT, 'data', 'fb-teachers-2.json'), { teachers: [] });
  console.log('[evening-scan] fetching live submissions feed...');
  const submitted = await fetch(SUBMISSIONS_URL).catch(() => ({ jobs: [], teachers: [] }));

  const ALL_JOBS = [
    ...(submitted.jobs || []).map(nsj),
    ...(jobsData.jobs || [])
  ];
  const ALL_TEACHERS = [
    ...(submitted.teachers || []).map(nst),
    ...(teachersData.teachers || []),
    ...(fb1.teachers || []).map((t, i) => nfb(t, i, 'fb1')),
    ...(fb2.teachers || []).map((t, i) => nfb(t, i, 'fb2'))
  ];
  console.log('[evening-scan] loaded', ALL_JOBS.length, 'jobs and', ALL_TEACHERS.length, 'teachers');

  // 2. Compare to previous snapshot
  const prev = readJson(OUTPUT, null);
  const prevJobIds = new Set((prev && prev.snapshot && prev.snapshot.job_ids) || []);
  const prevTeacherIds = new Set((prev && prev.snapshot && prev.snapshot.teacher_ids) || []);
  const isFirstRun = !prev;

  const currentJobIds = ALL_JOBS.map(j => j.id).filter(Boolean);
  const currentTeacherIds = ALL_TEACHERS.map(t => t.id).filter(Boolean);

  const newJobs = ALL_JOBS.filter(j => j.id && !prevJobIds.has(j.id));
  const newTeachers = ALL_TEACHERS.filter(t => t.id && !prevTeacherIds.has(t.id));

  if (isFirstRun) {
    console.log('[evening-scan] first run — initializing snapshot, no diff to report');
  } else {
    console.log('[evening-scan] new since last scan: ' + newJobs.length + ' jobs, ' + newTeachers.length + ' teachers');
  }

  // 3. Compute matches involving new items
  const newMatches = [];
  function addMatch(teacher, job, why) {
    const score = M.scoreMatch(teacher, job);
    if (score < M.MIN_SCORE) return;
    const tier = locationTier(teacher, job);
    if (!tier) return;
    newMatches.push({
      teacher_id: teacher.id || teacher.name,
      teacher_name: teacher.name || '',
      teacher_subject: teacher.subject || '',
      teacher_level: teacher.level || '',
      teacher_city: teacher.city || teacher.sub_area || '',
      job_id: job.id,
      job_title: job.title || '',
      job_subject: job.subject || '',
      job_level: job.level || '',
      job_city: job.city || '',
      score, tier,
      why // 'new-job' / 'new-teacher' / 'both-new'
    });
  }
  // Match each new job against ALL teachers
  newJobs.forEach(j => ALL_TEACHERS.forEach(t => addMatch(t, j, prevTeacherIds.has(t.id) ? 'new-job' : 'both-new')));
  // Match each new teacher against ALL jobs (avoid double-counting both-new which already added above)
  const seenPairs = new Set(newMatches.map(m => m.teacher_id + '|' + m.job_id));
  newTeachers.forEach(t => ALL_JOBS.forEach(j => {
    if (newJobs.find(nj => nj.id === j.id)) return; // job is new — already covered
    const key = (t.id || t.name) + '|' + j.id;
    if (seenPairs.has(key)) return;
    addMatch(t, j, 'new-teacher');
  }));
  newMatches.sort((a, b) => b.score - a.score);

  // 4. Write output (only if changed or first run)
  const out = {
    scanned_at: startedAt,
    is_first_run: isFirstRun,
    snapshot: {
      job_ids: currentJobIds,
      teacher_ids: currentTeacherIds
    },
    diff: {
      new_jobs_count: newJobs.length,
      new_teachers_count: newTeachers.length,
      new_matches_count: newMatches.length,
      new_job_ids: newJobs.map(j => j.id),
      new_teacher_ids: newTeachers.map(t => t.id),
      // top 50 matches with full info for the dashboard banner
      top_matches: newMatches.slice(0, 50)
    }
  };
  fs.writeFileSync(OUTPUT, JSON.stringify(out, null, 2), 'utf8');
  console.log('[evening-scan] wrote', OUTPUT);

  // 5. Console report
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('  סקירת ערב — אדורה');
  console.log('═══════════════════════════════════════');
  console.log('הופעל:', startedAt);
  if (isFirstRun) {
    console.log('זה הסריקה הראשונה — אין השוואה. הסנאפשוט נשמר לפעם הבאה.');
    console.log('סה"כ במאגר: ' + ALL_JOBS.length + ' משרות, ' + ALL_TEACHERS.length + ' מורים.');
  } else {
    console.log('משרות חדשות: ' + newJobs.length);
    console.log('מורות חדשות: ' + newTeachers.length);
    console.log('מאצ"ים חדשים שמתאימים לסינון הקשיח: ' + newMatches.length);
    if (newMatches.length > 0) {
      console.log('');
      console.log('--- 5 ההתאמות החדשות הטובות ביותר ---');
      newMatches.slice(0, 5).forEach((m, i) => {
        console.log((i + 1) + '. ' + (m.teacher_name || m.teacher_id) + ' (' + m.teacher_subject + ', ' + m.teacher_city + ')');
        console.log('   ↔ ' + (m.job_title || m.job_id).slice(0, 60));
        console.log('   ' + m.tier + ' · score=' + m.score + ' · סיבה: ' + m.why);
      });
    }
  }
  console.log('═══════════════════════════════════════');
  console.log('דשבורד: https://edura.co.il/admin/matches.html');
})().catch(err => { console.error(err); process.exit(1); });
