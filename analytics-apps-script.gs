/**
 * Edura Analytics — Google Apps Script web app
 * Pattern matches docs/passover-cards/google-apps-script-analytics.js
 *
 * SETUP:
 * 1. Create a new Google Sheet, name it "Edura Analytics"
 * 2. Add this header row in row 1:
 *      תאריך | אירוע | פרטים | עמוד | מכשיר | session | זמן_שניות | מקור
 * 3. Extensions → Apps Script
 * 4. Paste this entire file. Save.
 * 5. Deploy → New deployment → Web app
 *      Execute as: Me
 *      Who has access: Anyone
 * 6. Copy the Web app URL.
 * 7. Open docs/edura/analytics.js, replace PASTE_YOUR_APPS_SCRIPT_URL_HERE with the URL.
 * 8. Commit + push. Done.
 */

// Spreadsheet ID — Edura sheet (גיליון אדורה הקיים)
var SPREADSHEET_ID = '1-jQCpFVRfTtq2SigUt-ZCO-UQZOm6O5i2nme9jhzVJM';

// Name of the tab inside the spreadsheet where events are appended.
// Change if you want a different tab name.
var SHEET_NAME = 'Analytics';

// CSV/Formula injection guard — prepend ' so Sheets treats value as text
function safe_(v) {
  var s = String(v == null ? '' : v);
  if (s.length > 500) s = s.slice(0, 500);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function doGet(e) {
  var params = (e && e.parameter) || {};
  var callback = params.callback || 'cb';

  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(['תאריך','אירוע','פרטים','עמוד','מכשיר','session','זמן_שניות','מקור']);
    }
    sheet.appendRow([
      new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' }),
      safe_(params.event),
      safe_(params.details),
      safe_(params.page),
      safe_(params.device),
      safe_(params.session),
      safe_(params.duration),
      safe_(params.referrer)
    ]);

    return ContentService
      .createTextOutput(callback + '({"result":"ok"})')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } catch (err) {
    return ContentService
      .createTextOutput(callback + '({"result":"error","msg":"' + String(err).replace(/"/g, '\\"') + '"})')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
}

// sendBeacon hits doPost — handle the same way
function doPost(e) {
  return doGet(e);
}
