/**
 * Edura — Submissions endpoint
 * ─────────────────────────────────────────────────────────────────
 *  פותחת 4 actions:
 *
 *    1. submit_application   — מורה שולח מועמדות למשרה (כולל קובץ קו"ח)
 *    2. submit_job           — מנהל מפרסם משרה חדשה
 *    3. subscribe_alerts     — הרשמה להתראה יומית למורות
 *    4. subscribe_principal  — הרשמה להתראה על מכרזי ניהול הסבב הבא
 *
 *  הקמה (פעם אחת):
 *  1) Google Sheet חדש בשם "Edura — פניות והרשמות"
 *  2) Extensions → Apps Script
 *  3) הדביקי את כל הקובץ הזה
 *  4) Save (Ctrl+S)
 *  5) הריצי setup() — ייווצרו 4 טאבים
 *  6) Deploy → New deployment → Web App
 *     - Execute as: Me
 *     - Who has access: Anyone
 *  7) העתיקי את ה-URL ל-EDURA_SUBMISSIONS_URL ב-index.html ובשאר הקבצים
 *  8) הריצי installDailyAlerts() — שולח מייל יומי 06:00 למורות שנרשמו
 * ─────────────────────────────────────────────────────────────────
 */

const SHEET_APPLICATIONS = 'applications';
const SHEET_POSTED_JOBS = 'posted_jobs';
const SHEET_ALERTS = 'alerts';
const SHEET_PRINCIPAL_ALERTS = 'principal_alerts';
const SHEET_LOG_SUB = 'log';

// יעד לפניות שמגיעות בלי כתובת מייל ספציפית במשרה (ברירת מחדל)
const ADMIN_EMAIL = 'meytal@edura.co.il';

// URL של הסוכן הראשי (jobs scanner) — לשליפה ל-daily alerts
const JOBS_API_URL = 'https://script.google.com/macros/s/AKfycbxFqT828xAhAAhe9mJ6h55Kt9i6zKjcRZBscMYjrPkUV1BUuKhqT_n7ZLqC7cNZs7wR-Q/exec';

const APPLICATIONS_HEADERS = ['timestamp', 'ref_id', 'job_id', 'job_title', 'school',
                              'school_email', 'name', 'email', 'phone', 'message',
                              'cv_drive_id', 'cv_drive_url', 'cv_filename', 'status'];
const POSTED_JOBS_HEADERS = ['timestamp', 'ref_id', 'school', 'subject', 'role',
                             'region', 'city', 'level', 'sector', 'scope',
                             'description', 'contact_name', 'email', 'phone', 'status'];
const ALERTS_HEADERS = ['timestamp', 'email', 'name', 'region', 'level', 'subject',
                        'role', 'scope', 'active', 'last_sent'];
const PRINCIPAL_ALERTS_HEADERS = ['timestamp', 'email', 'name', 'region', 'phone', 'active', 'last_sent'];
const LOG_HEADERS = ['timestamp', 'action', 'details'];

// תיקייה ב-Google Drive לשמירת קורות חיים — נוצרת אוטומטית
const CV_FOLDER_NAME = 'Edura · קורות חיים';

