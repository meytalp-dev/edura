/**
 * Edura — סוכן איסוף משרות הוראה · גרסה 4
 * ─────────────────────────────────────────────────────────────────
 *  שינויים בגרסה 4:
 *   ✓ הסקה חכמה לתפקיד — אם יש מקצוע → "מורה (משוער)"
 *     אם רק שכבה → "צוות חינוכי (משוער)"
 *   ✓ הוספת שתיל (jobs.shatil.org.il) — לוח דרושים של מגזר שלישי
 *
 *  שינויים בגרסה 3:
 *   ✓ matchesWord_ משופר — מתיר תחיליות עבריות (ה-, ל-, ב-, ש-, כ-, מ-, ו-)
 *     אבל חוסם מילים אחרות לגמרי דרך WORD_BLOCKLIST (למשל "מרכז" לא תיחשב כ"רכז")
 *   ✓ Headers מלאים של Chrome — ניסיון נוסף לעבור 403 בירושלים+ג'וינט
 *
 *  שינויים בגרסה 2:
 *   ✓ זיהוי תפקיד תוקן — "מרכז" כבר לא נספר כ"רכז"
 *   ✓ תפקיד הוא עכשיו multi-label (משרה יכולה להיות גם מורה וגם מחנך)
 *   ✓ אזור: defaultRegion לכל מקור (תל אביב→מרכז, חיפה→צפון וכו')
 *   ✓ User-Agent של דפדפן אמיתי
 *
 *  שלב 1: איסוף בלבד. בלי סינון, בלי מייל.
 *  המטרה: לראות מה יש בשטח לפני שמעצבים את האתר.
 *
 *  הוראות הקמה (פעם אחת):
 *  1) Google Sheet חדש בשם "Edura — מאגר משרות"
 *  2) Extensions → Apps Script
 *  3) הדביקי את כל הקובץ הזה
 *  4) Save (Ctrl+S)
 *  5) הריצי setup() — ייווצרו 4 טאבים: jobs · seen · log · stats
 *  6) הריצי runScan() ידנית — איסוף ראשון מ-14 מקורות
 *  7) הריצי analyzeData() — סיכום של מה שנאסף
 *  8) הריצי installDailyTrigger() — הרצה אוטומטית 06:00 ו-18:00
 *
 *  שלב 2 (אחרי 24-48 שעות): מנתחים את הנתונים, מעצבים את האתר
 * ─────────────────────────────────────────────────────────────────
 */

const SHEET_JOBS = 'jobs';
const SHEET_SEEN = 'seen';
const SHEET_LOG = 'log';
const SHEET_STATS = 'stats';

const PAGE_URL = 'https://edura.co.il/';

