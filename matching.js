// Edura matching engine — match teachers ↔ jobs by subject + region + level (+ city must match if both have one)
// Usage:
//   const matches = findJobsForTeacher(teacher, allJobs);   // sorted, score >= MIN
//   const matches = findTeachersForJob(job, allTeachers);   // sorted, score >= MIN

(function (root) {
  'use strict';

  // סדר חשיבות (מבוקש): עיר > מקצוע > שכבה > היקף > אזור (משני)
  // המשקלים נבחרו כך שעיר זהה תמיד מנצחת כל שילוב אחר, ובהיעדר עיר
  // מקצוע מוביל. אזור הוא תוספת רכה — כבר לא חובה.
  const W = {
    CITY_SAME: 100,
    SUBJECT_EXACT: 50,
    SUBJECT_PARTIAL: 30,
    LEVEL_MATCH: 25,    // שני הצדדים ציינו ויש חפיפה
    SCOPE_MATCH: 15,    // שני הצדדים ציינו ויש קלסיפיקציה זהה (מלאה/חלקית)
    REGION_SAME: 8,
    REGION_NEIGHBOR: 4,
  };
  const MIN_SCORE = 35;

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
    ['חינוך מיוחד', 'חנ"מ', 'חנמ', 'מורת שילוב', 'מורה שילוב',
      'הוראה מתקנת', 'הוראה משלבת', 'מדריכת הוראה משלבת',
      'כיתת תקשורת', 'תקשורת (asd)', 'חינוך מיוחד (asd)',
      'לקויות למידה', 'לקות למידה', 'הוראה מותאמת'],
    ['יועצ/ת חינוכי/ת', 'יועץ/ת', 'יועץ', 'יועצת', 'ייעוץ', 'ייעוץ חינוכי'],
    ['חינוך גופני', 'חנ"ג', 'חינוך גופני בנות', 'חינוך גופני בנים'],
    ['מחנך/ת', 'מחנך/מחנכת', 'מחנכים/ות', 'מחנכת', 'מחנך',
      'מחנכת כיתה', 'מחנכת א-ב', 'מחנכת א\'-ב\'', 'מחנכת א\'-ד\'', 'מחנכת א-ד',
      'מחנכת ה-ו', 'מחנכת ה\'-ו\'', 'מורה מחנכת'],
    ['גיל הרך', 'גיל רך', 'כיתות צעירות', 'כיתה צעירה', 'גן חובה', 'גנון'],
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

  // Strip parentheticals like "כיתה (א'-ד')" → "כיתה" for cleaner matching
  function stripParens(s) {
    return String(s || '').replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Split on '/' or ',' — teachers often write "חינוך מיוחד / מדעים"
  function splitSubjects(s) {
    return String(s || '').split(/[\/,]/).map(x => stripParens(x)).filter(Boolean);
  }

  function singleSubjectScore(sA, sB) {
    if (isGenericSubject(sA) || isGenericSubject(sB)) return 0;
    const cA = canonicalSubject(sA);
    const cB = canonicalSubject(sB);
    if (!cA || !cB) return 0;
    if (cA === cB) return 60;
    if (cA.includes(cB) || cB.includes(cA)) return 40;
    return 0;
  }

  // Try every (teacher-subject × job-subject) pair — best score wins
  function subjectScore(sA, sB) {
    const partsA = splitSubjects(sA);
    const partsB = splitSubjects(sB);
    if (partsA.length === 0 || partsB.length === 0) return singleSubjectScore(sA, sB);
    let best = 0;
    for (const a of partsA) {
      for (const b of partsB) {
        const s = singleSubjectScore(a, b);
        if (s > best) best = s;
      }
    }
    return best;
  }

  function citySame(cA, cB) {
    const a = normalizeText(cA);
    const b = normalizeText(cB);
    if (!a || !b) return false;
    return a === b;
  }

  // Scope canonicalization — מסווג ל-full / partial / unknown.
  // "מלאה" / "100%" → full. "חלקית" / "X ימים" / "X%" אחר → partial. ריק → unknown.
  function canonicalScope(scope) {
    const s = normalizeText(scope);
    if (!s) return '';
    if (/מלא/.test(s) || /\b100\s*%/.test(s)) return 'full';
    if (/חלק/.test(s) || /ימי/.test(s) || /%|אחוז/.test(s) || /\d/.test(s)) return 'partial';
    return '';
  }

  function scopeMatch(scA, scB) {
    const a = canonicalScope(scA);
    const b = canonicalScope(scB);
    if (!a || !b) return false;
    return a === b;
  }

  // שכבה — חובה אם שני הצדדים ציינו (יסודי≠תיכון). Bonus רק אם באמת חופפים.
  function levelHasOverlap(lA, lB) {
    const partsA = splitSubjects(lA).map(canonicalLevel).filter(Boolean);
    const partsB = splitSubjects(lB).map(canonicalLevel).filter(Boolean);
    if (partsA.length === 0 || partsB.length === 0) return null;  // missing
    for (const a of partsA) {
      for (const b of partsB) {
        if (a === b) return true;
      }
    }
    return false;
  }

  function scoreMatch(teacher, job) {
    // ── חובות (filters) ───────────────────────────────
    // מקצוע: חייב להיות חופף — אחרת אין טעם
    const subj = subjectScore(teacher.subject, job.subject);
    if (subj === 0) return 0;
    // שכבה: אם שניהם ציינו — חייב להיות חופף (יסודי≠תיכון)
    const levelOverlap = levelHasOverlap(teacher.level, job.level);
    if (levelOverlap === false) return 0;

    // ── ניקוד לפי סדר עדיפות ──────────────────────────
    let score = 0;

    // 1. עיר — האות החזק ביותר
    const sameCity = citySame(teacher.city, job.city);
    if (sameCity) score += W.CITY_SAME;

    // 2. מקצוע
    score += (subj === 60) ? W.SUBJECT_EXACT : W.SUBJECT_PARTIAL;

    // 3. שכבה — בונוס רק אם שניהם ציינו וחופפים
    if (levelOverlap === true) score += W.LEVEL_MATCH;

    // 4. היקף משרה — בונוס אם שניהם בקלסיפיקציה זהה
    if (scopeMatch(teacher.scope, job.scope)) score += W.SCOPE_MATCH;

    // 5. אזור — משני, רק כשעיר לא תפסה (כי עיר זהה כבר משמעותה אזור זהה)
    if (!sameCity) {
      const reg = regionScore(teacher.region, job.region);
      if (reg === 30) score += W.REGION_SAME;
      else if (reg === 15) score += W.REGION_NEIGHBOR;
    }

    return score;
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