// ════════════════════════════════════════════════════════════════════
// SETUP — להריץ פעם אחת
// ════════════════════════════════════════════════════════════════════
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet_(ss, SHEET_APPLICATIONS, APPLICATIONS_HEADERS);
  ensureSheet_(ss, SHEET_POSTED_JOBS, POSTED_JOBS_HEADERS);
  ensureSheet_(ss, SHEET_ALERTS, ALERTS_HEADERS);
  ensureSheet_(ss, SHEET_PRINCIPAL_ALERTS, PRINCIPAL_ALERTS_HEADERS);
  ensureSheet_(ss, SHEET_LOG_SUB, LOG_HEADERS);
  getOrCreateCvFolder_();
  log_('setup', 'Sheets initialized');
  try {
    SpreadsheetApp.getUi().alert(
      '✓ מוכן!\n\n' +
      '5 טאבים נוצרו: applications · posted_jobs · alerts · principal_alerts · log\n' +
      'תיקיית Drive נוצרה: ' + CV_FOLDER_NAME + '\n\n' +
      'הצעדים הבאים:\n' +
      '1. Deploy → New deployment → Web App (Anyone)\n' +
      '2. installDailyAlerts() — מייל יומי 06:00'
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

function getOrCreateCvFolder_() {
  const folders = DriveApp.getFoldersByName(CV_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(CV_FOLDER_NAME);
}

// ════════════════════════════════════════════════════════════════════
// doPost — נקודת הכניסה היחידה
// ════════════════════════════════════════════════════════════════════
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action || '';

    if (action === 'submit_application')   return json_(handleApplication_(body));
    if (action === 'submit_job')           return json_(handlePostJob_(body));
    if (action === 'subscribe_alerts')     return json_(handleAlerts_(body));
    if (action === 'subscribe_principal')  return json_(handlePrincipal_(body));

    return json_({ ok: false, error: 'unknown action: ' + action });
  } catch (err) {
    log_('error', String(err));
    return json_({ ok: false, error: String(err) });
  }
}

// CORS preflight (Apps Script web apps don't support OPTIONS, but we keep doGet open)
function doGet(e) {
  return json_({ ok: true, service: 'Edura submissions', actions: ['submit_application', 'submit_job', 'subscribe_alerts', 'subscribe_principal'] });
}

// ════════════════════════════════════════════════════════════════════
// 1. submit_application — מורה שולח מועמדות
// ════════════════════════════════════════════════════════════════════
function handleApplication_(b) {
  const name = String(b.name || '').trim();
  const email = String(b.email || '').trim();
  const phone = String(b.phone || '').trim();
  const message = String(b.message || '').trim();
  const jobId = String(b.jobId || '').trim();
  const jobTitle = String(b.jobTitle || '').trim();
  const school = String(b.school || '').trim();
  const schoolEmail = String(b.schoolEmail || '').trim();
  const cvBase64 = String(b.cvBase64 || '');
  const cvFilename = String(b.cvFilename || '').trim();
  const cvMime = String(b.cvMime || 'application/pdf').trim();

  if (!name || !email) return { ok: false, error: 'שם ומייל הם חובה' };
  if (!isValidEmail_(email)) return { ok: false, error: 'מייל לא תקין' };

  const refId = generateRefId_('APP');
  let cvUrl = '', cvId = '';

  // העלאת קובץ ל-Drive
  if (cvBase64 && cvFilename) {
    try {
      const folder = getOrCreateCvFolder_();
      const blob = Utilities.newBlob(Utilities.base64Decode(cvBase64), cvMime, refId + '_' + cvFilename);
      const file = folder.createFile(blob);
      // שיתוף עם הרשאת קריאה לכל מי שיש לו לינק
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      cvId = file.getId();
      cvUrl = file.getUrl();
    } catch (err) {
      log_('cv-upload-error', refId + ' · ' + String(err));
    }
  }

  // שמירה ל-Sheet
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_APPLICATIONS);
  sh.appendRow([new Date(), refId, jobId, jobTitle, school, schoolEmail,
                name, email, phone, message, cvId, cvUrl, cvFilename, 'sent']);

  // שליחת מייל לבית הספר (אם יש מייל) או למיטל
  const targetEmail = schoolEmail || ADMIN_EMAIL;
  const subject = '[אדורה · ' + refId + '] פנייה למשרת ' + (jobTitle || 'הוראה');
  const html = buildApplicationEmail_({
    refId, name, email, phone, message, jobTitle, school, cvUrl, cvFilename
  });

  const mailOpts = {
    name: 'אדורה · edura.co.il',
    replyTo: email,
    htmlBody: html
  };

  // צירוף קובץ ב-attachment אם הצליח לעלות
  if (cvId) {
    try {
      mailOpts.attachments = [DriveApp.getFileById(cvId).getBlob()];
    } catch (e) {}
  }

  try {
    MailApp.sendEmail(targetEmail, subject, htmlToText_(html), mailOpts);

    // Confirmation למורה
    MailApp.sendEmail(email, 'אישור פנייה למשרה · אדורה (' + refId + ')',
      'שלום ' + name + ',\n\n' +
      'הפנייה שלך למשרה "' + (jobTitle || school || 'הוראה') + '" נשלחה בהצלחה.\n' +
      'מספר פנייה: ' + refId + '\n\n' +
      (schoolEmail
        ? 'הפנייה הועברה ישירות לבית הספר. הם יחזרו אלייך למייל הזה.'
        : 'הפנייה הגיעה אלינו ב-אדורה. אם תהיה התקדמות נעדכן אותך.') + '\n\n' +
      'בהצלחה!\n— אדורה · edura.co.il',
      { name: 'אדורה · edura.co.il', replyTo: ADMIN_EMAIL });

    log_('application-sent', refId + ' · ' + email + ' → ' + targetEmail);
    return { ok: true, refId: refId, sentTo: targetEmail };
  } catch (err) {
    log_('application-error', refId + ' · ' + String(err));
    return { ok: false, error: 'שליחת המייל נכשלה. נסי שוב או כתבי ישירות ל-' + ADMIN_EMAIL };
  }
}