// 14 מקורות. defaultRegion = אזור אוטומטי כשלא זוהה מהטקסט.
const SOURCES = [
  // ─── סקירת ירושלים ───
  { id: 'jlm-menhai',     name: 'עושים חינוך ירושלמי',     url: 'https://teacher.jlm.org.il/home/wanted-in-menhai/',                          type: 'html', defaultRegion: 'ירושלים' },
  { id: 'jerusalem-muni', name: 'עיריית ירושלים',           url: 'https://www.jerusalem.muni.il/he/residents/employment/jobs/',                type: 'html', defaultRegion: 'ירושלים' },

  // ─── רשתות חינוך ───
  { id: 'ort',            name: 'אורט',                      url: 'https://landing.ort.org.il/ort-career/',                                      type: 'html', defaultRegion: '' },
  { id: 'amal',           name: 'עמל',                       url: 'https://www.amalnet.k12.il/career/',                                          type: 'html', defaultRegion: '' },
  { id: 'amit',           name: 'אמית',                      url: 'https://amit.org.il/career-%d7%97%d7%99%d7%a4%d7%95%d7%a9-%d7%9e%d7%a9%d7%a8%d7%95%d7%aa-%d7%91%d7%a8%d7%a9%d7%aa-%d7%90%d7%9e%d7%99%d7%aa/', type: 'html', defaultRegion: '' },

  // ─── עמותות וגופי חינוך ───
  { id: 'cet-jobs',       name: 'מט"ח · כל המשרות',          url: 'https://cet.ac.il/jobs/',                                                     type: 'html', defaultRegion: '' },
  { id: 'joint',          name: 'ג׳וינט ישראל',              url: 'https://www.thejoint.org.il/career/',                                         type: 'html', defaultRegion: '' },
  { id: 'achiya',         name: 'אחיה ידע',                   url: 'https://achiyayeda.org/drushim/',                                             type: 'html', defaultRegion: '' },
  { id: 'mandel',         name: 'מכון מנדל',                  url: 'https://www.mandel.org.il/',                                                  type: 'html', defaultRegion: '' },

  // ─── רשמי ───
  { id: 'edu-tech',       name: 'משרד החינוך · חדשנות',       url: 'https://edu-tech.education.gov.il/',                                          type: 'html', defaultRegion: '' },

  // ─── עיריות (אזור ברור) ───
  { id: 'tlv-careers',    name: 'עיריית תל אביב · דרושים',    url: 'https://www.tel-aviv.gov.il/AuctionAndCareers/Pages/Careers.aspx',            type: 'html', defaultRegion: 'מרכז' },
  { id: 'haifa-edu',      name: 'עיריית חיפה · משרות חינוך',  url: 'https://www.haifa.muni.il/resident-service/jobs/jobs-in-education/',          type: 'html', defaultRegion: 'צפון' },

  // ─── לוחות דרושים ───
  { id: 'edjobs-all',     name: 'EdJobs · לוח דרושים',        url: 'https://www.edjobs.co.il/%D7%9C%D7%95%D7%97-%D7%93%D7%A8%D7%95%D7%A9%D7%99%D7%9D', type: 'html', defaultRegion: '' },
  { id: 'jobmaster-edu',  name: 'JobMaster · חינוך',         url: 'https://www.jobmaster.co.il/jobs/?KeyWords=%D7%9E%D7%95%D7%A8%D7%94',           type: 'html', defaultRegion: '' },

  // ─── מגזר שלישי (עמותות, חינוך חברתי) ───
  { id: 'shatil',         name: 'שתיל · לוח דרושים',           url: 'https://jobs.shatil.org.il/',                                                  type: 'html', defaultRegion: '' }
];

// פעולות מיוחדות לפי source_id — headers מלאים של דפדפן אמיתי (תיקון 403)
function getSourceFetchOptions_(src) {
  return {
    method: 'get',
    muteHttpExceptions: true,
    followRedirects: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    }
  };
}

// ─── מילות מפתח רחבות לכל הוראה ─────────────────────────────────────
// בשלב הזה אנחנו לא מסננים אגרסיבי — אוספים הכל ורואים מה יש.

const KW_SUBJECTS = [
  'מתמטיקה', 'מתמט', 'חשבון',
  'אנגלית',
  'עברית', 'ספרות',
  'תנ"ך', 'תנך',
  'היסטוריה',
  'אזרחות',
  'גיאוגר', 'גאוגר',
  'פיזיקה', 'כימיה', 'ביולוגיה',
  'מחשבים', 'מדע"ח', 'מדעי המחשב',
  'מדעים',
  'ספורט', 'חנ"ג', 'חינוך גופני',
  'אומנות', 'אמנות',
  'מוזיקה', 'מוסיקה',
  'ערבית', 'צרפתית', 'ספרדית', 'רוסית',
  'תקשורת',
  'רובוטיקה',
  'תיאטרון',
  'יזמות'
];

const KW_ROLES = [
  'מורה', 'מורה ל',
  'מחנך', 'מחנכת',
  'רכז', 'רכזת',
  'יועץ', 'יועצת',
  'מתמחה הוראה',
  'מדריך פדגוגי', 'מדריכה פדגוגית',
  'עוזר הוראה', 'עוזרת הוראה',
  'מנהל בית ספר', 'מנהלת בית ספר',
  'סגן מנהל', 'סגנית מנהלת',
  'תקשוב'
];

