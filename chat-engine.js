/**
 * Edura · Chat Engine
 * ─────────────────────────────────────────────────────────────────
 * Wizard מבוסס כפתורים + טקסט חופשי (Gemini proxy).
 * משתמש ב-jobs.json — 440 משרות אמיתיות מ-shatil/itu/igm.
 *
 * שימוש:
 *   const chat = new EduraChat(rootElement);
 *   chat.start();
 */

window.EDURA_JOBS_URL = 'data/jobs.json';
window.EDURA_TEACHERS_URL = 'data/teachers.json';
window.EDURA_FB_TEACHERS_URL = 'data/fb-teachers.json';
window.EDURA_API_URL = 'https://script.google.com/macros/s/AKfycbxFqT828xAhAAhe9mJ6h55Kt9i6zKjcRZBscMYjrPkUV1BUuKhqT_n7ZLqC7cNZs7wR-Q/exec';
// Submissions feed: משרות ומורים שמיטל אישרה ידנית דרך לינק במייל (Apps Script).
// אותו פיד שאתר index/teachers טוענים — כדי שהבוט יראה את אותם רשומות.
window.EDURA_SUBMISSIONS_URL = 'https://script.google.com/macros/s/AKfycbwleldcwH8c5k9OZ8EMDIKZ8veRbrtO1M7XwYFWg7HHbEV-SrZkLTElbFRiq4cHPlyarw/exec';