function buildApplicationEmail_(d) {
  const cvBlock = d.cvUrl
    ? '<p><strong>קורות חיים:</strong> <a href="' + d.cvUrl + '">' + escHtml_(d.cvFilename) + '</a> (מצורפים גם כקובץ למייל)</p>'
    : '<p><em>(הפנייה נשלחה ללא קובץ קו"ח. אפשר לבקש מהמורה לשלוח בנפרד.)</em></p>';

  return '' +
    '<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;color:#0B2A4A;line-height:1.6;max-width:600px;">' +
    '<div style="background:#CCFBF1;padding:14px 20px;border-radius:8px;margin-bottom:20px;">' +
      '<div style="font-size:11px;color:#0F9285;font-weight:700;letter-spacing:0.5px;">פנייה דרך אדורה · ' + escHtml_(d.refId) + '</div>' +
      '<div style="font-size:18px;font-weight:700;color:#0B2A4A;margin-top:4px;">' + escHtml_(d.jobTitle || d.school || 'משרת הוראה') + '</div>' +
    '</div>' +
    '<p>שלום,</p>' +
    '<p>קיבלתם פנייה למשרה דרך <a href="https://edura.co.il" style="color:#0F9285;">edura.co.il</a> — לוח דרושים ייעודי לחינוך.</p>' +
    '<table style="border-collapse:collapse;width:100%;margin:14px 0;">' +
      '<tr><td style="padding:8px 0;width:90px;color:#475569;">שם:</td><td><strong>' + escHtml_(d.name) + '</strong></td></tr>' +
      '<tr><td style="padding:8px 0;color:#475569;">מייל:</td><td><a href="mailto:' + escHtml_(d.email) + '" style="color:#0F9285;">' + escHtml_(d.email) + '</a></td></tr>' +
      (d.phone ? '<tr><td style="padding:8px 0;color:#475569;">טלפון:</td><td><a href="tel:' + escHtml_(d.phone) + '" style="color:#0F9285;">' + escHtml_(d.phone) + '</a></td></tr>' : '') +
    '</table>' +
    (d.message ? '<div style="background:#F8FAFC;border-right:3px solid #14B8A6;padding:14px 18px;border-radius:8px;margin:14px 0;"><strong style="display:block;margin-bottom:6px;">הודעה אישית:</strong>' + escHtml_(d.message).replace(/\n/g, '<br>') + '</div>' : '') +
    cvBlock +
    '<hr style="border:none;border-top:1px solid #E2E8F0;margin:20px 0;">' +
    '<p style="font-size:13px;color:#475569;">הפנייה נשלחה דרך אדורה — לוח דרושים ייעודי לחינוך. מספר פנייה: <strong>' + escHtml_(d.refId) + '</strong>. כדי לחזור למורה, פשוט השיבו למייל הזה.</p>' +
    '</div>';
}