const KW_LEVELS = [
  'יסודי', 'בית ספר יסודי',
  'חט"ב', 'חטיבת ביניים', 'חטיבה',
  'תיכון', 'חטיבה עליונה',
  'גן ילדים', 'גן חובה'
];

const KW_SPECIAL = [
  'חינוך מיוחד',
  'מ"מ', 'משלב',
  'סייעת', 'סייע'
];

const KEYWORDS = [].concat(KW_SUBJECTS, KW_ROLES, KW_LEVELS, KW_SPECIAL);

// פילטרים שליליים — דברים שאנחנו לא רוצים ב-MVP
const NEGATIVE = [
  'ללא שכר',
  'התנדבות',
  'מחפש עבודה',  // אלה מורים שמחפשים, לא משרות פנויות
  'מחפשת עבודה',
  'מחפש משרה',
  'מחפשת משרה',
  'שיעורים פרטיים בלבד',
  'תואר שני נדרש בלבד',
  'תואר שלישי נדרש בלבד',
  'דרוש סטודנט',
  'דרושה סטודנטית'
];

// ─── מילים שמזהות אזור גיאוגרפי ─────────────────────────────────────
const REGIONS_MAP = {
  'ירושלים': 'ירושלים',
  'תל אביב': 'מרכז',
  'תל-אביב': 'מרכז',
  'ת"א': 'מרכז',
  'רמת גן': 'מרכז',
  'גבעתיים': 'מרכז',
  'הרצליה': 'מרכז',
  'רעננה': 'מרכז',
  'כפר סבא': 'מרכז',
  'פתח תקווה': 'מרכז',
  'בני ברק': 'מרכז',
  'ראשון לציון': 'מרכז',
  'חולון': 'מרכז',
  'בת ים': 'מרכז',
  'רחובות': 'מרכז',
  'נתניה': 'מרכז',
  'אשדוד': 'דרום',
  'אשקלון': 'דרום',
  'באר שבע': 'דרום',
  'דימונה': 'דרום',
  'אילת': 'דרום',
  'נגב': 'דרום',
  'חיפה': 'צפון',
  'נצרת': 'צפון',
  'עכו': 'צפון',
  'קריות': 'צפון',
  'טבריה': 'צפון',
  'צפת': 'צפון',
  'כרמיאל': 'צפון',
  'גליל': 'צפון',
  'מודיעין': 'שפלה',
  'בית שמש': 'שפלה',
  'לוד': 'שפלה',
  'רמלה': 'שפלה'
};

// ─── headers הטאבים ─────────────────────────────────────────────────
const JOBS_HEADERS = ['first_seen', 'source_id', 'source_name', 'title', 'url', 'snippet',
                       'detected_region', 'detected_subjects', 'detected_levels', 'detected_role',
                       'matched_keywords', 'is_negative'];
const SEEN_HEADERS  = ['url_hash', 'url', 'first_seen'];
const LOG_HEADERS   = ['timestamp', 'action', 'details'];
const STATS_HEADERS = ['date', 'metric', 'value', 'detail'];

// ════════════════════════════════════════════════════════════════════
// SETUP — להריץ פעם אחת
// ════════════════════════════════════════════════════════════════════
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet_(ss, SHEET_JOBS, JOBS_HEADERS);
  ensureSheet_(ss, SHEET_SEEN, SEEN_HEADERS);
  ensureSheet_(ss, SHEET_LOG, LOG_HEADERS);
  ensureSheet_(ss, SHEET_STATS, STATS_HEADERS);
  log_('setup', 'Sheets initialized: ' + JOBS_HEADERS.length + ' job columns');
  try {
    SpreadsheetApp.getUi().alert(
      '✓ מוכן!\n\n' +
      '4 טאבים נוצרו: jobs · seen · log · stats\n\n' +
      'הצעדים הבאים:\n' +
      '1. runScan() — איסוף ראשון מ-' + SOURCES.length + ' מקורות\n' +
      '2. analyzeData() — סיכום מה נאסף\n' +
      '3. installDailyTrigger() — הרצה אוטומטית פעמיים ביום'
    );
  } catch (e) {}
}