(function () {
  'use strict';

  const REGIONS = ['ירושלים', 'מרכז', 'צפון', 'דרום', 'שפלה'];
  const ROLES = ['מורה', 'מחנך/ת', 'רכז/ת', 'יועץ/ת', 'מנהל/ת'];
  const SUBJECTS = ['מתמטיקה', 'אנגלית', 'עברית', 'תנ"ך', 'היסטוריה', 'אזרחות',
                    'פיזיקה', 'כימיה', 'ביולוגיה', 'מחשבים', 'מדעים', 'ספורט',
                    'אומנות', 'מוזיקה', 'ערבית', 'לשון', 'ספרות', 'חינוך מיוחד'];
  const LEVELS = ['יסודי', 'חטיבת ביניים', 'תיכון'];

  // טיפול בשגיאות כתיב נפוצות בדאטה ("מתימטיקה" → "מתמטיקה")
  const SUBJECT_ALIASES = {
    'מתימטיקה': 'מתמטיקה',
    'מתמט': 'מתמטיקה',
    'מתמטיק': 'מתמטיקה',
    'אנגל': 'אנגלית',
    'תנך': 'תנ"ך',
    'חט"ב': 'חטיבת ביניים'
  };
  function normalizeText(s) {
    s = String(s || '').trim();
    return SUBJECT_ALIASES[s] || s;
  }

  // משפטי פתיחה/טעינה/ניתוח — נטענים מ-copy.js (window.EduraCopy)
  // נשארים כ-fallback אם copy.js לא נטען (כדי שהצ'אט יעבוד גם בלעדיו).
  const _copy = window.EduraCopy || null;
  const OPENING_LINES = (_copy && _copy.openings) || [
    'שלום! 14 קבוצות פייסבוק, 6 לוחות, ושיחות טלפון לחברה ש"אולי מכירה מישהי" — תרגיעו, הגעתם הביתה.',
    'שלום! החיפוש הזה כבר חודשיים, נכון? בואו נצמצם את זה ל-30 שניות.'
  ];
  const LOADING_LINES = (_copy && _copy.loading) || [
    'סורקים משרות מהר יותר ממורה תורנית במסדרון',
    'מוצאים לכם משרה לפני שצלצל הצלצול'
  ];
  const TEACHER_LOADING_LINES = (_copy && _copy.teacherLoading) || [
    'סורקים פרופילים בלי שאלות מיותרות'
  ];
  const TENDER_LOADING_LINES = (_copy && _copy.tenderLoading) || [
    'מאתרים מכרזי ניהול בלי 80 עמודי טופס'
  ];
  const PARSING_LINES = (_copy && _copy.parsing) || [
    'מבינים את הצורך, לא רק את הכותרת'
  ];
  function pickLine(arr) {
    if (_copy && _copy.pick) return _copy.pick(arr);
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // region יכול להיות string או array (מורי FB עם כמה אזורים)
  function regionsOf(j) {
    if (Array.isArray(j.region)) return j.region.filter(Boolean);
    return j.region ? [j.region] : [];
  }
  function regionMatches(j, target) {
    return regionsOf(j).indexOf(target) !== -1;
  }

  // ממפה אזור חופשי מ-FB לאזור/ים סטנדרטיים (זהה ל-teachers.html)
  function regionOfPart(p) {
    if (/ירושלים|בית\s*שמש|מבשרת/.test(p)) return 'ירושלים';
    if (/באר\s*שבע|אשדוד|אשקלון|נגב|דרום|דימונה|ערד|קריית\s*גת|קרית\s*גת|אילת/.test(p)) return 'דרום';
    if (/חיפה|נשר|טבעון|קריות|כרמיאל|צפת|עכו|נצרת|עפולה|חריש|חדרה|פרדס\s*חנה|ואדי\s*ערה|צפון|טבריה|גליל|כרמל/.test(p)) return 'צפון';
    return 'מרכז';
  }
  function deriveRegionFromArea(area) {
    if (!area) return '';
    const parts = String(area).split(/\s*[\/,]\s*/).filter(Boolean);
    if (!parts.length) return '';
    const set = new Set();
    parts.forEach(p => set.add(regionOfPart(p)));
    const arr = [...set];
    return arr.length === 1 ? arr[0] : arr;
  }
  function normalizeFbTeachers(data) {
    const teachers = (data && data.teachers) || [];
    const sourceName = (data && data.source) || 'קבוצת פייסבוק';
    return teachers.map((t, i) => ({
      id: 'fb-' + i,
      source: 'facebook',
      source_name: sourceName,
      name: '',
      subject: t.subject || '',
      level: t.level || '',
      region: deriveRegionFromArea(t.area),
      sub_area: t.area || '',
      city: '',
      scope: t.scope || '',
      notes: t.notes || '',
      email: '',
      phone: '',
      date: '',
      date_iso: '',
      url: t.fb_url || '',
      fb_url: t.fb_url || ''
    }));
  }

  // משרות שאישרת ידנית דרך לינק במייל — מגיעות מ-Apps Script.
  // נורמליזציה זהה לזו ב-index.html כדי שהבוט יראה את אותן רשומות.
  function normalizeSubmittedJob(r) {
    const ts = r.timestamp || '';
    const dateIso = ts ? String(ts).slice(0, 10) : '';
    return {
      id: r.ref_id,
      source: 'submitted',
      source_name: 'הגשה ישירה',
      title: (r.subject ? r.subject + ' · ' : '') + (r.school || ''),
      school: r.school || '',
      subject: r.subject || '',
      role: r.role || '',
      region: r.region || '',
      city: r.city || '',
      level: r.level || '',
      sector: r.sector || '',
      scope: r.scope || '',
      description: r.description || '',
      email: r.email || '',
      phone: r.phone || '',
      contact_name: r.contact_name || '',
      date: dateIso,
      date_iso: dateIso,
      url: '',
      is_submitted: true
    };
  }
  function normalizeSubmittedTeacher(r) {
    const ts = r.timestamp || '';
    const dateIso = ts ? String(ts).slice(0, 10) : '';
    return {
      id: r.ref_id,
      source: 'submitted',
      source_name: 'הגשה ישירה',
      name: r.name || '',
      subject: r.subject || '',
      level: r.level || '',
      region: r.region || '',
      city: r.city || '',
      scope: r.scope || '',
      notes: r.notes || '',
      email: r.email || '',
      phone: r.phone || '',
      date: dateIso,
      date_iso: dateIso,
      is_submitted: true
    };
  }
  // Cache feed כדי לא להוריד אותו פעמיים אם המשתמש מחליף flow
  let _submittedCache = null;
  async function fetchSubmittedFeed() {
    if (_submittedCache) return _submittedCache;
    try {
      const res = await fetch(window.EDURA_SUBMISSIONS_URL + '?action=approved');
      if (!res.ok) return { jobs: [], teachers: [] };
      const data = await res.json();
      _submittedCache = {
        jobs: Array.isArray(data.jobs) ? data.jobs.map(normalizeSubmittedJob) : [],
        teachers: Array.isArray(data.teachers) ? data.teachers.map(normalizeSubmittedTeacher) : []
      };
      return _submittedCache;
    } catch (e) {
      return { jobs: [], teachers: [] };
    }
  }

  const STORAGE_KEY = 'edura.chat.state.v1';
  const SAVED_KEY = 'edura.chat.saved.v1';

  // ──────────────────────────────────────────────────
  // matchJobsCore — פונקציה טהורה לסינון משרות לפי filters
  // מופעלת גם מתוך הצ'אט וגם מ-tests/chat-bot.html (דף בדיקות).
  // ──────────────────────────────────────────────────
  function matchJobsCore(dataset, filters) {
    // סינון רך עם ניקוד. במקום AND קשיח — כל משרה מקבלת score.
    // מטה-דאטה דלילה (חסר אזור/שכבה) לא פוסל — נותן הזדמנות עם ניקוד נייטרלי.
    // אבל אי-התאמה ברורה (תפקיד/מקצוע/עיר) חוסמת — אחרת נדלפים אאוטליירס.
    const f = filters;
    const scored = dataset.map(j => {
      let score = 0;
      let blocker = false;
      let exactMatches = 0;

      if (f.region) {
        if (regionMatches(j, f.region)) { score += 100; exactMatches++; }
        else if (!regionsOf(j).length || j.region === 'ארצי') score += 5;
      }

      // עיר — בונוס משמעותי להתאמה (50). חוסם אם יש עיר אחרת באותו אזור.
      if (f.city) {
        const jCity = (j.city || '').trim();
        if (jCity === f.city) { score += 50; exactMatches++; }
        else if (!jCity) score += 3;
        else if (regionMatches(j, f.region)) blocker = true; // עיר אחרת באותו אזור → לא רלוונטי
      }

      if (f.subject) {
        const sub = normalizeText(j.subject);
        if (sub === f.subject) { score += 80; exactMatches++; }
        else if (!sub || sub === 'מורה' || sub === 'אחר') score += 5;
        else blocker = true;
      }

      if (f.level) {
        const lvl = normalizeText(j.level);
        if (lvl === f.level) { score += 40; exactMatches++; }
        else if (!lvl || lvl === '(לא זוהה)') score += 3;
      }

      if (f.role) {
        const role = j.role || '';
        const roleBase = f.role.replace('/ת', '');
        if (role.includes(roleBase)) { score += 50; exactMatches++; }
        else if (!role || role === 'אחר') score += 5;
        else blocker = true; // תפקיד מפורש אחר (מורה כשביקשו מנהל) → חוסם
      }

      // טריות לפי date_iso
      if (j.date_iso) {
        const days = (Date.now() - new Date(j.date_iso)) / 86400000;
        if (days < 7) score += 5;
        else if (days < 30) score += 2;
      }

      return { job: j, score: score, blocker: blocker, exactMatches: exactMatches };
    });

    const filterCount = (f.region?1:0) + (f.subject?1:0) + (f.level?1:0) + (f.role?1:0) + (f.city?1:0);
    // ככל שהמשתמשת מציינת יותר פרטים — אנחנו דורשים יותר התאמות מדויקות.
    // אחרת הספירה הופכת מטעה (מציגים "103" כשבפועל רק 30 קרובות באמת).
    const minExact = filterCount >= 3 ? Math.max(2, filterCount - 1) : Math.min(1, filterCount);
    const filtered = scored
      .filter(s => !s.blocker)
      .filter(s => s.exactMatches >= minExact)
      .sort((a, b) => b.exactMatches - a.exactMatches || b.score - a.score);

    return filtered.map(s => s.job);
  }

  class EduraChat {
    constructor(root) {
      this.root = root;
      this.allJobs = [];
      this.allTeachers = [];
      this.flow = 'job';
      this.dataset = [];
      this.filters = { region: '', city: '', role: '', subject: '', level: '', scope: '' };
      this.shownCount = 0;
      this.state = 'init';
      // היסטוריית שלבים — מאפשרת "חזרה" לבחירה קודמת
      this.history = [];
    }

    async start() {
      this.render();
      this.botMsg(pickLine(OPENING_LINES));
      this.askFlow();
    }

    askFlow() {
      // Job-only mode — flow selection (teacher/tender) disabled for now.
      this.startFlow('job', { silent: true });
    }

    async startFlow(flow, opts) {
      this.flow = flow;
      if (!opts || !opts.silent) {
        this.userMsg(flow === 'job' ? 'מחפש/ת משרה' :
                     flow === 'teacher' ? 'מחפש/ת מורה' :
                     'מחפש/ת מכרז ניהול');
      }

      const loadingArr = flow === 'job' ? LOADING_LINES :
                         flow === 'teacher' ? TEACHER_LOADING_LINES :
                         TENDER_LOADING_LINES;
      this.setStatus(pickLine(loadingArr));

      try {
        if (flow === 'teacher') {
          if (!this.allTeachers.length) {
            const [resA, resB, submitted] = await Promise.all([
              fetch(window.EDURA_TEACHERS_URL),
              fetch(window.EDURA_FB_TEACHERS_URL).catch(() => null),
              fetchSubmittedFeed()
            ]);
            const dataA = await resA.json();
            const fbData = resB && resB.ok ? await resB.json() : null;
            const fbTeachers = fbData ? normalizeFbTeachers(fbData) : [];
            // הגשות ידניות מקודמות לתחילת הרשימה — חדשות יותר ומהותיות
            this.allTeachers = [...submitted.teachers, ...(dataA.teachers || []), ...fbTeachers];
          }
          this.dataset = this.allTeachers;
          this.setStatus('');
          this.botMsg('יש ' + this.dataset.length + ' מורים שמחפשים בית. בואו נצמצם.');
        } else {
          if (!this.allJobs.length) {
            const [res, submitted] = await Promise.all([
              fetch(window.EDURA_JOBS_URL),
              fetchSubmittedFeed()
            ]);
            const data = await res.json();
            const scrapedJobs = (data.jobs || []).map(j => ({
              ...j,
              subject: normalizeText(j.subject),
              level: normalizeText(j.level)
            }));
            // הגשות שמיטל אישרה מהמייל מקודמות לתחילת הרשימה
            this.allJobs = [...submitted.jobs, ...scrapedJobs];
          }
          if (flow === 'tender') {
            this.dataset = this.allJobs.filter(j => (j.role || '').includes('מנהל'));
            this.setStatus('');
            this.botMsg('יש ' + this.dataset.length + ' מכרזי ניהול פתוחים. בואו נחדד.');
          } else {
            this.dataset = this.allJobs;
            this.setStatus('');
            this.botMsg('יש מאות משרות פתוחות עכשיו. בואו נמצא לך את המתאימה.');
          }
        }
        this.askMode();
      } catch (err) {
        this.setStatus('');
        this.botMsg('בעיה זמנית בטעינה. נסו לרענן.');
        console.error(err);
      }
    }

    askMode() {
      this.botMsg('איך נוח לך לחפש?', [
        { label: 'בחר/י מהרשימה', onClick: () => this.askRegion() },
        { label: 'אכתוב בעצמי', onClick: () => this.askFreeText() }
      ]);
    }

    askFreeText() {
      this.botMsg('מצוין. תתאר/י במשפט אחד מה את/ה מחפש/ת — אזור, תפקיד, מקצוע, שכבה. למשל: "מורה למתמטיקה בירושלים תיכון".');
      this.showInput((text) => this.handleFreeText(text));
    }

    async handleFreeText(text) {
      this.userMsg(text);
      this.setStatus(pickLine(PARSING_LINES));
      try {
        const res = await fetch(window.EDURA_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'parse', text: text })
        });
        const data = await res.json();
        this.setStatus('');
        if (data.ok && data.filters) {
          Object.assign(this.filters, data.filters);
          const summary = this.summarizeFilters();
          this.botMsg('הבנתי: ' + (summary || 'לא הצלחתי לזהות פרטים — בואו ננסה אחרת.'));
          if (!summary) { this.askRegion(); return; }
          const refineOpts = [
            { label: 'הראה משרות', onClick: () => this.showResults() },
            { label: 'אזור', onClick: () => this.askRegion() }
          ];
          if (this.filters.region) refineOpts.push({ label: 'עיר', onClick: () => this.askCity() });
          refineOpts.push({ label: 'תפקיד', onClick: () => this.askRole() });
          refineOpts.push({ label: 'מקצוע', onClick: () => this.askSubject() });
          refineOpts.push({ label: 'שכבה', onClick: () => this.askLevel() });
          this.botMsg('רוצה לחדד עוד פרט או לראות את ההתאמות?', refineOpts);
        } else {
          this.botMsg('לא הצלחתי לפענח. בואו נעבור על זה ביחד:');
          this.askRegion();
        }
      } catch (err) {
        this.setStatus('');
        this.botMsg('בעיה זמנית. נמשיך עם הרשימה:');
        this.askRegion();
        console.error(err);
      }
    }

    askRegion() {
      this.history.push('askRegion');
      this.botMsg('באיזה אזור?', this.withBack([
        ...REGIONS.map(r => ({ label: r, onClick: () => this.setAndNext('region', r, 'askCity') })),
        { label: 'גמיש', onClick: () => this.setAndNext('region', '', 'askRole') }
      ]));
    }

    // עוטף רשימת actions ומוסיף "← חזרה" אם יש היסטוריה
    withBack(actions) {
      if (this.history.length <= 1) return actions;
      return actions.concat([{ label: '← חזרה', onClick: () => this.goBack() }]);
    }

    goBack() {
      // הסר את השלב הנוכחי ואת הקודם, ואז קרא לקודם מחדש
      this.history.pop(); // current
      const prev = this.history.pop();
      if (prev && typeof this[prev] === 'function') this[prev]();
      else this.askFlow();
    }

    askCity() {
      // מחשב את הערים שיש להן פריטים באזור שנבחר, top 10 לפי כמות
      const counts = {};
      this.dataset.forEach(j => {
        if (!regionMatches(j, this.filters.region)) return;
        const c = (j.city || '').trim();
        if (!c) return;
        counts[c] = (counts[c] || 0) + 1;
      });
      const cities = Object.keys(counts)
        .sort((a, b) => counts[b] - counts[a])
        .slice(0, 10);

      if (cities.length === 0) {
        // אין ערים מסומנות באזור — דלג על שאלת העיר
        this.askRole();
        return;
      }

      this.history.push('askCity');
      const opts = cities.map(c => ({
        label: c + ' (' + counts[c] + ')',
        onClick: () => this.setAndNext('city', c, 'askRole')
      }));
      opts.push({ label: 'אחר — אכתוב עיר', onClick: () => this.askCityFree() });
      opts.push({ label: 'כל ' + this.filters.region, onClick: () => this.setAndNext('city', '', 'askRole') });
      this.botMsg('איזו עיר ב' + this.filters.region + '?', this.withBack(opts));
    }

    askCityFree() {
      this.botMsg('איזו עיר? כתבו את שם העיר.');
      this.showInput((text) => {
        const city = String(text || '').trim();
        if (!city) { this.askCity(); return; }
        this.setAndNext('city', city, 'askRole');
      });
    }

    askRole() {
      if (this.flow === 'tender') { this.askLevel(); return; }
      if (this.flow === 'teacher') { this.askSubject(); return; }
      this.history.push('askRole');
      this.botMsg('איזה תפקיד?', this.withBack([
        ...ROLES.map(r => ({ label: r, onClick: () => this.setAndNext('role', r, this.needsSubject_(r) ? 'askSubject' : 'askLevel') })),
        { label: 'גמיש', onClick: () => this.setAndNext('role', '', 'askLevel') }
      ]));
    }

    askSubject() {
      this.history.push('askSubject');
      const opts = SUBJECTS.map(s => ({ label: s, onClick: () => this.setAndNext('subject', s, 'askLevel') }));
      opts.push({ label: 'אחר / גמיש', onClick: () => this.setAndNext('subject', '', 'askLevel') });
      this.botMsg('איזה מקצוע?', this.withBack(opts));
    }

    askLevel() {
      this.history.push('askLevel');
      this.botMsg('איזו שכבה?', this.withBack([
        { label: 'יסודי', onClick: () => this.setAndNext('level', 'יסודי', 'showResults') },
        { label: 'חט"ב', onClick: () => this.setAndNext('level', 'חטיבת ביניים', 'showResults') },
        { label: 'תיכון', onClick: () => this.setAndNext('level', 'תיכון', 'showResults') },
        { label: 'גמיש', onClick: () => this.setAndNext('level', '', 'showResults') }
      ]));
    }

    needsSubject_(role) {
      return role === 'מורה' || role === 'מחנך/ת';
    }

    setAndNext(key, value, nextFn) {
      this.filters[key] = value;
      this.userMsg(value || 'גמיש');
      this.persist();
      // איפוס shownCount כשמתחילים סינון מחדש (תיקון באג מימוש)
      this.shownCount = 0;
      if (typeof this[nextFn] === 'function') this[nextFn]();
    }

    showResults() {
      const matches = this.matchJobs();
      this.shownCount = 0;
      const summary = this.summarizeFilters();
      const noun = this.flow === 'teacher' ? 'מורים מתאימים' : (this.flow === 'tender' ? 'מכרזים' : 'משרות רלוונטיות');
      this.botMsg('מצאתי ' + matches.length + ' ' + noun + (summary ? ' עבור: ' + summary : '') + '.');
      if (matches.length === 0) {
        const opts = [];
        if (this.filters.city) opts.push({ label: 'בלי עיר', onClick: () => { this.filters.city = ''; this.showResults(); } });
        if (this.filters.region) opts.push({ label: 'בלי אזור', onClick: () => { this.filters.region = ''; this.filters.city = ''; this.showResults(); } });
        if (this.filters.subject) opts.push({ label: 'בלי מקצוע', onClick: () => { this.filters.subject = ''; this.showResults(); } });
        if (this.filters.level) opts.push({ label: 'בלי שכבה', onClick: () => { this.filters.level = ''; this.showResults(); } });
        opts.push({ label: 'התחל מחדש', onClick: () => this.reset() });
        this.botMsg('אין התאמה. בואו נרכך סינון:', opts);
        return;
      }
      if (matches.length <= 3) {
        this.botMsg('מציין שלחלק מהמשרות חסרים פרטים מלאים — אם משהו לא רלוונטי, פתחו וקראו במקור.');
      }
      this.showNextBatch(matches);
    }

    showNextBatch(matches) {
      const batch = matches.slice(this.shownCount, this.shownCount + 3);
      batch.forEach(j => this.jobCard(j));
      this.shownCount += batch.length;
      const remaining = matches.length - this.shownCount;
      const actions = [];
      if (remaining > 0) actions.push({ label: 'הראה ' + Math.min(3, remaining) + ' נוספות', onClick: () => this.showNextBatch(matches) });
      actions.push({ label: 'שנה סינון', onClick: () => this.askMode() });
      actions.push({ label: 'התחל מחדש', onClick: () => this.reset() });
      this.botMsg(remaining > 0 ? 'רוצה לראות עוד?' : 'אלה כל ההתאמות.', actions);
    }

    matchJobs() {
      return matchJobsCore(this.dataset, this.filters);
    }

    summarizeFilters() {
      const f = this.filters;
      const parts = [];
      if (f.role) parts.push(f.role);
      if (f.subject) parts.push(f.subject);
      if (f.level) parts.push(f.level);
      if (f.city) parts.push('ב' + f.city);
      else if (f.region) parts.push('ב' + f.region);
      if (f.scope) parts.push('משרה ' + f.scope);
      return parts.join(' · ');
    }

    reset() {
      this.filters = { region: '', city: '', role: '', subject: '', level: '', scope: '' };
      this.shownCount = 0;
      this.dataset = [];
      this.history = [];
      this.persist();
      this.askFlow();
    }

    persist() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.filters)); } catch (e) {}
    }

    saveJob(job) {
      try {
        const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
        const key = job.id || (job.school + job.email);
        if (!saved.find(s => s.id === key)) {
          saved.unshift({
            id: key,
            title: job.school || job.title || '',
            email: job.email || '',
            phone: job.phone || '',
            sourceName: job.source_name || job.source || '',
            savedAt: Date.now()
          });
          localStorage.setItem(SAVED_KEY, JSON.stringify(saved.slice(0, 50)));
        }
      } catch (e) {}
    }

    // ─── UI helpers ───────────────────────────────────────────
    render() {
      this.root.innerHTML = '' +
        '<div class="ec-stream" id="ec-stream" role="log" aria-live="polite" aria-atomic="false" aria-label="שיחה עם בוט אדורה"></div>' +
        '<div class="ec-status" id="ec-status" role="status" aria-live="polite"></div>' +
        '<div class="ec-input-row" id="ec-input-row" hidden>' +
          '<input type="text" id="ec-input" aria-label="הקלידו את החיפוש שלכם" placeholder="כתבו כאן..." autocomplete="off" inputmode="search" enterkeyhint="send" />' +
          '<button id="ec-send" class="ec-send-btn" type="button">שלח</button>' +
        '</div>';
      this.stream = this.root.querySelector('#ec-stream');
      this.statusEl = this.root.querySelector('#ec-status');
      this.inputRow = this.root.querySelector('#ec-input-row');
      this.inputEl = this.root.querySelector('#ec-input');
      this.sendBtn = this.root.querySelector('#ec-send');
    }

    botMsg(text, actions) {
      const wrap = document.createElement('div');
      wrap.className = 'ec-msg ec-msg-bot';
      const bubble = document.createElement('div');
      bubble.className = 'ec-bubble';
      bubble.textContent = text;
      wrap.appendChild(bubble);
      if (actions && actions.length) {
        const actRow = document.createElement('div');
        actRow.className = 'ec-actions';
        actions.forEach(a => {
          const btn = document.createElement('button');
          btn.className = 'ec-action';
          btn.type = 'button';
          btn.textContent = a.label;
          btn.addEventListener('click', () => {
            actRow.querySelectorAll('button').forEach(b => b.disabled = true);
            a.onClick();
          });
          actRow.appendChild(btn);
        });
        wrap.appendChild(actRow);
      }
      this.stream.appendChild(wrap);
      this.scrollDown();
    }

    userMsg(text) {
      const wrap = document.createElement('div');
      wrap.className = 'ec-msg ec-msg-user';
      const bubble = document.createElement('div');
      bubble.className = 'ec-bubble';
      bubble.textContent = text;
      wrap.appendChild(bubble);
      this.stream.appendChild(wrap);
      this.scrollDown();
    }

    jobCard(j) {
      const card = document.createElement('div');
      card.className = 'ec-msg ec-msg-bot';
      const isTeacher = this.flow === 'teacher';
      const cityArea = [j.city, j.sub_area].filter(Boolean).join(' · ');
      const regionStr = regionsOf(j).filter(r => r !== '(לא זוהה)').join(' / ');
      const region = regionStr
        ? '<span class="ec-tag">' + esc(regionStr) + (cityArea ? ' · ' + esc(cityArea) : '') + '</span>'
        : (cityArea ? '<span class="ec-tag">' + esc(cityArea) + '</span>' : '');
      const role = !isTeacher && j.role && j.role !== 'אחר' ? '<span class="ec-tag">' + esc(j.role) + '</span>' : '';
      const lvl = j.level && j.level !== '(לא זוהה)' ? '<span class="ec-tag">' + esc(j.level) + '</span>' : '';
      const subj = j.subject ? '<span class="ec-tag">' + esc(j.subject) + '</span>' : '';
      const sector = j.sector ? '<span class="ec-tag">' + esc(j.sector) + '</span>' : '';
      const scope = j.scope ? '<span class="ec-tag">' + esc(j.scope) + '</span>' : '';
      const dateStr = j.date ? '<span class="ec-job-date">' + esc(j.date) + '</span>' : '';
      // עדיפות ל-description (טקסט מלא), נופלים ל-snippet
      const bodyText = j.description || j.snippet || '';
      // כותרת: למורה — שם המורה. למשרה — בית הספר.
      const cardTitle = isTeacher ? (j.name || 'מורה אנונימי/ת') : (j.school || j.title || '');
      const subjLabel = isTeacher && j.subject ? 'מורה ל' + j.subject : '';

      // CTAs — מציג כל אמצעי קשר זמין ככפתור נפרד, עם הכתובת/מספר על הכפתור.
      // ככה ברור למשתמשת מה כל כפתור עושה ואיזה פרטי קשר באמת קיימים במשרה.
      const ctas = [];
      if (j.email) {
        const isT = this.flow === 'teacher';
        const subjText = isT
          ? 'פנייה דרך אדורה לגבי משרת הוראה'
          : 'פנייה דרך אדורה — ' + (j.school || j.title || '');
        const intro = 'אדורה — לוח המשרות שמתאים לך\n\n';
        const bodyText2 = isT
          ? intro + 'שלום' + (j.name ? ' ' + j.name.split(' ')[0] : '') + ',\n\nראיתי את הפרופיל שלך באדורה ואשמח לדבר איתך על משרה אצלנו.\n\n'
          : intro + 'שלום' + (j.contact_name ? ' ' + j.contact_name : '') + ',\n\nראיתי את המשרה שלכם באתר אדורה ואשמח להציג מועמדות.\n\n';
        const gmailUrl = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(j.email) +
                         '&su=' + encodeURIComponent(subjText) +
                         '&body=' + encodeURIComponent(bodyText2);
        const ctaLabel = isT ? 'פנו אליו/ה' : 'שלחו מייל';
        ctas.push('<a class="ec-job-cta" href="' + gmailUrl + '" target="_blank" rel="noopener">' + ctaLabel + '</a>');
      }
      if (j.phone) {
        const cleanPhone = String(j.phone).replace(/\D/g,'');
        ctas.push('<a class="ec-job-cta ec-job-cta-tel" href="tel:' + esc(cleanPhone) + '">חייגו ' + esc(j.phone) + '</a>');
      }
      // קישור למקור — מוצג תמיד כשיש URL (גם אם יש מייל/טלפון). חשוב למשתמש שרוצה לראות מודעה מלאה.
      if (j.url) {
        ctas.push('<a class="ec-job-cta ec-job-cta-link" href="' + esc(j.url) + '" target="_blank" rel="noopener">פרטים נוספים ←</a>');
      }
      if (ctas.length === 0) {
        ctas.push('<span class="ec-job-cta" style="opacity:.5;cursor:default">פרטי קשר חסרים</span>');
      }

      const contact = !isTeacher && j.contact_name ? '<div class="ec-job-contact">איש קשר: ' + esc(j.contact_name) + '</div>' : '';
      const emailLine = j.email ? '<div class="ec-job-contact">מייל: <a href="mailto:' + esc(j.email) + '">' + esc(j.email) + '</a></div>' : '';
      const teacherSubtitle = isTeacher && subjLabel ? '<div class="ec-job-source">' + esc(subjLabel) + '</div>' : '';

      card.innerHTML =
        '<div class="ec-job-card">' +
          '<div class="ec-job-source">' + esc(j.source_name || j.source || '') + (dateStr ? ' · ' + dateStr : '') + '</div>' +
          '<h4 class="ec-job-title">' + esc(cardTitle) + '</h4>' +
          teacherSubtitle +
          '<div class="ec-job-tags">' + region + role + subj + lvl + sector + scope + '</div>' +
          (bodyText ? '<p class="ec-job-snippet">' + esc(String(bodyText).slice(0, 280)) + (bodyText.length > 280 ? '…' : '') + '</p>' : '') +
          contact + emailLine +
          '<div class="ec-job-actions">' +
            ctas.join('') +
            '<button class="ec-job-save" type="button">שמור</button>' +
          '</div>' +
        '</div>';
      const saveBtn = card.querySelector('.ec-job-save');
      saveBtn.addEventListener('click', () => {
        this.saveJob(j);
        saveBtn.textContent = 'נשמר';
        saveBtn.disabled = true;
      });
      this.stream.appendChild(card);
      this.scrollDown();
    }

    showInput(handler) {
      this.inputRow.hidden = false;
      // גלילה לתחתית כדי שהשאלה האחרונה תישאר גלויה מעל מקלדת המובייל.
      this.scrollDown();
      // עיכוב קל — מאפשר ל-layout להתאים את עצמו לפני הפוקוס (אחרת המקלדת
      // נפתחת לפני שהפאנל מתעדכן ל-100dvh ומסתירה את ההודעה האחרונה).
      setTimeout(() => {
        this.inputEl.focus({ preventScroll: false });
        this.scrollDown();
      }, 80);
      const submit = () => {
        const v = this.inputEl.value.trim();
        if (!v) return;
        this.inputEl.value = '';
        this.inputRow.hidden = true;
        handler(v);
      };
      this.sendBtn.onclick = submit;
      this.inputEl.onkeydown = (e) => { if (e.key === 'Enter') submit(); };
    }

    setStatus(text) {
      this.statusEl.textContent = text || '';
      this.statusEl.style.display = text ? 'block' : 'none';
    }

    scrollDown() {
      requestAnimationFrame(() => {
        this.stream.scrollTop = this.stream.scrollHeight;
      });
    }
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  window.EduraChat = EduraChat;
  window.EduraMatching = {
    matchJobs: matchJobsCore,
    normalizeText: normalizeText,
    regionsOf: regionsOf,
    regionMatches: regionMatches,
    REGIONS: REGIONS,
    ROLES: ROLES,
    SUBJECTS: SUBJECTS,
    LEVELS: LEVELS
  };
})();