// ════════════════════════════════════════════════════════════════════
// 2. submit_job — מנהל מפרסם משרה
// ════════════════════════════════════════════════════════════════════
function handlePostJob_(b) {
  const school = String(b.school || '').trim();
  const subject = String(b.subject || '').trim();
  const role = String(b.role || '').trim();
  const region = String(b.region || '').trim();
  const city = String(b.city || '').trim();
  const level = String(b.level || '').trim();
  const sector = String(b.sector || '').trim();
  const scope = String(b.scope || '').trim();
  const description = String(b.description || '').trim();
  const contactName = String(b.contactName || '').trim();
  const email = String(b.email || '').trim();
  const phone = String(b.phone || '').trim();

  if (!school || !subject || !contactName || !email || !phone) {
    return { ok: false, error: 'שם בית ספר, מקצוע, איש קשר, מייל וטלפון — חובה' };
  }
  if (!isValidEmail_(email)) return { ok: false, error: 'מייל לא תקין' };

  const refId = generateRefId_('JOB');
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_POSTED_JOBS);
  sh.appendRow([new Date(), refId, school, subject, role, region, city, level,
                sector, scope, description, contactName, email, phone, 'pending']);

  // התראה למיטל
  const subj = '[אדורה · ' + refId + '] משרה חדשה לפרסום — ' + school;
  const body =
    'משרה חדשה הוגשה לפרסום באדורה.\n\n' +
    'מספר פנייה: ' + refId + '\n' +
    'בית ספר: ' + school + '\n' +
    'מקצוע: ' + subject + '\n' +
    'תפקיד: ' + role + '\n' +
    'אזור: ' + region + ' · ' + city + '\n' +
    'שכבה: ' + level + ' · מגזר: ' + sector + ' · היקף: ' + scope + '\n\n' +
    'תיאור:\n' + description + '\n\n' +
    '— איש קשר —\n' +
    contactName + '\n' + email + '\n' + phone + '\n\n' +
    'אישור פרסום: ✓\n\n' +
    'לאישור פרסום, ערכי את הסטטוס בטאב posted_jobs ל-"approved".';

  try {
    MailApp.sendEmail(ADMIN_EMAIL, subj, body, { name: 'אדורה · edura.co.il', replyTo: email });
    // אישור למנהל
    MailApp.sendEmail(email, 'התקבלה בקשת פרסום באדורה (' + refId + ')',
      'שלום ' + contactName + ',\n\n' +
      'בקשת הפרסום של ' + school + ' למשרת ' + subject + ' התקבלה.\n' +
      'מספר פנייה: ' + refId + '\n\n' +
      'נעלה את המשרה לאדורה תוך 24 שעות. אם משהו דחוף — חזרי לכתובת הזו.\n\n' +
      '— אדורה · edura.co.il',
      { name: 'אדורה · edura.co.il', replyTo: ADMIN_EMAIL });
    log_('job-posted', refId + ' · ' + school);
    return { ok: true, refId: refId };
  } catch (err) {
    log_('job-post-error', refId + ' · ' + String(err));
    return { ok: false, error: 'שמירה הצליחה אך מייל נכשל. נחזור אלייך תוך 24 שעות (' + refId + ')' };
  }
}

// ════════════════════════════════════════════════════════════════════
// 3. subscribe_alerts — מורות שמבקשות התראה יומית
// ════════════════════════════════════════════════════════════════════
function handleAlerts_(b) {
  const email = String(b.email || '').trim();
  const name = String(b.name || '').trim();
  const region = String(b.region || '').trim();
  const level = String(b.level || '').trim();
  const subject = String(b.subject || '').trim();
  const role = String(b.role || '').trim();
  const scope = String(b.scope || '').trim();

  if (!email || !isValidEmail_(email)) return { ok: false, error: 'מייל לא תקין' };

  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ALERTS);
  // עדכון אם כבר קיים
  const last = sh.getLastRow();
  if (last >= 2) {
    const data = sh.getRange(2, 1, last - 1, ALERTS_HEADERS.length).getValues();
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][1]).toLowerCase() === email.toLowerCase()) {
        sh.getRange(i + 2, 3, 1, 7).setValues([[name, region, level, subject, role, scope, true]]);
        log_('alerts-updated', email);
        return { ok: true, updated: true };
      }
    }
  }
  sh.appendRow([new Date(), email, name, region, level, subject, role, scope, true, '']);

  try {
    MailApp.sendEmail(email, 'נרשמת להתראות אדורה ✓',
      'שלום' + (name ? ' ' + name : '') + ',\n\n' +
      'נרשמת להתראה יומית על משרות חדשות שמתאימות לקריטריונים שלך.\n' +
      (region ? 'אזור: ' + region + '\n' : '') +
      (level ? 'שכבה: ' + level + '\n' : '') +
      (subject ? 'מקצוע: ' + subject + '\n' : '') +
      (role ? 'תפקיד: ' + role + '\n' : '') +
      (scope ? 'היקף: ' + scope + '\n' : '') +
      '\n' +
      'בכל בוקר ב-06:00 תקבלי מייל עם המשרות החדשות (אם יש).\n' +
      'אם אין משרות חדשות — לא נשלח כלום.\n\n' +
      'להסרה: השיבי "הסר" למייל הזה.\n\n' +
      '— אדורה · edura.co.il',
      { name: 'אדורה · edura.co.il', replyTo: ADMIN_EMAIL });
  } catch (e) {}

  log_('alerts-subscribed', email);
  return { ok: true, subscribed: true };
}