function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
    return;
  }
  // Rewrite headers if changed
  const existing = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), headers.length)).getValues()[0];
  let needsRewrite = existing.length < headers.length;
  for (let i = 0; i < headers.length && !needsRewrite; i++) {
    if (String(existing[i] || '') !== headers[i]) needsRewrite = true;
  }
  if (needsRewrite) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
}

// ════════════════════════════════════════════════════════════════════
// installDailyTrigger — פעמיים ביום (06:00 בוקר, 18:00 ערב)
// ════════════════════════════════════════════════════════════════════
function installDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'runScan') ScriptApp.deleteTrigger(t);
  });
  // בוקר 06:00
  ScriptApp.newTrigger('runScan')
    .timeBased().atHour(6).nearMinute(0).everyDays(1).inTimezone('Asia/Jerusalem').create();
  // ערב 18:00
  ScriptApp.newTrigger('runScan')
    .timeBased().atHour(18).nearMinute(0).everyDays(1).inTimezone('Asia/Jerusalem').create();
  log_('trigger', 'Triggers installed: 06:00 + 18:00 IL');
  try {
    SpreadsheetApp.getUi().alert('✓ הסוכן יורוץ פעמיים ביום: 06:00 ו-18:00 (שעון ישראל).');
  } catch (e) {}
}

// ════════════════════════════════════════════════════════════════════
// runScan — איסוף ראשי
// ════════════════════════════════════════════════════════════════════
function runScan() {
  const startTime = new Date();
  log_('scan-start', 'Scan started · ' + SOURCES.length + ' sources');
  let totalFound = 0;
  let totalNew = 0;

  for (const src of SOURCES) {
    try {
      const found = scanSource_(src);
      const fresh = found.filter(j => !alreadySeen_(j.url));
      fresh.forEach(j => {
        markSeen_(j.url);
        appendJob_(j);
      });
      totalFound += found.length;
      totalNew += fresh.length;
      log_('scan', src.id + ' · candidates ' + found.length + ' · new ' + fresh.length);
    } catch (err) {
      log_('scan-error', src.id + ' · ' + String(err));
    }
  }

  const elapsed = Math.round((new Date() - startTime) / 1000);
  log_('scan-end', 'Done in ' + elapsed + 's · ' + totalFound + ' candidates · ' + totalNew + ' new');
}

// ════════════════════════════════════════════════════════════════════
// scanSource_ — סריקת מקור יחיד
// ════════════════════════════════════════════════════════════════════
function scanSource_(src) {
  const opts = getSourceFetchOptions_(src);
  const res = UrlFetchApp.fetch(src.url, opts);
  if (res.getResponseCode() !== 200) {
    throw new Error('HTTP ' + res.getResponseCode());
  }
  const html = res.getContentText();

  const candidates = extractLinks_(html, src.url);
  const matches = [];

  candidates.forEach(c => {
    const text = (c.text || '') + ' ' + (c.context || '');
    const matched = matchKeywords_(text);
    if (matched.length === 0) return; // No keyword matched → not interesting

    const isNegative = matchesNegative_(text);
    const meta = extractMetadata_(text, src.defaultRegion || '');

    matches.push({
      sourceId: src.id,
      sourceName: src.name,
      title: c.text.trim().slice(0, 200),
      url: c.url,
      snippet: c.context.trim().slice(0, 400),
      detectedRegion: meta.region,
      detectedSubjects: meta.subjects.join(', '),
      detectedLevels: meta.levels.join(', '),
      detectedRole: meta.roles.join(', '),
      keywords: matched,
      isNegative: isNegative
    });
  });

  // Dedupe by URL within source
  const seen = new Set();
  return matches.filter(m => {
    if (seen.has(m.url)) return false;
    seen.add(m.url);
    return true;
  });
}

