/**
 * Edura — Submissions endpoint
 * ─────────────────────────────────────────────────────────────────
 *  פותחת 5 actions:
 *
 *    1. submit_application   — מורה שולח מועמדות למשרה (כולל קובץ קו"ח)
 *    2. submit_job           — מנהל מפרסם משרה חדשה (pending → מייל אישור למיטל)
 *    3. submit_teacher       — מורה מפרסם פרופיל חיפוש (pending → מייל אישור למיטל)
 *    4. subscribe_alerts     — הרשמה להתראה יומית למורות
 *    5. subscribe_principal  — הרשמה להתראה על מכרזי ניהול הסבב הבא
 *
 *  + doGet endpoints:
 *    ?action=approved        — מחזיר רק רשומות שאושרו (לתצוגה באתר)
 *    ?action=approve&type=job|teacher&ref=…&token=… — אישור פרסום בלחיצה אחת מהמייל
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
const SHEET_POSTED_TEACHERS = 'posted_teachers';
const SHEET_ALERTS = 'alerts';
const SHEET_PRINCIPAL_ALERTS = 'principal_alerts';
const SHEET_LOG_SUB = 'log';

// יעד לפניות שמגיעות בלי כתובת מייל ספציפית במשרה (ברירת מחדל)
const ADMIN_EMAIL = 'meytal@edura.co.il';

// סוד לחתימת טוקני אישור בקישורי "אשר פרסום" שמגיעים למייל
// אם רוצים להחליף — שני את ערך זה והגדירי גרסה חדשה ב-Deploy
const APPROVE_SECRET = 'edura-approve-2026-meytal';

// URL של הסוכן הראשי (jobs scanner) — לשליפה ל-daily alerts
const JOBS_API_URL = 'https://script.google.com/macros/s/AKfycbxFqT828xAhAAhe9mJ6h55Kt9i6zKjcRZBscMYjrPkUV1BUuKhqT_n7ZLqC7cNZs7wR-Q/exec';

const APPLICATIONS_HEADERS = ['timestamp', 'ref_id', 'job_id', 'job_title', 'school',
                              'school_email', 'name', 'email', 'phone', 'message',
                              'cv_drive_id', 'cv_drive_url', 'cv_filename', 'status'];
const POSTED_JOBS_HEADERS = ['timestamp', 'ref_id', 'school', 'subject', 'role',
                             'region', 'city', 'level', 'sector', 'scope',
                             'description', 'contact_name', 'email', 'phone', 'status'];
const POSTED_TEACHERS_HEADERS = ['timestamp', 'ref_id', 'name', 'subject', 'level',
                                 'region', 'city', 'scope', 'notes',
                                 'email', 'phone', 'status'];
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
  ensureSheet_(ss, SHEET_POSTED_TEACHERS, POSTED_TEACHERS_HEADERS);
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

    // ─── Bot protection: server-side honeypot ───
    if (body.hp && String(body.hp).trim() !== '') {
      log_('bot-blocked', 'honeypot · action=' + action);
      // pretend success so bot doesn't retry, but don't write
      return json_({ ok: true, refId: 'BOT-BLOCKED' });
    }

    if (action === 'submit_application')   return json_(handleApplication_(body));
    if (action === 'submit_job')           return json_(handlePostJob_(body));
    if (action === 'submit_teacher')       return json_(handlePostTeacher_(body));
    if (action === 'subscribe_alerts')     return json_(handleAlerts_(body));
    if (action === 'subscribe_principal')  return json_(handlePrincipal_(body));

    return json_({ ok: false, error: 'unknown action: ' + action });
  } catch (err) {
    log_('error', String(err));
    return json_({ ok: false, error: String(err) });
  }
}

// doGet — service metadata + approve-by-link + public approved listing
function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = String(params.action || '').toLowerCase();

    if (action === 'approve') {
      return handleApproveByLink_(params);
    }
    if (action === 'reject') {
      return handleApproveByLink_(Object.assign({}, params, { decision: 'reject' }));
    }
    if (action === 'approved') {
      return json_(getApprovedListings_());
    }
    return json_({
      ok: true,
      service: 'Edura submissions',
      actions: ['submit_application', 'submit_job', 'submit_teacher', 'subscribe_alerts', 'subscribe_principal'],
      get_actions: ['approved', 'approve', 'reject']
    });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// ════════════════════════════════════════════════════════════════════
// approve-by-link — נקודת הקצה שלוחצים עליה מהמייל
// ════════════════════════════════════════════════════════════════════
function handleApproveByLink_(params) {
  const type = String(params.type || '').toLowerCase();   // 'job' | 'teacher'
  const refId = String(params.ref || '').trim();
  const token = String(params.token || '').trim();
  const decision = String(params.decision || 'approve').toLowerCase();

  if (!type || !refId || !token) {
    return htmlPage_('שגיאה', 'חסרים פרמטרים: type · ref · token', false);
  }
  const expected = signToken_(type, refId);
  if (token !== expected) {
    return htmlPage_('שגיאת אימות', 'הקישור לא חתום נכון. אם זה ישן — בטח כבר אישרת את הרשומה.', false);
  }

  const sheetName = (type === 'teacher') ? SHEET_POSTED_TEACHERS : SHEET_POSTED_JOBS;
  const headers = (type === 'teacher') ? POSTED_TEACHERS_HEADERS : POSTED_JOBS_HEADERS;
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sh) return htmlPage_('שגיאה', 'גיליון לא נמצא: ' + sheetName, false);

  const last = sh.getLastRow();
  if (last < 2) return htmlPage_('לא נמצא', 'אין הגשות בגיליון.', false);

  const refCol = headers.indexOf('ref_id') + 1;
  const statusCol = headers.indexOf('status') + 1;
  const data = sh.getRange(2, 1, last - 1, headers.length).getValues();

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][refCol - 1]) === refId) {
      const rowNum = i + 2;
      const currStatus = String(data[i][statusCol - 1] || '').toLowerCase();
      const newStatus = (decision === 'reject') ? 'rejected' : 'approved';
      if (currStatus === newStatus) {
        return htmlPage_(
          decision === 'reject' ? 'כבר נדחתה' : 'כבר אושרה',
          'הרשומה ' + refId + ' כבר במצב "' + newStatus + '". לא בוצע שינוי נוסף.',
          true
        );
      }
      sh.getRange(rowNum, statusCol).setValue(newStatus);
      log_('approve-link', refId + ' · ' + type + ' · → ' + newStatus);

      // ─── Send notification emails on approval ───
      let extraMsg = '';
      if (decision !== 'reject') {
        try {
          notifyPublisherOnApproval_(type, data[i], refId);
        } catch (e) { log_('notify-publisher-error', refId + ' · ' + String(e)); }
        if (type === 'job') {
          try {
            const matched = notifyMatchingTeachersForJob_(data[i], refId);
            log_('notify-teachers', refId + ' · matched ' + matched + ' teachers');
            if (matched > 0) extraMsg = ' נשלחו התראות ל-' + matched + ' מורות תואמות.';
          } catch (e) { log_('notify-teachers-error', refId + ' · ' + String(e)); }
        }
      }

      const title = (decision === 'reject') ? 'נדחתה' : 'אושרה ופורסמה';
      const msg = (decision === 'reject')
        ? 'ההגשה ' + refId + ' סומנה כנדחית. היא לא תוצג באתר.'
        : 'ההגשה ' + refId + ' אושרה ותופיע באתר.' + extraMsg + ' תודה!';
      return htmlPage_(title, msg, true);
    }
  }
  return htmlPage_('לא נמצא', 'לא נמצאה רשומה עם מזהה ' + refId, false);
}

// ════════════════════════════════════════════════════════════════════
// HTML confirmation email — used at submission time (before approval)
// ════════════════════════════════════════════════════════════════════
function buildConfirmationEmail_(o) {
  // o: { greetingName, chip, headline, paragraphs[], refId }
  const paragraphs = (o.paragraphs || []).map(function (p) {
    return '<p style="margin:0 0 14px;color:#1A1A1A;">' + escHtml_(p) + '</p>';
  }).join('');
  return '<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;color:#000;line-height:1.6;max-width:600px;background:#FDF2F8;padding:24px;">' +
    '<div style="background:#FFF;border-radius:18px;padding:28px 24px;border:1px solid #FCE7F3;">' +
      (o.chip ? '<div style="background:#FCE7F3;color:#9D174D;font-size:11px;font-weight:800;display:inline-block;padding:4px 12px;border-radius:999px;letter-spacing:1px;margin-bottom:14px;">' + escHtml_(o.chip) + '</div>' : '') +
      '<h2 style="margin:0 0 14px;color:#000;font-size:22px;line-height:1.3;">' + escHtml_(o.headline) + '</h2>' +
      (o.greetingName ? '<p style="margin:0 0 14px;color:#1A1A1A;">שלום ' + escHtml_(o.greetingName) + ',</p>' : '') +
      paragraphs +
      (o.refId ? '<p style="margin:14px 0 0;font-size:13px;color:#4A4A4A;">מספר פנייה: <code style="background:#FDF2F8;padding:2px 8px;border-radius:6px;font-size:12px;">' + escHtml_(o.refId) + '</code></p>' : '') +
    '</div>' +
    '<p style="text-align:center;font-size:12px;color:#4A4A4A;margin:18px 0 0;">— אדורה · <a href="https://edura.co.il" style="color:#9D174D;">edura.co.il</a></p>' +
  '</div>';
}

// ════════════════════════════════════════════════════════════════════
// Approval notifications — to publisher + matching teachers
// ════════════════════════════════════════════════════════════════════
function notifyPublisherOnApproval_(type, row, refId) {
  if (type === 'job') {
    const school      = String(row[POSTED_JOBS_HEADERS.indexOf('school')] || '');
    const subject     = String(row[POSTED_JOBS_HEADERS.indexOf('subject')] || '');
    const contactName = String(row[POSTED_JOBS_HEADERS.indexOf('contact_name')] || '');
    const email       = String(row[POSTED_JOBS_HEADERS.indexOf('email')] || '').trim();
    if (!email) return;

    const html = '<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;color:#000;line-height:1.6;max-width:600px;background:#FDF2F8;padding:24px;">' +
      '<div style="background:#FFF;border-radius:18px;padding:28px 24px;border:1px solid #FCE7F3;">' +
        '<div style="background:#FCE7F3;color:#9D174D;font-size:11px;font-weight:800;display:inline-block;padding:4px 12px;border-radius:999px;letter-spacing:1px;margin-bottom:14px;">המשרה אושרה</div>' +
        '<h2 style="margin:0 0 12px;color:#000;font-size:22px;line-height:1.3;">המשרה שלכם פורסמה ב-אדורה</h2>' +
        '<p style="margin:0 0 12px;color:#1A1A1A;">שלום ' + escHtml_(contactName) + ',</p>' +
        '<p style="margin:0 0 16px;">בקשת הפרסום של <strong>' + escHtml_(school) + '</strong> למשרת <strong>' + escHtml_(subject) + '</strong> אושרה ועלתה לאוויר.</p>' +
        '<p style="margin:0 0 16px;">מורות רשומות במאגר עם התאמה למשרה יקבלו התראה ויפנו אליכם ישירות במייל / טלפון. אין מתווכים, אין עמלות.</p>' +
        '<a href="https://edura.co.il" style="display:inline-block;background:#EC4899;color:#FFF;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:700;">לצפייה בלוח →</a>' +
        '<p style="margin:18px 0 0;font-size:13px;color:#4A4A4A;">מספר פנייה: <code>' + escHtml_(refId) + '</code></p>' +
      '</div>' +
      '<p style="text-align:center;font-size:12px;color:#4A4A4A;margin:18px 0 0;">— אדורה · edura.co.il</p>' +
    '</div>';

    MailApp.sendEmail(email, 'המשרה שלכם פורסמה ב-אדורה (' + refId + ')',
      htmlToText_(html), { name: 'אדורה · edura.co.il', replyTo: ADMIN_EMAIL, htmlBody: html });
    log_('notify-publisher', refId + ' · job → ' + email);
  } else if (type === 'teacher') {
    const name  = String(row[POSTED_TEACHERS_HEADERS.indexOf('name')] || '');
    const email = String(row[POSTED_TEACHERS_HEADERS.indexOf('email')] || '').trim();
    if (!email) return;

    const html = '<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;color:#000;line-height:1.6;max-width:600px;background:#FDF2F8;padding:24px;">' +
      '<div style="background:#FFF;border-radius:18px;padding:28px 24px;border:1px solid #FCE7F3;">' +
        '<div style="background:#FCE7F3;color:#9D174D;font-size:11px;font-weight:800;display:inline-block;padding:4px 12px;border-radius:999px;letter-spacing:1px;margin-bottom:14px;">הפרופיל אושר</div>' +
        '<h2 style="margin:0 0 12px;color:#000;font-size:22px;line-height:1.3;">הפרופיל שלך נכנס למאגר</h2>' +
        '<p style="margin:0 0 12px;color:#1A1A1A;">שלום ' + escHtml_(name) + ',</p>' +
        '<p style="margin:0 0 16px;">הפרטים שלך נכנסו למאגר המורים של אדורה. כשיתפרסמו משרות מתאימות לאזור, מקצוע ושכבה שציינת — תקבל/י מאיתנו מייל ישירות.</p>' +
        '<p style="margin:0 0 16px;">בינתיים אפשר לעיין בכל המשרות הזמינות:</p>' +
        '<a href="https://edura.co.il" style="display:inline-block;background:#EC4899;color:#FFF;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:700;">לצפייה במשרות →</a>' +
        '<p style="margin:18px 0 0;font-size:13px;color:#4A4A4A;">מספר פנייה: <code>' + escHtml_(refId) + '</code></p>' +
      '</div>' +
      '<p style="text-align:center;font-size:12px;color:#4A4A4A;margin:18px 0 0;">— אדורה · edura.co.il</p>' +
    '</div>';

    MailApp.sendEmail(email, 'הפרופיל שלך אושר במאגר אדורה (' + refId + ')',
      htmlToText_(html), { name: 'אדורה · edura.co.il', replyTo: ADMIN_EMAIL, htmlBody: html });
    log_('notify-publisher', refId + ' · teacher → ' + email);
  }
}

function notifyMatchingTeachersForJob_(jobRow, refId) {
  const jSchool  = String(jobRow[POSTED_JOBS_HEADERS.indexOf('school')] || '');
  const jSubject = String(jobRow[POSTED_JOBS_HEADERS.indexOf('subject')] || '').trim();
  const jCity    = String(jobRow[POSTED_JOBS_HEADERS.indexOf('city')] || '').trim();
  const jRegion  = String(jobRow[POSTED_JOBS_HEADERS.indexOf('region')] || '').trim();
  const jLevel   = String(jobRow[POSTED_JOBS_HEADERS.indexOf('level')] || '').trim();
  const jRole    = String(jobRow[POSTED_JOBS_HEADERS.indexOf('role')] || '').trim();
  const jScope   = String(jobRow[POSTED_JOBS_HEADERS.indexOf('scope')] || '').trim();
  const jDesc    = String(jobRow[POSTED_JOBS_HEADERS.indexOf('description')] || '').trim();

  if (!jSubject) return 0;

  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_POSTED_TEACHERS);
  if (!sh) return 0;
  const last = sh.getLastRow();
  if (last < 2) return 0;

  const data = sh.getRange(2, 1, last - 1, POSTED_TEACHERS_HEADERS.length).getValues();
  const idx = function (h) { return POSTED_TEACHERS_HEADERS.indexOf(h); };

  let sent = 0;
  data.forEach(function (row) {
    const status = String(row[idx('status')] || '').toLowerCase();
    if (status !== 'approved') return;

    const tSubject = String(row[idx('subject')] || '').trim();
    const tCity    = String(row[idx('city')] || '').trim();
    const tRegion  = String(row[idx('region')] || '').trim();
    const tLevel   = String(row[idx('level')] || '').trim();
    const tEmail   = String(row[idx('email')] || '').trim();
    const tName    = String(row[idx('name')] || '').trim();

    if (!tEmail) return;

    // Subject — required match (substring either way)
    const subjectMatch = !!(tSubject && (
      jSubject.indexOf(tSubject) !== -1 ||
      tSubject.indexOf(jSubject) !== -1
    ));
    if (!subjectMatch) return;

    // Location — same city OR same region OR teacher = "כל הארץ"
    const locationMatch = (
      (jCity && tCity && jCity === tCity) ||
      (jRegion && tRegion && jRegion === tRegion) ||
      (tRegion && tRegion.indexOf('כל הארץ') !== -1) ||
      !tCity && !tRegion // teacher didn't specify — match all
    );
    if (!locationMatch) return;

    // Level — if teacher specified, must match
    if (tLevel && jLevel && tLevel !== jLevel) return;

    const html = '<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;color:#000;line-height:1.6;max-width:600px;background:#FDF2F8;padding:24px;">' +
      '<div style="background:#FFF;border-radius:18px;padding:28px 24px;border:1px solid #FCE7F3;">' +
        '<div style="background:#FCE7F3;color:#9D174D;font-size:11px;font-weight:800;display:inline-block;padding:4px 12px;border-radius:999px;letter-spacing:1px;margin-bottom:14px;">משרה תואמת חדשה</div>' +
        '<h2 style="margin:0 0 8px;color:#000;font-size:22px;line-height:1.3;">' + escHtml_(jSubject) + (jRole ? ' · ' + escHtml_(jRole) : '') + '</h2>' +
        '<div style="font-size:14px;color:#4A4A4A;margin:0 0 16px;">' + escHtml_(jSchool) + (jCity ? ' · ' + escHtml_(jCity) : '') + '</div>' +
        '<p style="margin:0 0 16px;color:#1A1A1A;">שלום ' + escHtml_(tName) + ',</p>' +
        '<p style="margin:0 0 16px;">פורסמה משרה חדשה במאגר אדורה שעשויה להתאים לך:</p>' +
        '<table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-size:14px;">' +
          (jLevel ? '<tr><td style="padding:6px 0;color:#4A4A4A;width:90px;">שכבה:</td><td style="color:#000;font-weight:600;">' + escHtml_(jLevel) + '</td></tr>' : '') +
          (jRegion ? '<tr><td style="padding:6px 0;color:#4A4A4A;">אזור:</td><td style="color:#000;font-weight:600;">' + escHtml_(jRegion) + '</td></tr>' : '') +
          (jScope ? '<tr><td style="padding:6px 0;color:#4A4A4A;">היקף:</td><td style="color:#000;font-weight:600;">' + escHtml_(jScope) + '</td></tr>' : '') +
        '</table>' +
        (jDesc ? '<p style="background:#FDF2F8;padding:12px 14px;border-radius:10px;font-size:13.5px;color:#1A1A1A;margin:0 0 16px;">' + escHtml_(jDesc) + '</p>' : '') +
        '<a href="https://edura.co.il" style="display:inline-block;background:#EC4899;color:#FFF;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:700;">לפנייה ישירה לבית הספר →</a>' +
        '<p style="margin:18px 0 0;font-size:11.5px;color:#4A4A4A;line-height:1.5;">קיבלת מייל זה כי נרשמת למאגר המורים של אדורה. רוצה להפסיק התראות? כתבו ל-meytal@edura.co.il</p>' +
      '</div>' +
      '<p style="text-align:center;font-size:12px;color:#4A4A4A;margin:18px 0 0;">— אדורה · edura.co.il</p>' +
    '</div>';

    try {
      MailApp.sendEmail(tEmail, 'משרה תואמת חדשה — ' + jSubject + ' · ' + jSchool,
        htmlToText_(html), { name: 'אדורה · edura.co.il', replyTo: ADMIN_EMAIL, htmlBody: html });
      sent++;
    } catch (e) { log_('match-email-error', tEmail + ' · ' + String(e)); }
  });

  return sent;
}

function signToken_(type, refId) {
  const raw = type + '|' + refId + '|' + APPROVE_SECRET;
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return bytes.map(function (b) { return ((b & 0xff) + 0x100).toString(16).slice(1); }).join('').slice(0, 24);
}

function approveLink_(type, refId, decision) {
  const baseUrl = ScriptApp.getService().getUrl();
  const token = signToken_(type, refId);
  return baseUrl + '?action=' + (decision || 'approve') + '&type=' + encodeURIComponent(type) +
         '&ref=' + encodeURIComponent(refId) + '&token=' + token;
}

function htmlPage_(title, msg, success) {
  const color = success ? '#0F9285' : '#B91C1C';
  const bg = success ? '#CCFBF1' : '#FEE2E2';
  const html =
    '<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>אדורה · ' + escHtml_(title) + '</title>' +
    '<style>body{margin:0;font-family:Heebo,Arial,sans-serif;background:#F8FAFC;color:#0B2A4A;display:grid;place-items:center;min-height:100vh;padding:24px}' +
    '.box{background:#fff;max-width:480px;width:100%;border-radius:18px;padding:32px 28px;box-shadow:0 10px 40px rgba(0,0,0,.06);text-align:center}' +
    '.tag{display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.5px;background:' + bg + ';color:' + color + ';padding:5px 12px;border-radius:999px;margin-bottom:14px}' +
    'h1{margin:0 0 12px;font-size:22px}p{color:#475569;line-height:1.6;margin:0 0 18px}' +
    'a.btn{display:inline-block;background:#0B2A4A;color:#fff;text-decoration:none;padding:10px 20px;border-radius:999px;font-weight:600;font-size:13px}' +
    '</style></head><body><div class="box">' +
    '<div class="tag">אדורה · ניהול פרסומים</div>' +
    '<h1>' + escHtml_(title) + '</h1>' +
    '<p>' + escHtml_(msg) + '</p>' +
    '<a class="btn" href="https://edura.co.il">חזרה לאתר ←</a>' +
    '</div></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ════════════════════════════════════════════════════════════════════
// approved listing — מחזיר רק רשומות status='approved' לתצוגה באתר
// ════════════════════════════════════════════════════════════════════
function getApprovedListings_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const jobs = readApproved_(ss, SHEET_POSTED_JOBS, POSTED_JOBS_HEADERS);
  const teachers = readApproved_(ss, SHEET_POSTED_TEACHERS, POSTED_TEACHERS_HEADERS);
  return { ok: true, jobs: jobs, teachers: teachers, updated: new Date().toISOString() };
}

function readApproved_(ss, sheetName, headers) {
  const sh = ss.getSheetByName(sheetName);
  if (!sh) return [];
  const last = sh.getLastRow();
  if (last < 2) return [];
  const statusIdx = headers.indexOf('status');
  const data = sh.getRange(2, 1, last - 1, headers.length).getValues();
  const out = [];
  data.forEach(function (row) {
    if (String(row[statusIdx] || '').toLowerCase() !== 'approved') return;
    const obj = {};
    for (let i = 0; i < headers.length; i++) {
      let v = row[i];
      if (v instanceof Date) v = v.toISOString();
      if (headers[i] === 'phone') v = formatPhone_(v);
      obj[headers[i]] = v;
    }
    out.push(obj);
  });
  return out;
}

// נרמול טלפון — Sheets מורידה 0 מתחילי מספר. מחזיר תמיד מחרוזת עם 0.
function formatPhone_(p) {
  if (p === null || p === undefined || p === '') return '';
  let s = String(p).replace(/[^\d]/g, '');
  if (s.length === 9 && !s.startsWith('0')) s = '0' + s;
  return s;
}

// בעת appendRow — קידומת ' מאלצת אחסון כטקסט (לא נראית בתא ולא בקריאה).
function phoneForStorage_(p) {
  const s = formatPhone_(p);
  return s ? "'" + s : '';
}

// ════════════════════════════════════════════════════════════════════
// 1. submit_application — מורה שולח מועמדות
// ════════════════════════════════════════════════════════════════════
function handleApplication_(b) {
  const name = String(b.name || '').trim();
  const email = String(b.email || '').trim();
  const phone = formatPhone_(b.phone);
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
                name, email, phoneForStorage_(phone), message, cvId, cvUrl, cvFilename, 'sent']);

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
    const appConfHtml = buildConfirmationEmail_({
      chip: 'הפנייה נשלחה',
      headline: 'הפנייה שלך נשלחה — בהצלחה!',
      greetingName: name,
      paragraphs: [
        'הפנייה שלך למשרה "' + (jobTitle || school || 'הוראה') + '" נשלחה בהצלחה.',
        schoolEmail
          ? 'הפנייה הועברה ישירות לבית הספר. הם יחזרו אלייך למייל הזה.'
          : 'הפנייה הגיעה אלינו ב-אדורה. אם תהיה התקדמות — נעדכן אותך.',
        'בהצלחה!'
      ],
      refId: refId
    });
    MailApp.sendEmail(email, 'אישור פנייה למשרה · אדורה (' + refId + ')',
      htmlToText_(appConfHtml),
      { name: 'אדורה · edura.co.il', replyTo: ADMIN_EMAIL, htmlBody: appConfHtml });

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
  const phone = formatPhone_(b.phone);

  if (!school || !subject || !contactName || !email || !phone) {
    return { ok: false, error: 'שם בית ספר, מקצוע, איש קשר, מייל וטלפון — חובה' };
  }
  if (!isValidEmail_(email)) return { ok: false, error: 'מייל לא תקין' };

  const refId = generateRefId_('JOB');
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_POSTED_JOBS);
  sh.appendRow([new Date(), refId, school, subject, role, region, city, level,
                sector, scope, description, contactName, email, phoneForStorage_(phone), 'pending']);

  const approveUrl = approveLink_('job', refId, 'approve');
  const rejectUrl = approveLink_('job', refId, 'reject');

  const fields = [
    { label: 'בית ספר', value: school },
    { label: 'מקצוע', value: subject },
    { label: 'תפקיד', value: role },
    { label: 'אזור', value: region + (city ? ' · ' + city : '') },
    { label: 'שכבה', value: level },
    { label: 'מגזר', value: sector },
    { label: 'היקף', value: scope },
    { label: 'תיאור', value: description },
    { label: 'איש קשר', value: contactName },
    { label: 'מייל', value: email },
    { label: 'טלפון', value: phone }
  ];
  const html = buildApprovalEmail_({
    type: 'job',
    title: 'משרה חדשה לפרסום — ' + school,
    refId: refId,
    fields: fields,
    approveUrl: approveUrl,
    rejectUrl: rejectUrl
  });

  try {
    MailApp.sendEmail(ADMIN_EMAIL, '[אדורה · ' + refId + '] משרה ממתינה לאישור — ' + school,
      htmlToText_(html), { name: 'אדורה · edura.co.il', replyTo: email, htmlBody: html });

    // אישור קבלה למנהל המגיש
    const confHtml = buildConfirmationEmail_({
      chip: 'בקשה התקבלה',
      headline: 'בקשת הפרסום שלכם בבדיקה',
      greetingName: contactName,
      paragraphs: [
        'בקשת הפרסום של ' + school + ' למשרת ' + subject + ' התקבלה ונמצאת בבדיקה אצלנו.',
        'אחרי אישור (תוך 24 שעות) המשרה תופיע ב-edura.co.il ומורות רשומות יקבלו התראה אוטומטית. הן יפנו אליכם ישירות במייל / טלפון — בלי מתווכים.'
      ],
      refId: refId
    });
    MailApp.sendEmail(email, 'התקבלה בקשת פרסום באדורה (' + refId + ')',
      htmlToText_(confHtml),
      { name: 'אדורה · edura.co.il', replyTo: ADMIN_EMAIL, htmlBody: confHtml });
    log_('job-posted', refId + ' · ' + school);
    return { ok: true, refId: refId };
  } catch (err) {
    log_('job-post-error', refId + ' · ' + String(err));
    return { ok: false, error: 'שמירה הצליחה אך מייל נכשל. נחזור אלייך תוך 24 שעות (' + refId + ')' };
  }
}

// ════════════════════════════════════════════════════════════════════
// 3. submit_teacher — מורה מפרסם פרופיל חיפוש (ממתין לאישור מיטל)
// ════════════════════════════════════════════════════════════════════
function handlePostTeacher_(b) {
  const name = String(b.name || '').trim();
  const subject = String(b.subject || '').trim();
  const level = String(b.level || '').trim();
  const region = String(b.region || '').trim();
  const city = String(b.city || '').trim();
  const scope = String(b.scope || '').trim();
  const notes = String(b.notes || '').trim();
  const email = String(b.email || '').trim();
  const phone = formatPhone_(b.phone);

  if (!name || !subject || !email) {
    return { ok: false, error: 'שם, מקצוע ומייל הם חובה' };
  }
  if (!isValidEmail_(email)) return { ok: false, error: 'מייל לא תקין' };

  const refId = generateRefId_('TCH');
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_POSTED_TEACHERS);
  sh.appendRow([new Date(), refId, name, subject, level, region, city,
                scope, notes, email, phoneForStorage_(phone), 'pending']);

  const approveUrl = approveLink_('teacher', refId, 'approve');
  const rejectUrl = approveLink_('teacher', refId, 'reject');

  const fields = [
    { label: 'שם', value: name },
    { label: 'מקצוע', value: subject },
    { label: 'שכבה', value: level },
    { label: 'אזור', value: region + (city ? ' · ' + city : '') },
    { label: 'היקף', value: scope },
    { label: 'הערות', value: notes },
    { label: 'מייל', value: email },
    { label: 'טלפון', value: phone }
  ];
  const html = buildApprovalEmail_({
    type: 'teacher',
    title: 'מורה חדש/ה לפרסום — ' + name,
    refId: refId,
    fields: fields,
    approveUrl: approveUrl,
    rejectUrl: rejectUrl
  });

  try {
    MailApp.sendEmail(ADMIN_EMAIL, '[אדורה · ' + refId + '] מורה ממתין לאישור — ' + name,
      htmlToText_(html), { name: 'אדורה · edura.co.il', replyTo: email, htmlBody: html });

    // אישור קבלה למורה המגיש
    const confHtml = buildConfirmationEmail_({
      chip: 'בקשה התקבלה',
      headline: 'הפרופיל שלך בבדיקה',
      greetingName: name,
      paragraphs: [
        'הפרטים שלך התקבלו ונמצאים בבדיקה אצלנו.',
        'אחרי אישור (תוך 24 שעות) הפרופיל ייכנס למאגר אדורה. כשיתפרסמו משרות מתאימות לאזור, מקצוע ושכבה שציינת — תקבל/י מאיתנו מייל ישירות.'
      ],
      refId: refId
    });
    MailApp.sendEmail(email, 'התקבלה בקשת פרסום באדורה (' + refId + ')',
      htmlToText_(confHtml),
      { name: 'אדורה · edura.co.il', replyTo: ADMIN_EMAIL, htmlBody: confHtml });
    log_('teacher-posted', refId + ' · ' + name);
    return { ok: true, refId: refId };
  } catch (err) {
    log_('teacher-post-error', refId + ' · ' + String(err));
    return { ok: false, error: 'שמירה הצליחה אך מייל נכשל. נחזור אלייך תוך 24 שעות (' + refId + ')' };
  }
}

// ════════════════════════════════════════════════════════════════════
// buildApprovalEmail_ — מייל אישור עם כפתורי "אשר ופרסם" / "דחה"
// ════════════════════════════════════════════════════════════════════
function buildApprovalEmail_(d) {
  const rows = d.fields.filter(function (f) { return f.value && String(f.value).trim() !== ''; })
    .map(function (f) {
      return '<tr><td style="padding:8px 0;width:90px;color:#475569;vertical-align:top;">' + escHtml_(f.label) + ':</td>' +
             '<td style="padding:8px 0;color:#0B2A4A;">' + escHtml_(f.value).replace(/\n/g, '<br>') + '</td></tr>';
    }).join('');

  return '' +
    '<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;color:#0B2A4A;line-height:1.6;max-width:600px;background:#F8FAFC;padding:24px;">' +
    '<div style="background:#fff;border-radius:14px;padding:24px;box-shadow:0 4px 20px rgba(0,0,0,.04);">' +
    '<div style="font-size:11px;color:#0F9285;font-weight:700;letter-spacing:0.5px;margin-bottom:6px;">אדורה · ממתין לאישור · ' + escHtml_(d.refId) + '</div>' +
    '<h2 style="margin:0 0 18px;font-size:20px;color:#0B2A4A;">' + escHtml_(d.title) + '</h2>' +
    '<table style="border-collapse:collapse;width:100%;margin:0 0 22px;">' + rows + '</table>' +
    '<div style="display:block;text-align:center;margin:18px 0 6px;">' +
      '<a href="' + d.approveUrl + '" style="display:inline-block;background:#0F9285;color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:700;font-size:15px;margin:4px;">✓ אשר ופרסם</a>' +
      '<a href="' + d.rejectUrl + '" style="display:inline-block;background:#fff;color:#B91C1C;border:2px solid #FCA5A5;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:700;font-size:15px;margin:4px;">✕ דחה</a>' +
    '</div>' +
    '<p style="font-size:12px;color:#94A3B8;margin:18px 0 0;text-align:center;">אישור פותח עמוד אישור באדורה ומסמן את הרשומה ' + escHtml_(d.refId) + ' כ-approved. הקישור חתום ולא ניתן לזיוף.</p>' +
    '</div></div>';
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
  const phone = formatPhone_(b.phone);

  if (!email || !isValidEmail_(email)) return { ok: false, error: 'מייל לא תקין' };

  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PRINCIPAL_ALERTS);
  const last = sh.getLastRow();
  if (last >= 2) {
    const data = sh.getRange(2, 1, last - 1, PRINCIPAL_ALERTS_HEADERS.length).getValues();
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][1]).toLowerCase() === email.toLowerCase()) {
        sh.getRange(i + 2, 3, 1, 4).setValues([[name, region, phoneForStorage_(phone), true]]);
        log_('principal-updated', email);
        return { ok: true, updated: true };
      }
    }
  }
  sh.appendRow([new Date(), email, name, region, phoneForStorage_(phone), true, '']);

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

  // רק משרות מ-24 שעות אחרונות (תאריך מ-date_iso/firstSeen/date)
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const fresh = jobs.filter(function (j) {
    const raw = j.date_iso || j.firstSeen || j.date || '';
    const t = new Date(raw).getTime();
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
      const lv = String(j.level || '') + ' ' + (Array.isArray(j.levels) ? j.levels.join(' ') : '');
      if (lv.indexOf(sub.level) === -1) return false;
    }
    if (sub.subject) {
      const sj = String(j.subject || '') + ' ' + (Array.isArray(j.subjects) ? j.subjects.join(' ') : '');
      if (sj.indexOf(sub.subject) === -1) return false;
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
      (j.region ? '<div style="font-size:13px;color:#475569;">' + escHtml_(j.region) + (j.subject ? ' · ' + escHtml_(j.subject) : (j.subjects && j.subjects.length ? ' · ' + escHtml_(j.subjects.join(', ')) : '')) + '</div>' : '') +
      '<a href="' + escHtml_(j.url) + '" style="display:inline-block;margin-top:10px;background:#0B2A4A;color:#FFF;text-decoration:none;padding:8px 16px;border-radius:999px;font-weight:600;font-size:13px;">פרטים מלאים ←</a>' +
    '</div>';
  }).join('');

  return '<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;color:#0B2A4A;line-height:1.6;max-width:600px;background:#F8FAFC;padding:24px;">' +
    '<h2 style="font-size:20px;color:#0B2A4A;margin:0 0 6px;">בוקר טוב' + (sub.name ? ' ' + escHtml_(sub.name) : '') + '</h2>' +
    '<p style="color:#475569;margin:0 0 18px;">' + jobs.length + ' משרות חדשות שמתאימות לקריטריונים שלך:</p>' +
    items +
    '<p style="font-size:12px;color:#475569;margin-top:24px;">להסרה: השיבו "הסר" למייל הזה. · <a href="https://edura.co.il" style="color:#0F9285;">edura.co.il</a></p>' +
  '</div>';
}

// ════════════════════════════════════════════════════════════════════
// fixPhoneNumbers — תיקון רטרואקטיבי לרשומות שאוחסן בהן טלפון כמספר
// הריצי פעם אחת אחרי deploy של הגרסה הזו
// ════════════════════════════════════════════════════════════════════
function fixPhoneNumbers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const targets = [
    { name: SHEET_APPLICATIONS,     headers: APPLICATIONS_HEADERS },
    { name: SHEET_POSTED_JOBS,      headers: POSTED_JOBS_HEADERS },
    { name: SHEET_POSTED_TEACHERS,  headers: POSTED_TEACHERS_HEADERS },
    { name: SHEET_PRINCIPAL_ALERTS, headers: PRINCIPAL_ALERTS_HEADERS }
  ];
  let fixed = 0;
  targets.forEach(function (t) {
    const sh = ss.getSheetByName(t.name);
    if (!sh) return;
    const last = sh.getLastRow();
    if (last < 2) return;
    const phoneCol = t.headers.indexOf('phone') + 1;
    if (phoneCol === 0) return;
    sh.getRange(2, phoneCol, last - 1, 1).setNumberFormat('@');
    const range = sh.getRange(2, phoneCol, last - 1, 1);
    const values = range.getValues();
    const updated = values.map(function (row) {
      const fixed = formatPhone_(row[0]);
      return [fixed ? "'" + fixed : ''];
    });
    range.setValues(updated);
    fixed += values.length;
  });
  log_('fix-phones', 'Normalized phone numbers in ' + fixed + ' rows');
  try { SpreadsheetApp.getUi().alert('✓ תוקנו ' + fixed + ' שורות. כל הטלפונים מאוחסנים עכשיו כטקסט עם 0 בהתחלה.'); } catch (e) {}
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