// ════════════════════════════════════════════════════════════════════
// 4. subscribe_principal — התראה על מכרזי ניהול הסבב הבא
// ════════════════════════════════════════════════════════════════════
function handlePrincipal_(b) {
  const email = String(b.email || '').trim();
  const name = String(b.name || '').trim();
  const region = String(b.region || '').trim();
  const phone = String(b.phone || '').trim();

  if (!email || !isValidEmail_(email)) return { ok: false, error: 'מייל לא תקין' };

  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PRINCIPAL_ALERTS);
  const last = sh.getLastRow();
  if (last >= 2) {
    const data = sh.getRange(2, 1, last - 1, PRINCIPAL_ALERTS_HEADERS.length).getValues();
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][1]).toLowerCase() === email.toLowerCase()) {
        sh.getRange(i + 2, 3, 1, 4).setValues([[name, region, phone, true]]);
        log_('principal-updated', email);
        return { ok: true, updated: true };
      }
    }
  }
  sh.appendRow([new Date(), email, name, region, phone, true, '']);

  try {
    MailApp.sendEmail(email, 'נרשמת להתראות מכרזי ניהול ✓',
      'שלום' + (name ? ' ' + name : '') + ',\n\n' +
      'נרשמת להתראה על מכרזי ניהול בסבב הבא.\n' +
      (region ? 'אזור מועדף: ' + region + '\n\n' : '\n') +
      'ברגע שייפתח סבב מכרזי ניהול חדש (בדרך כלל ינואר-מרץ), תקבלי מאיתנו מייל עם רשימת המכרזים הרלוונטיים.\n\n' +
      'להסרה: השיבי "הסר" למייל הזה.\n\n' +
      '— אדורה · edura.co.il',
      { name: 'אדורה · edura.co.il', replyTo: ADMIN_EMAIL });
  } catch (e) {}

  log_('principal-subscribed', email);
  return { ok: true, subscribed: true };
}

// ════════════════════════════════════════════════════════════════════
// installDailyAlerts — מייל יומי 06:00 למורות שנרשמו
// ════════════════════════════════════════════════════════════════════
function installDailyAlerts() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sendDailyAlerts') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendDailyAlerts')
    .timeBased().atHour(6).nearMinute(15).everyDays(1).inTimezone('Asia/Jerusalem').create();
  log_('trigger', 'Daily alerts trigger installed: 06:15 IL');
  try { SpreadsheetApp.getUi().alert('✓ התראה יומית תישלח כל בוקר ב-06:15 (שעון ישראל).'); } catch (e) {}
}