function extractLinks_(html, baseUrl) {
  html = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');

  const linkRegex = /<a\s+([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi;
  const out = [];
  let m;
  while ((m = linkRegex.exec(html)) !== null) {
    const href = m[2];
    const inner = (m[4] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (inner.length < 5 || inner.length > 250) continue;

    let absUrl = href;
    if (href.startsWith('/')) {
      const base = baseUrl.match(/^https?:\/\/[^\/]+/)[0];
      absUrl = base + href;
    } else if (!href.startsWith('http')) {
      continue;
    }

    const idx = m.index;
    const ctxStart = Math.max(0, idx - 250);
    const ctxEnd = Math.min(html.length, idx + m[0].length + 250);
    const context = html.slice(ctxStart, ctxEnd).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

    out.push({ url: absUrl, text: inner, context: context });
  }
  return out;
}

function matchKeywords_(text) {
  const lower = text.toLowerCase();
  const matches = [];
  for (const kw of KEYWORDS) {
    if (lower.indexOf(kw.toLowerCase()) !== -1) matches.push(kw);
  }
  return matches;
}

function matchesNegative_(text) {
  const lower = text.toLowerCase();
  for (const n of NEGATIVE) {
    if (lower.indexOf(n.toLowerCase()) !== -1) return true;
  }
  return false;
}

// ════════════════════════════════════════════════════════════════════
// extractMetadata_ — חילוץ אזור, מקצוע, שכבה, תפקיד (multi-label)
// תיקון מרכזי: תפקיד = רשימה (לא חד-ערכי), word boundaries כדי למנוע
//   ש-"מרכז" יזוהה כ-"רכז".
// ════════════════════════════════════════════════════════════════════
function extractMetadata_(text, defaultRegion) {
  // ── מקצועות (multi) ──
  const subjects = [];
  for (const subj of KW_SUBJECTS) {
    if (text.indexOf(subj) !== -1 && subjects.indexOf(subj) === -1) {
      subjects.push(subj);
    }
  }

  // ── שכבות (multi, מנורמל) ──
  const levels = [];
  for (const lvl of KW_LEVELS) {
    if (text.indexOf(lvl) !== -1) {
      const norm = lvl.indexOf('יסוד') !== -1 ? 'יסודי'
                 : lvl.indexOf('חט') !== -1 || lvl.indexOf('ביניים') !== -1 ? 'חט"ב'
                 : lvl.indexOf('תיכון') !== -1 || lvl.indexOf('עליונה') !== -1 ? 'תיכון'
                 : lvl.indexOf('גן') !== -1 ? 'גן'
                 : lvl;
      if (levels.indexOf(norm) === -1) levels.push(norm);
    }
  }

  // ── אזור: קודם מהטקסט, אז מ-defaultRegion של המקור ──
  let region = '';
  for (const city in REGIONS_MAP) {
    if (text.indexOf(city) !== -1) { region = REGIONS_MAP[city]; break; }
  }
  if (!region && defaultRegion) region = defaultRegion;

  // ── תפקיד (multi-label, word-aware) ──
  const roles = [];

  if (matchesWord_(text, 'רכז') || matchesWord_(text, 'רכזת')) roles.push('רכז/ת');
  if (matchesWord_(text, 'מחנך') || matchesWord_(text, 'מחנכת')) roles.push('מחנך/ת');
  if (matchesWord_(text, 'יועץ') || matchesWord_(text, 'יועצת')) roles.push('יועץ/ת');
  if (matchesWord_(text, 'מנהל בית ספר') || matchesWord_(text, 'מנהלת בית ספר')) roles.push('מנהל/ת ביה"ס');
  if (matchesWord_(text, 'סגן מנהל') || matchesWord_(text, 'סגנית מנהלת')) roles.push('סגן/ית');
  if (matchesWord_(text, 'מורה')) roles.push('מורה');
  if (matchesWord_(text, 'מתמחה הוראה')) roles.push('מתמחה');
  if (matchesWord_(text, 'מדריך פדגוגי') || matchesWord_(text, 'מדריכה פדגוגית')) roles.push('מדריך/ה פדגוגי/ת');
  if (matchesWord_(text, 'תקשוב')) roles.push('תקשוב');

  // ── הסקה חכמה כשאין תפקיד מפורש ──
  // אם המשרה מציינת מקצוע (מתמטיקה, אנגלית) → סביר שזה מורה
  // אם רק שכבה (יסודי/חט"ב/תיכון) → צוות חינוכי (כללי)
  if (roles.length === 0) {
    if (subjects.length > 0) {
      roles.push('מורה (משוער)');
    } else if (levels.length > 0) {
      roles.push('צוות חינוכי (משוער)');
    }
  }

  return { region, subjects, levels, roles };
}

// בלקליסט של מילים ש"מכילות" את המילה שאנחנו מחפשים אבל הן מילה אחרת לגמרי.
// דוגמה: "מרכז" מכילה "רכז", אבל היא לא רכז/ת — היא center.
const WORD_BLOCKLIST = {
  'רכז':   ['מרכז'],          // מרכז למידה, מרכז מחקר וכו'
  'רכזת':  ['מרכזת'],         // אותו עיקרון
  'מורה':  ['שמורה', 'שמור'], // שמורה (preserved/keeps), שמור (kept)
  'מחנך':  [],
  'מחנכת': [],
  'יועץ':  [],
  'יועצת': [],
};

// matchesWord_ — מחפש את המילה כיחידת מילה אמיתית.
// מתיר תחיליות עבריות (ה-, ל-, ב-, ש-, כ-, מ-, ו-) וצורות שונות.
// חוסם false matches לפי WORD_BLOCKLIST (למשל "מרכז" לא ייחשב כ-"רכז").
function matchesWord_(text, word) {
  const blocked = WORD_BLOCKLIST[word] || [];
  let pos = 0;
  while (pos < text.length) {
    const idx = text.indexOf(word, pos);
    if (idx === -1) return false;

    // חלץ את המילה השלמה (כל הרצף העברי סביב ה-idx)
    const fullWord = extractFullHebrewWord_(text, idx, word.length);

    // האם המילה השלמה מכילה אחד מה-false matches?
    let isBlocked = false;
    for (const b of blocked) {
      if (fullWord.indexOf(b) !== -1) { isBlocked = true; break; }
    }
    if (!isBlocked) return true;

    pos = idx + 1;
  }
  return false;
}

// חילוץ המילה העברית השלמה סביב נקודה במחרוזת
function extractFullHebrewWord_(text, idx, wordLen) {
  let start = idx;
  while (start > 0 && /[\u0590-\u05FF]/.test(text.charAt(start - 1))) start--;
  let end = idx + wordLen;
  while (end < text.length && /[\u0590-\u05FF]/.test(text.charAt(end))) end++;
  return text.substring(start, end);
}

// ════════════════════════════════════════════════════════════════════
// seen tracking · job append
// ════════════════════════════════════════════════════════════════════
function alreadySeen_(url) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SEEN);
  const last = sh.getLastRow();
  if (last < 2) return false;
  const hash = hashUrl_(url);
  const data = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === hash) return true;
  }
  return false;
}

