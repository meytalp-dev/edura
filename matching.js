// Edura matching engine — match teachers ↔ jobs by subject + region + level (+ city must match if both have one)
// Usage:
//   const matches = findJobsForTeacher(teacher, allJobs);   // sorted, score >= MIN
//   const matches = findTeachersForJob(job, allTeachers);   // sorted, score >= MIN

(function (root) {
  'use strict';

  const MIN_SCORE = 50;

  // Level synonyms — group equivalent stage names (יסודי/חט"ב/תיכון/גן)
  const LEVEL_SYNONYMS = [
    ['יסודי', 'בית ספר יסודי', 'יסודית'],
    ['חטיבת ביניים', 'חט"ב', 'חטב', 'חטיבה', 'חטיבת-ביניים'],
    ['תיכון', 'על-יסודי', 'על יסודי', 'תיכונית'],
    ['גן', 'גני ילדים', 'גן ילדים', 'גנים'],
    ['חינוך מיוחד', 'חנ"מ', 'חנמ'],
  ];

  const _levelKey = (() => {
    const map = new Map();
    LEVEL_SYNONYMS.forEach(group => {
      const canonical = group[0];
      group.forEach(s => map.set(normalizeText(s), canonical));
    });
    return map;
  })();

  function canonicalLevel(level) {
    const norm = normalizeText(level);
    if (!norm) return '';
    return _levelKey.get(norm) || norm;
  }

  // Subject synonyms — group equivalent subject names so spelling/aliasing don't break matches
  const SUBJECT_SYNONYMS = [
    ['מתמטיקה', 'מתימטיקה', 'חשבון'],
    ['פיזיקה', 'פיסיקה'],
    ['תנ"ך', 'תנך', 'תנ"ך/תושב"ע', 'תושב"ע', 'תושבע'],
    ['מדעים', 'מדע וטכנולוגיה', 'מדע ותכנולוגיה'],
    ['מדעי המחשב', 'מחשבים', 'תקשוב'],
    ['חינוך מיוחד', 'חנ"מ', 'חנמ'],
    ['יועצ/ת חינוכי/ת', 'יועץ/ת', 'יועץ', 'יועצת', 'ייעוץ'],
    ['חינוך גופני', 'חנ"ג', 'חינוך גופני בנות', 'חינוך גופני בנים'],
    ['מחנך/ת', 'מחנך/מחנכת', 'מחנכים/ות', 'מחנכת', 'מחנך'],
  ];

  // Generic teacher labels — don't auto-match all subjects, treat as "no specific subject"
  const GENERIC_SUBJECTS = new Set(['מורה', 'מורים', 'כללי', 'אחר', '']);

  // Region neighbors — partial match score for adjacent regions
  const REGION_NEIGHBORS = {
    'מרכז': ['שפלה'],
    'שפלה': ['מרכז', 'דרום'],
    'דרום': ['שפלה'],
    'ירושלים': ['שפלה'],
  };

  // Build a normalized → canonical-key map for fast lookup
  const _subjectKey = (() => {
    const map = new Map();
    SUBJECT_SYNONYMS.forEach(group => {
      const canonical = group[0];
      group.forEach(s => map.set(normalizeText(s), canonical));
    });
    return map;
  })();

  function normalizeText(s) {
    return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function canonicalSubject(subject) {
    const norm = normalizeText(subject);
    if (!norm) return '';
    return _subjectKey.get(norm) || norm;
  }

  function isGenericSubject(subject) {
    return GENERIC_SUBJECTS.has(normalizeText(subject));
  }

  function asRegionArr(x) {
    if (Array.isArray(x)) {
      return x.map(v => String(v || '').trim()).filter(Boolean);
    }
    const s = String(x || '').trim();
    return s ? [s] : [];
  }

  function regionScore(rA, rB) {
    const arrA = asRegionArr(rA);
    const arrB = asRegionArr(rB);
    if (!arrA.length || !arrB.length) return 0;
    for (const a of arrA) {
      if (arrB.indexOf(a) !== -1) return 30;
    }
    for (const a of arrA) {
      const neighbors = REGION_NEIGHBORS[a] || [];
      for (const n of neighbors) {
        if (arrB.indexOf(n) !== -1) return 15;
      }
    }
    return 0;
  }

  function subjectScore(sA, sB) {
    if (isGenericSubject(sA) || isGenericSubject(sB)) return 0;
    const cA = canonicalSubject(sA);
    const cB = canonicalSubject(sB);
    if (!cA || !cB) return 0;
    if (cA === cB) return 60;
    if (cA.includes(cB) || cB.includes(cA)) return 40;
    return 0;
  }

  function cityBonus(cA, cB) {
    const a = normalizeText(cA);
    const b = normalizeText(cB);
    if (!a || !b) return 0;
    return a === b ? 10 : 0;
  }

  // City is a sort bonus only — the matching unit is region.
  // מורה שהצהיר אזור = מוכן לנסוע באזור. עיר היא איפה שהוא גר, לא איפה שהוא חייב לעבוד.
  function cityCompatible() {
    return true;
  }

  // Level must match if both sides specify one (יסודי≠תיכון).
  // If either side is missing — don't penalize (lots of jobs/teachers don't tag level).
  function levelCompatible(lA, lB) {
    const a = canonicalLevel(lA);
    const b = canonicalLevel(lB);
    if (!a || !b) return true;
    return a === b;
  }

  function scoreMatch(teacher, job) {
    const subj = subjectScore(teacher.subject, job.subject);
    if (subj === 0) return 0;
    // אזור הוא חובה: בלי חפיפה אזורית/שכנה — אין התאמה, גם אם המקצוע זהה
    const reg = regionScore(teacher.region, job.region);
    if (reg === 0) return 0;
    // שכבה חובה אם שני הצדדים ציינו (יסודי≠תיכון)
    if (!levelCompatible(teacher.level, job.level)) return 0;
    // עיר חובה אם שני הצדדים ציינו
    if (!cityCompatible(teacher.city, job.city)) return 0;
    const city = cityBonus(teacher.city, job.city);
    return subj + reg + city;
  }

  function findJobsForTeacher(teacher, jobs) {
    const out = [];
    for (const j of jobs) {
      const score = scoreMatch(teacher, j);
      if (score >= MIN_SCORE) out.push({ job: j, score });
    }
    out.sort((a, b) => b.score - a.score);
    return out;
  }

  function findTeachersForJob(job, teachers) {
    const out = [];
    for (const t of teachers) {
      const score = scoreMatch(t, job);
      if (score >= MIN_SCORE) out.push({ teacher: t, score });
    }
    out.sort((a, b) => b.score - a.score);
    return out;
  }

  root.EduraMatch = {
    findJobsForTeacher,
    findTeachersForJob,
    scoreMatch,
    MIN_SCORE,
  };
})(typeof window !== 'undefined' ? window : globalThis);