function sendDailyAlerts() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ALERTS);
  const last = sh.getLastRow();
  if (last < 2) return;
  const subs = sh.getRange(2, 1, last - 1, ALERTS_HEADERS.length).getValues()
    .map(function (row, i) { return { rowIdx: i + 2, ts: row[0], email: row[1], name: row[2],
                                       region: row[3], level: row[4], subject: row[5], role: row[6],
                                       scope: row[7], active: row[8], lastSent: row[9] }; })
    .filter(function (s) { return s.active === true || String(s.active).toLowerCase() === 'true'; });

  if (subs.length === 0) return;

  // משיכת המשרות מה-jobs scanner
  let jobs = [];
  try {
    const res = UrlFetchApp.fetch(JOBS_API_URL, { muteHttpExceptions: true, deadline: 30 });
    if (res.getResponseCode() === 200) {
      const data = JSON.parse(res.getContentText());
      jobs = data.jobs || [];
    }
  } catch (e) {
    log_('alerts-fetch-error', String(e));
    return;
  }

  // רק משרות מ-24 שעות אחרונות
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const fresh = jobs.filter(function (j) {
    const t = new Date(j.firstSeen).getTime();
    return !isNaN(t) && t >= cutoff;
  });

  if (fresh.length === 0) {
    log_('alerts-no-fresh', 'No new jobs in last 24h, skipping');
    return;
  }

  let sent = 0;
  subs.forEach(function (sub) {
    const matches = filterJobsForSub_(fresh, sub);
    if (matches.length === 0) return;
    try {
      const html = buildAlertsEmail_(sub, matches);
      MailApp.sendEmail(sub.email, 'אדורה · ' + matches.length + ' משרות חדשות בשבילך',
        htmlToText_(html), { name: 'אדורה · edura.co.il', replyTo: ADMIN_EMAIL, htmlBody: html });
      sh.getRange(sub.rowIdx, 10).setValue(new Date());
      sent++;
    } catch (e) { log_('alert-send-error', sub.email + ' · ' + String(e)); }
  });
  log_('alerts-daily', 'Sent ' + sent + ' alerts · ' + fresh.length + ' fresh jobs · ' + subs.length + ' subs');
}

function filterJobsForSub_(jobs, sub) {
  return jobs.filter(function (j) {
    if (sub.region && String(j.region || '').indexOf(sub.region) === -1) return false;
    if (sub.level) {
      const levels = (j.levels || []).join(' ');
      if (levels.indexOf(sub.level) === -1) return false;
    }
    if (sub.subject) {
      const subjects = (j.subjects || []).join(' ');
      if (subjects.indexOf(sub.subject) === -1) return false;
    }
    if (sub.role && String(j.role || '').indexOf(sub.role) === -1) return false;
    return true;
  }).slice(0, 10); // עד 10 משרות במייל
}

function buildAlertsEmail_(sub, jobs) {
  const items = jobs.map(function (j) {
    return '<div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:10px;padding:16px 18px;margin-bottom:10px;">' +
      '<div style="font-size:11px;color:#0F9285;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;">' + escHtml_(j.sourceName || '') + '</div>' +
      '<div style="font-size:15px;font-weight:700;color:#0B2A4A;margin:4px 0 8px;line-height:1.3;">' + escHtml_(j.title || '') + '</div>' +
      (j.region ? '<div style="font-size:13px;color:#475569;">' + escHtml_(j.region) + (j.subjects && j.subjects.length ? ' · ' + escHtml_(j.subjects.join(', ')) : '') + '</div>' : '') +
      '<a href="' + escHtml_(j.url) + '" style="display:inline-block;margin-top:10px;background:#0B2A4A;color:#FFF;text-decoration:none;padding:8px 16px;border-radius:999px;font-weight:600;font-size:13px;">פרטים מלאים ←</a>' +
    '</div>';
  }).join('');

  return '<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;color:#0B2A4A;line-height:1.6;max-width:600px;background:#F8FAFC;padding:24px;">' +
    '<h2 style="font-size:20px;color:#0B2A4A;margin:0 0 6px;">בוקר טוב' + (sub.name ? ' ' + escHtml_(sub.name) : '') + '</h2>' +
    '<p style="color:#475569;margin:0 0 18px;">' + jobs.length + ' משרות חדשות שמתאימות לקריטריונים שלך:</p>' +
    items +
    '<p style="font-size:12px;color:#94A3B8;margin-top:24px;">להסרה: השיבי "הסר" למייל הזה. · <a href="https://edura.co.il" style="color:#0F9285;">edura.co.il</a></p>' +
  '</div>';
}

// ════════════════════════════════════════════════════════════════════
// utils
// ════════════════════════════════════════════════════════════════════
function generateRefId_(prefix) {
  const ts = new Date();
  const ymd = Utilities.formatDate(ts, 'Asia/Jerusalem', 'yyyyMMdd');
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return prefix + '-' + ymd + '-' + rand;
}

function isValidEmail_(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function escHtml_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function htmlToText_(html) {
  return String(html || '').replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function log_(action, details) {
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_LOG_SUB);
    if (sh) sh.appendRow([new Date(), action, details]);
  } catch (e) {}
}