function markSeen_(url) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SEEN);
  sh.appendRow([hashUrl_(url), url, new Date()]);
}

function appendJob_(j) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_JOBS);
  sh.appendRow([
    new Date(),
    j.sourceId, j.sourceName,
    j.title, j.url, j.snippet,
    j.detectedRegion, j.detectedSubjects, j.detectedLevels, j.detectedRole,
    j.keywords.join(', '),
    j.isNegative
  ]);
}

function hashUrl_(url) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, url);
  return bytes.map(b => ((b & 0xff) + 0x100).toString(16).slice(1)).join('').slice(0, 16);
}

// ════════════════════════════════════════════════════════════════════
// analyzeData — סיכום מה נאסף עד כה
// מציג: סה"כ משרות · פילוח לפי מקור/אזור/שכבה/מקצוע/תפקיד
// ════════════════════════════════════════════════════════════════════
function analyzeData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_JOBS);
  const stats = ss.getSheetByName(SHEET_STATS);
  const last = sh.getLastRow();
  if (last < 2) {
    try { SpreadsheetApp.getUi().alert('עדיין אין נתונים. הריצי runScan() קודם.'); } catch (e) {}
    return;
  }

  const data = sh.getRange(2, 1, last - 1, JOBS_HEADERS.length).getValues();
  const total = data.length;
  const validJobs = data.filter(r => r[11] !== true); // is_negative === false
  const negatives = total - validJobs.length;

  const bySource = countBy_(validJobs, 1);
  const byRegion = countBy_(validJobs, 6);
  const byRole = countBy_(validJobs, 9);

  const subjectCounts = {};
  validJobs.forEach(r => {
    const s = String(r[7] || '').split(/[,،]/).map(x => x.trim()).filter(Boolean);
    s.forEach(x => subjectCounts[x] = (subjectCounts[x] || 0) + 1);
  });

  const levelCounts = {};
  validJobs.forEach(r => {
    const s = String(r[8] || '').split(/[,،]/).map(x => x.trim()).filter(Boolean);
    s.forEach(x => levelCounts[x] = (levelCounts[x] || 0) + 1);
  });

  // Write to stats sheet
  const today = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'yyyy-MM-dd HH:mm');
  const rows = [];
  rows.push([today, 'total_collected', total, '']);
  rows.push([today, 'valid_jobs', validJobs.length, '']);
  rows.push([today, 'filtered_negatives', negatives, '']);
  Object.keys(bySource).forEach(k => rows.push([today, 'by_source', bySource[k], k]));
  Object.keys(byRegion).forEach(k => rows.push([today, 'by_region', byRegion[k], k || '(לא זוהה)']));
  Object.keys(byRole).forEach(k => rows.push([today, 'by_role', byRole[k], k || '(לא זוהה)']));
  Object.keys(subjectCounts).forEach(k => rows.push([today, 'by_subject', subjectCounts[k], k]));
  Object.keys(levelCounts).forEach(k => rows.push([today, 'by_level', levelCounts[k], k]));
  if (rows.length > 0) {
    stats.getRange(stats.getLastRow() + 1, 1, rows.length, 4).setValues(rows);
  }

  // Build summary alert
  let summary = '📊 סיכום איסוף — Edura\n\n';
  summary += 'סה"כ נאסף: ' + total + '\n';
  summary += 'משרות תקפות: ' + validJobs.length + '\n';
  summary += 'סוננו (שליליות): ' + negatives + '\n\n';
  summary += '─── לפי מקור ───\n';
  Object.keys(bySource).sort((a,b) => bySource[b]-bySource[a]).forEach(k => {
    summary += '· ' + k + ': ' + bySource[k] + '\n';
  });
  summary += '\n─── לפי אזור ───\n';
  Object.keys(byRegion).sort((a,b) => byRegion[b]-byRegion[a]).forEach(k => {
    summary += '· ' + (k || '(לא זוהה)') + ': ' + byRegion[k] + '\n';
  });
  summary += '\n─── לפי תפקיד ───\n';
  Object.keys(byRole).sort((a,b) => byRole[b]-byRole[a]).forEach(k => {
    summary += '· ' + (k || '(לא זוהה)') + ': ' + byRole[k] + '\n';
  });

  log_('analyze', 'Total ' + total + ' · valid ' + validJobs.length + ' · negatives ' + negatives);
  try { SpreadsheetApp.getUi().alert(summary); } catch (e) {}
  return { total, validJobs: validJobs.length, negatives, bySource, byRegion, byRole, subjectCounts, levelCounts };
}

function countBy_(rows, colIdx) {
  const out = {};
  rows.forEach(r => {
    const k = String(r[colIdx] || '');
    out[k] = (out[k] || 0) + 1;
  });
  return out;
}

// ════════════════════════════════════════════════════════════════════
// doGet — JSON endpoint לאתר Edura
// מחזיר את כל המשרות התקפות (לא שליליות)
// ════════════════════════════════════════════════════════════════════
function doGet(e) {
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_JOBS);
    const last = sh.getLastRow();
    if (last < 2) return json_({ ok: true, jobs: [], total: 0, updated: new Date().toISOString() });

    const data = sh.getRange(2, 1, last - 1, JOBS_HEADERS.length).getValues();
    data.sort(function (a, b) { return new Date(b[0]) - new Date(a[0]); });

    const jobs = data
      .filter(row => row[11] !== true) // not negative
      .map(row => ({
        firstSeen: row[0] instanceof Date ? row[0].toISOString() : String(row[0]),
        sourceId: row[1],
        sourceName: row[2],
        title: row[3],
        url: row[4],
        snippet: row[5],
        region: row[6],
        subjects: String(row[7] || '').split(',').map(s => s.trim()).filter(Boolean),
        levels: String(row[8] || '').split(',').map(s => s.trim()).filter(Boolean),
        role: row[9],
        keywords: String(row[10] || '').split(',').map(s => s.trim()).filter(Boolean)
      }));

    return json_({ ok: true, jobs: jobs, total: jobs.length, updated: new Date().toISOString() });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ════════════════════════════════════════════════════════════════════
// doPost — proxy ל-Gemini עבור הצ'אטבוט
// פותח endpoint שמסתיר את המפתח, עוקף referrer restrictions ו-CORS.
// קלט:  { action: 'parse', text: 'אני מורה למתמטיקה בירושלים' }
// פלט:  { ok: true, filters: { region, role, subject, level, scope } }
// ════════════════════════════════════════════════════════════════════
// 🔒 המפתח נשמר ב-Script Properties — אין מפתח בקוד הציבורי
// הגדרה חד פעמית: Apps Script editor → Project Settings → Script Properties → Add: GEMINI_KEY = <המפתח>
function getGeminiUrl_() {
  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_KEY');
  if (!key) throw new Error('GEMINI_KEY missing in Script Properties');
  return 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + key;
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    if (body.action === 'parse') {
      return json_(parseUserText_(body.text || ''));
    }
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function parseUserText_(text) {
  const prompt = 'משתמש כתב בעברית: "' + text + '"\n\n' +
    'חלץ פילטרים לחיפוש משרת הוראה ב-JSON בלבד (בלי הסבר, בלי markdown):\n' +
    '{ "region": "ירושלים|מרכז|צפון|דרום|שפלה|", ' +
    '"city": "(שם עיר ספציפית אם הוזכרה כמו תל אביב, רחובות, חולון — אחרת ריק)", ' +
    '"role": "מורה|מחנך/ת|רכז/ת|יועץ/ת|מנהל/ת|", ' +
    '"subject": "מתמטיקה|אנגלית|עברית|תנ\\"ך|היסטוריה|אזרחות|פיזיקה|כימיה|ביולוגיה|מחשבים|מדעים|ספורט|אומנות|מוזיקה|ערבית|", ' +
    '"level": "יסודי|חטיבת ביניים|תיכון|", "scope": "מלאה|חלקית|" }\n' +
    'אם שדה לא ברור — מחרוזת ריקה. החזר JSON אחד בלבד.';

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 200 }
  };

  const res = UrlFetchApp.fetch(getGeminiUrl_(), {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    deadline: 8
  });

  if (res.getResponseCode() !== 200) {
    return { ok: false, error: 'Gemini ' + res.getResponseCode() };
  }

  const data = JSON.parse(res.getContentText());
  const raw = ((data.candidates || [{}])[0].content || {}).parts || [{}];
  let txt = String(raw[0].text || '').trim();
  // הסר עטיפת markdown אם יש
  txt = txt.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim();

  try {
    const filters = JSON.parse(txt);
    return { ok: true, filters: filters };
  } catch (e) {
    return { ok: false, error: 'parse failed', raw: txt };
  }
}

function log_(action, details) {
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_LOG);
    if (sh) sh.appendRow([new Date(), action, details]);
  } catch (e) {}
}

// ════════════════════════════════════════════════════════════════════
// utilities
// ════════════════════════════════════════════════════════════════════

// Reset seen URLs — כדי לסרוק הכל מחדש
function resetSeen() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SEEN);
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, SEEN_HEADERS.length).clearContent();
  log_('reset', 'Cleared seen URLs');
}

// Reset jobs — נקה הכל ותתחיל איסוף מאפס
function resetAll() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ['jobs', 'seen'].forEach(name => {
    const sh = ss.getSheetByName(name);
    const last = sh.getLastRow();
    if (last > 1) sh.getRange(2, 1, last - 1, sh.getLastColumn()).clearContent();
  });
  log_('reset-all', 'Cleared jobs + seen');
}
