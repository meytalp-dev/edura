"""
ממזג igm + itu + shatil ל-jobs.json אחיד — רק משרות הוראה (מורים בלבד).
"""
import json, re, hashlib
from pathlib import Path

ROOT = Path(__file__).parent
RAW = ROOT / 'raw'
OUT = ROOT / 'jobs.json'
MANUAL_EDITS = ROOT / 'manual-edits.json'


def load(name):
    with open(RAW / name, 'r', encoding='utf-8') as f:
        return json.load(f)


# ─── מיפוי אזורים אחיד ─────────────────────────────────────────────
REGION_NORMALIZE = {
    'ירושלים והסביבה': 'ירושלים',
    'אזור ירושלים':    'ירושלים',
    'מחוז ירושלים':    'ירושלים',
    'מרכז':            'מרכז',
    'אזור ת"א והמרכז': 'מרכז',
    'אזור השרון והמשולש': 'מרכז',
    'מחוז ת"א':        'מרכז',
    'מחוז מרכז':       'מרכז',
    'אזור השפלה':      'שפלה',
    'אזור הצפון':      'צפון',
    'מחוז צפון':       'צפון',
    'אזור חיפה':       'צפון',
    'מחוז חיפה':       'צפון',
    'אזור הדרום':      'דרום',
    'מחוז דרום':       'דרום',
    'ארצי':            'ארצי',
    'אינטרנט':         'מקוון',
    'בין לאומי':       'חו"ל',
}


# ─── מילון ערים → אזור (לחילוץ city מטקסט) ──────────────────────
CITIES = {
    # ירושלים והסביבה
    'ירושלים': 'ירושלים', 'מבשרת ציון': 'ירושלים', 'מבשרת': 'ירושלים',
    'מעלה אדומים': 'ירושלים', 'גבעת זאב': 'ירושלים', 'מטה יהודה': 'ירושלים',
    'אבו גוש': 'ירושלים', 'הר אדר': 'ירושלים', 'אפרת': 'ירושלים',
    'גוש עציון': 'ירושלים', 'בית אל': 'ירושלים', 'אריאל': 'ירושלים',
    'מודיעין עילית': 'ירושלים',
    # תל אביב וגוש דן
    'תל אביב': 'מרכז', 'ת"א': 'מרכז', 'ת״א': 'מרכז', 'תל אביב יפו': 'מרכז',
    'יפו': 'מרכז', 'רמת גן': 'מרכז', 'גבעתיים': 'מרכז', 'בני ברק': 'מרכז',
    'הרצליה': 'מרכז', 'רעננה': 'מרכז', 'כפר סבא': 'מרכז', 'הוד השרון': 'מרכז',
    'רמת השרון': 'מרכז', 'פתח תקווה': 'מרכז', 'פ"ת': 'מרכז', 'פ״ת': 'מרכז',
    'ראשון לציון': 'מרכז', 'ראשל"צ': 'מרכז', 'ראשל״צ': 'מרכז',
    'חולון': 'מרכז', 'בת ים': 'מרכז', 'נתניה': 'מרכז', 'רחובות': 'מרכז',
    'נס ציונה': 'מרכז', 'יבנה': 'מרכז', 'ראש העין': 'מרכז', 'יהוד': 'מרכז',
    'אור יהודה': 'מרכז', 'גני תקווה': 'מרכז', 'אזור': 'מרכז',
    'שוהם': 'מרכז', 'חריש': 'מרכז', 'כפר אורנים': 'מרכז',
    'גני יהודה': 'מרכז', 'סביון': 'מרכז', 'קריית אונו': 'מרכז',
    'קרית אונו': 'מרכז', 'מבשרת ציון': 'מרכז', 'אבן יהודה': 'מרכז',
    'כפר יונה': 'מרכז', 'קדימה': 'מרכז', 'צורן': 'מרכז',
    'נוה ימין': 'מרכז', 'יקיר': 'מרכז', 'אלקנה': 'מרכז',
    'חוף השרון': 'מרכז', 'חוף הכרמל': 'מרכז', 'גליל ים': 'מרכז',
    # שרון וצפון מרכז
    'אבן ספיר': 'מרכז', 'גן יבנה': 'דרום',
    # שפלה
    'מודיעין': 'שפלה', 'לוד': 'שפלה', 'רמלה': 'שפלה', 'גדרה': 'שפלה',
    'גן רווה': 'שפלה', 'באר יעקב': 'שפלה', 'מודיעין מכבים רעות': 'שפלה',
    'בית אריה': 'שפלה', 'בית שמש': 'שפלה', 'מבוא חורון': 'שפלה',
    # דרום
    'אשדוד': 'דרום', 'אשקלון': 'דרום', 'באר שבע': 'דרום',
    'דימונה': 'דרום', 'אילת': 'דרום', 'נתיבות': 'דרום', 'אופקים': 'דרום',
    'שדרות': 'דרום', 'קרית גת': 'דרום', 'קריית גת': 'דרום',
    'קריית מלאכי': 'דרום', 'קרית מלאכי': 'דרום', 'גן יבנה': 'דרום',
    'מצפה רמון': 'דרום', 'ערד': 'דרום', 'ירוחם': 'דרום',
    'נווה זוהר': 'דרום', 'תל שבע': 'דרום', 'רהט': 'דרום',
    'שגב שלום': 'דרום', 'להבים': 'דרום', 'מיתר': 'דרום', 'עומר': 'דרום',
    'כרמיה': 'דרום', 'קמ"ג': 'דרום', 'נווה נחום': 'דרום',
    # צפון
    'חיפה': 'צפון', 'נצרת': 'צפון', 'נצרת עילית': 'צפון', 'נוף הגליל': 'צפון',
    'עכו': 'צפון', 'נהריה': 'צפון',
    'קרית ביאליק': 'צפון', 'קריית ביאליק': 'צפון',
    'קרית ים': 'צפון', 'קריית ים': 'צפון',
    'קרית מוצקין': 'צפון', 'קריית מוצקין': 'צפון',
    'קרית אתא': 'צפון', 'קריית אתא': 'צפון',
    'קרית טבעון': 'צפון', 'קריית טבעון': 'צפון', 'טבעון': 'צפון',
    'קרית שמואל': 'צפון', 'קרית שמונה': 'צפון', 'קריית שמונה': 'צפון',
    'הקריות': 'צפון', 'קריות': 'צפון',
    'טבריה': 'צפון', 'צפת': 'צפון', 'כרמיאל': 'צפון', 'מגדל העמק': 'צפון',
    'עפולה': 'צפון', 'יקנעם': 'צפון', 'יוקנעם': 'צפון',
    'בית שאן': 'צפון', 'זכרון יעקב': 'צפון', 'זיכרון יעקב': 'צפון',
    'חדרה': 'צפון', 'פרדס חנה': 'צפון', 'בנימינה': 'צפון', 'גבעת עדה': 'צפון',
    'מעלות': 'צפון', 'מעלות תרשיחא': 'צפון', 'תרשיחא': 'צפון',
    'שלומי': 'צפון', 'מטולה': 'צפון', 'קצרין': 'צפון',
    'מגדלי העמק': 'צפון', 'מגדל': 'צפון', 'מעלה אדמים': 'צפון',
    'משגב': 'צפון', 'הגליל': 'צפון', 'גליל מערבי': 'צפון',
    'בסמת טבעון': 'צפון', 'אורנית': 'צפון', 'דליית אל כרמל': 'צפון',
    'גוש חלב': 'צפון', 'דייר חנא': 'צפון', 'סכנין': 'צפון',
    'שפרעם': 'צפון', 'אעבלין': 'צפון', 'יבנאל': 'צפון',
    'כפר תבור': 'צפון', 'מצפה אבי"ב': 'צפון', 'ראש פינה': 'צפון',
    'אור עקיבא': 'צפון', 'גבעת אבני': 'צפון', 'עין מאהל': 'צפון',
    'נוף ים': 'צפון', 'נווה איתן': 'צפון', 'בית הגדי': 'צפון',
}


SCHOOL_PATTERNS = [
    # "לבית הספר היסודי \"בלפור\"" → בלפור
    r'לבית\s+הספר\s+(?:היסודי|התיכון|המקיף|העל\s*יסודי)?\s*[\'"״]([^\'"״]{2,40})[\'"״]',
    # "בית ספר \"X\"" / "ביה"ס \"X\""
    r'(?:בית[־\s]ספר|ביה[״"\']ס)\s+[\'"״]([^\'"״]{2,40})[\'"״]',
    # "לחט\"ב קציר א'" / "חט\"ב קציר א'"
    r'(?:ל?חט[״"\']ב|חטיבת\s+ביניים|ל?תיכון|ל?ישיבה(?:\s+תיכונית)?|ל?אולפנה|ל?אולפנת|ל?מקיף|ל?גימנסיה)\s+([א-ת][א-ת0-9״"\'\s־-]{2,40}?)(?=\s+(?:דרוש|מחפש|בתנופה|לשנת|נמצא|במשרה|מגייס|בצמיחה|מחפשת)|[.,\n]|$)',
    # "לאורט X"
    r'ל?(אורט\s+[א-ת][א-ת\s\'״"]{2,40}?)(?=\s+(?:דרוש|מחפש|לשנת|במשרה|מגייס)|[.,\n])',
    # שם מתחיל בכיתוב מקובל
    r'(?:בבית\s+ספר|בתיכון|בחט[״"\']ב|בישיבה|בגימנסיה)\s+[\'"״]?([א-ת][א-ת0-9״"\'\s־-]{2,40}?)[\'"״]?(?=\s+(?:בעיר|נמצא|דרוש|מחפש|בעמק|במחוז)|[.,\n])',
]


def extract_school_from_description(title, description):
    """מחלץ שם בית ספר מהתיאור אם הכותרת כללית."""
    text = (title or '') + '\n' + (description or '')
    for pat in SCHOOL_PATTERNS:
        m = re.search(pat, text)
        if m:
            name = m.group(1).strip()
            # ניקוי תוויות מיותרות
            name = re.sub(r'^[ה]+', '', name)  # remove leading ה'
            if len(name) >= 2 and len(name) <= 60:
                return name
    return ''


def find_city(text):
    """מחפש עיר בטקסט. תומך בתחיליות (ב/ל/מ/ה/ש/כ/ו) ו-maqaf (-)."""
    if not text:
        return ''
    # הפיכת maqaf לרווח כדי ש"רמת-גן" יזוהה כ"רמת גן"
    norm = text.replace('־', ' ').replace('-', ' ')
    for city in sorted(CITIES.keys(), key=len, reverse=True):
        # תחיליות עבריות מותרות לפני העיר; חוסם רק אות עברית רגילה אחרת
        # \\b לא עובד טוב בעברית — משתמש בלוג מוקדם של תחילית/גבול
        pattern = r'(?:^|[\s,.\-״"\'\(\[/]|[בלמהשכו])' + re.escape(city) + r'(?=[\s,.\-״"\'\)\]/]|$)'
        if re.search(pattern, norm):
            return city
    return ''


def norm_region(s):
    if not s:
        return ''
    parts = [p.strip() for p in s.split(',')]
    for p in parts:
        if p in REGION_NORMALIZE:
            return REGION_NORMALIZE[p]
    return parts[0] if parts else ''


def strip_html(s):
    if not s:
        return ''
    s = re.sub(r'<br\s*/?>', '\n', s, flags=re.I)
    s = re.sub(r'<[^>]+>', '', s)
    return s.strip()


def parse_contact_block(s):
    out = {'contact_name': '', 'email': '', 'phone': ''}
    if not s:
        return out
    txt = strip_html(s)
    m = re.search(r'איש\s+קשר\s*:\s*([^\n]+)', txt)
    if m: out['contact_name'] = m.group(1).strip()
    m = re.search(r'דוא[״"]?ל\s*:\s*([^\s\n]+)', txt)
    if m: out['email'] = m.group(1).strip()
    m = re.search(r'טלפון\s*:\s*([\d\-\s]+)', txt)
    if m: out['phone'] = re.sub(r'\s+', '', m.group(1).strip())
    return out


def derive_level(text):
    """מחזיר 'יסודי' / 'חטיבת ביניים' / 'תיכון' / 'גן' / 'חינוך מיוחד' / '' לפי הטקסט."""
    t = text or ''
    if re.search(r'חינוך\s+מיוחד|חנ[״"\']מ|תקשורת\s+כיתה|כיתת\s+תקשורת|אוטיזם|לקויי\s+למידה|הוראה\s+מותאמת|הוראה\s+מתקנת', t):
        return 'חינוך מיוחד'
    if re.search(r'חט[״"\']ב|חטיבת\s+ביניים|חטה[״"\']ב|חטיבה\s+צעירה', t):
        return 'חטיבת ביניים'
    if re.search(r'יסודי|בית\s+ספר\s+יסודי|בי[ת"\']ס\s+יסודי', t):
        return 'יסודי'
    if re.search(r'תיכון|חטיבה\s+עליונה|חט[״"\']ע|מקיף|ישיבה\s+תיכונית|אולפנה|ישיבת\s+תיכונית|בגרות', t):
        return 'תיכון'
    if re.search(r'גן\s+ילדים|גנון|גני\s+ילדים|גן\s+חובה|גננת', t):
        return 'גן'
    return ''


def derive_scope(text, existing=''):
    """מחלץ היקף משרה ומנרמל ל-3 קטגוריות עיקריות: מלאה / חלקית / מלאה+חלקית."""
    t = (existing or '') + ' ' + (text or '')
    has_full = bool(re.search(r'משרה\s+מלאה|\bמלאה\b|\b100\s*%', t))
    has_partial = bool(re.search(r'חלקית|חצי\s+משרה|חצי(?!\s+שנה)|שליש|שעות\s+בודדות|\b\d{1,2}\s*%|\b\d{1,3}\s*ש["״]ש|ש"ש', t))
    if has_full and has_partial:
        return 'מלאה/חלקית'
    if has_full:
        return 'מלאה'
    if has_partial:
        return 'חלקית'
    if re.search(r'גמיש', t):
        return 'גמישה'
    return existing or ''


def derive_sector(text):
    """מחזיר מגזר: ממלכתי / ממ"ד / חרדי / ערבי / '' (ברירת מחדל = ממלכתי)."""
    t = text or ''
    if re.search(r'ערבי[ת]?(?!\s+שפה)|אורתודוקסי|כנסיה|טרה\s+סנטה|אלסהלה|דאר\s+אל|מלאם|דייר\s+חנא|סכנין|שפרעם|אעבלין|נצרת|דליי?ת|דרוזי|בית\s+ספר\s+ערבי', t):
        return 'ערבי'
    if re.search(r'\bחרדי[ת]?\b|בית\s+יעקב|חב[״"\']ד|תלמוד\s+תורה|ת[״"\']ת|חיידר|עזרא|בני\s+ברק', t):
        return 'חרדי'
    if re.search(r'ממ[״"\']ד|דתי\b|ישיבה|אולפנה|אולפנת|חמ[״"\']ד|תורני|אמ[״"\']ית|בני\s+עקיבא|מסורתי|דתית', t):
        return 'ממ"ד'
    return 'ממלכתי'


def derive_role(text, profession=''):
    t = (text or '') + ' ' + (profession or '')
    if re.search(r'מנהל[ת]?\s+(בית\s+ספר|תיכון|ביה"ס)', t): return 'מנהל/ת'
    if re.search(r'\bסגן\s+מנהל|סגנית\s+מנהלת', t): return 'סגן/ית'
    if re.search(r'\bרכז[ת]?\b', t) and not re.search(r'מרכז', t): return 'רכז/ת'
    if re.search(r'\bמחנכ[ת]?\b', t): return 'מחנך/ת'
    if re.search(r'\bיועצ[תת]?\b|יועצ/ת', t): return 'יועץ/ת'
    if re.search(r'\bמטפל[ת]?\b|תרפיסט', t): return 'מטפל/ת'
    if re.search(r'\bסייע[ת]?\b|תומכ[ת]?\s+הוראה', t): return 'סייע/ת'
    if re.search(r'\bמדריכ[הת]?\b', t): return 'מדריך/ה'
    if re.search(r'\bמורה\b|\bמורות?\b|\bמורים\b', t): return 'מורה'
    return 'אחר'


# ─── פילטר מורים בלבד ──────────────────────────────────────────────
# נשמרים: מורה, מחנך/ת, רכזת מקצוע, "דרוש/ה מורה ל..."
# נפסלים: צהרון/מועדונית, מטפל/ת לבדו, מדריך לא-פדגוגי, ניהול/אדמין
EXCLUDE_PATTERNS = [
    # מורים מחפשי עבודה (קו"ח שהודבק לטופס דרושים) — לא משרה פנויה
    r'^קורות\s+חיים\b',
    r'\bקו"ח\s+של',
    r'מחפש[ת/.]*\s+(עבודה|משרה|משרת\s+הוראה)',
    r'מחפשת\s+(עבודה|משרה)',
    r'מורה\s+מחפש',
    r'מחפש\s+עבודה',
    r'תקציר\s+מקצועי',
    r'\bצהרון',
    r'מועדונית',
    r'מועדוני\s+נוער',
    r'\bפנימייה\b',
    r'תרפיסט',
    r'קלינאי\s+תקשורת',
    r'פיזיותרפיסט',
    r'מרפא[הת]?\s+בעיסוק',
    r'ראש\s+צוות',
    r'אוצר[ת]?\s+וגלריה|אוצר[ת]?\s+ומנהל',
    r'מתאמ[ת]?\s+טיפול',
    r'דיור\s+מוגן',
    r'מרכז\s+חירום',
    r'תכנית\s+\"עמיתים',
    r'דרוש[/.ה]*\s*רכז[ת]?\.?ת?\s+עיר',
    r'תנועת\s+נוער',
    r'מועדון\s+ל',
    r'אנשים\s+עם\s+מוגבלות',
    r'אנשים\s+עם\s+צרכים\s+מיוחדים',
    r'מנכ"ל',
    r'מתאם[ת]?\s+',
]

INCLUDE_TEACHER_PATTERNS = [
    r'\bמורה\s+ל',
    r'\bמורים\b',
    r'\bמורות\b',
    r'דרוש[ה/]*\s+מור[הת]\b',
    r'דרושים?\s+מורים',
    r'\bמחנכ[ת]?\b',
    r'\bמורה\b',
    r'תעודת\s+הוראה',
    r'מקצועי[ת/]?\s+ל(אנגלית|מתמטיקה|עברית|תנ"ך|היסטוריה|ספרות|פיזיקה|כימיה|ביולוגיה|מדעים|חינוך\s+גופני|אומנות|מוסיקה|ערבית)',
    r'\bמדריך\s+פדגוגי',
    r'\bמדריכה\s+פדגוגית',
]


def is_teacher_job(title, description, role_hint=''):
    """מחזיר True רק אם זו משרת מורה אמיתית בבית ספר (לא צהרון/חוג/קו"ח)."""
    text = (title or '') + ' ' + (description or '') + ' ' + (role_hint or '')

    # קו"ח של מורה מחפש עבודה — תמיד לפסול
    cv_patterns = [
        r'^קורות\s+חיים\b', r'\bקו"ח\s+של', r'תקציר\s+מקצועי',
        r'מחפש[ת/.]*\s+(עבודה|משרה|משרת\s+הוראה)',
        r'מחפשת\s+(עבודה|משרה)', r'מורה\s+מחפש',
        r'פרטים\s+אישיים\b.*\bשם:', r'מאגר\s+מורים',
    ]
    for pat in cv_patterns:
        if re.search(pat, text, re.S):
            return False

    # פסילה חמורה — צהרון/חוג/מועדונית: גם אם בתיאור יש "מורה" זה לא משרת בית-ספר
    hard_blocks = [
        r'צהרון',  # צהרון / צהרונים / לצהרון
        r'מועדונית',
        r'חוג\s+(הכנה|העשרה|אחר|חוץ)', r'חוגי\s+הכנה',
        r'מדריכ[י/.]+ות\s+(?:לצהרון|לצהרוני|לחוג|לקייטנ|לתנועת)',
        r'מחפשת?\s+מדריכ',  # "צהרונים מובילה מחפשת מדריכים"
        r'תנועת\s+נוער', r'קייטנ',
    ]
    for pat in hard_blocks:
        if re.search(pat, text):
            return False

    # החרגות חלשות אחרות (תרפיסט/דיור מוגן/וכו') — מנצחות רק אם אין "מורה ל..." בכותרת
    for pat in EXCLUDE_PATTERNS:
        if re.search(pat, text):
            if not re.search(r'\bמורה\s+ל', title or ''):
                return False

    # חייב להכיל סימן של הוראה
    for pat in INCLUDE_TEACHER_PATTERNS:
        if re.search(pat, text):
            return True
    return False


def make_id(source, sid_or_url):
    return f"{source}-{sid_or_url}" if isinstance(sid_or_url, (int, str)) else \
           f"{source}-{hashlib.sha1(str(sid_or_url).encode()).hexdigest()[:10]}"


def iso_date_dmy(s):
    m = re.match(r'(\d{2})/(\d{2})/(\d{4})', s or '')
    return f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else ''


def iso_date_dotted(s):
    m = re.match(r'(\d{1,2})\.(\d{1,2})\.(\d{4})', s or '')
    return f"{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}" if m else ''


# ─── igm: ארגון המורים ─────────────────────────────────────────────
def transform_igm(raw):
    out = []
    for j in raw['jobs']:
        contact = parse_contact_block(j.get('contact', ''))
        info = strip_html(j.get('info', ''))
        title = strip_html(j.get('title', '')) or 'משרת הוראה'
        subject = strip_html(j.get('subject', ''))
        scope = strip_html(j.get('job_length', ''))
        full_title = f"{subject} · {title}" if subject and title else (subject or title)

        if not is_teacher_job(full_title, info, subject):
            continue

        out.append({
            'id': make_id('igm', j.get('id')),
            'source': 'igm',
            'source_name': 'ארגון המורים',
            'school': title,
            'title': full_title,
            'subject': subject,
            'role': derive_role(title + ' ' + info + ' ' + subject, subject),
            'level': derive_level(title + ' ' + info + ' ' + scope),
            'sector': derive_sector(title + ' ' + info + ' ' + j.get('city', '')),
            'region': REGION_NORMALIZE.get(j.get('location_heb_title', ''), j.get('location_heb_title', '')),
            'sub_area': j.get('sub_area', ''),
            'city': j.get('city', ''),
            'scope': derive_scope(info, scope),
            'contact_name': contact['contact_name'],
            'email': contact['email'] or j.get('template_link', ''),
            'phone': contact['phone'],
            'date': j.get('ad_date', ''),
            'date_iso': iso_date_dmy(j.get('ad_date', '')),
            'snippet': info[:300],
            'description': info,
            'url': raw['source_url'],
        })
    return out


# ─── itu: הסתדרות המורים (v2 with full modal data) ─────────────────
def transform_itu(raw):
    out = []
    for j in raw['jobs']:
        title = j.get('title', '').strip()
        institute = j.get('institute', '').strip()
        profession = j.get('profession', '').strip()
        field = j.get('field', '').strip()
        date = j.get('date', '').strip()
        description = j.get('description', '').strip()
        m = re.search(r'(\d{2})/(\d{2})/(\d{4})', date)
        date_iso = f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else ''

        if not is_teacher_job(title, description, field + ' ' + profession):
            continue

        school = institute or extract_school_from_description(title, description) or title
        out.append({
            'id': make_id('itu', j.get('id')),
            'source': 'itu',
            'source_name': 'הסתדרות המורים',
            'school': school,
            'title': title,
            'subject': profession,
            'role': derive_role(title + ' ' + description + ' ' + field, profession),
            'level': derive_level(title + ' ' + description + ' ' + field + ' ' + institute),
            'sector': derive_sector(title + ' ' + description + ' ' + field + ' ' + institute),
            'region': REGION_NORMALIZE.get(j.get('region', ''), j.get('region', '')),
            'sub_area': '',
            'city': find_city(title + ' ' + description + ' ' + institute),
            'scope': derive_scope(title + ' ' + description),
            'contact_name': '',
            'email': j.get('email', ''),
            'phone': j.get('phone', ''),
            'date': date,
            'date_iso': date_iso,
            'snippet': description[:300],
            'description': description,
            'url': raw['source_url'],
        })
    return out


# ─── shatil ────────────────────────────────────────────────────────
def transform_shatil(raw):
    out = []
    for j in raw['jobs']:
        title = j.get('title', '').strip()
        desc = j.get('description', '').strip()
        if desc.startswith(title):
            desc = desc[len(title):].strip()

        if not is_teacher_job(title, desc):
            continue

        emails = j.get('emails') or []
        email = emails[0] if emails else ''
        zones = j.get('zones', '')
        school = extract_school_from_description(title, desc) or title
        out.append({
            'id': make_id('shatil', re.sub(r'\D', '', j.get('url', '')) or j.get('url', '')),
            'source': 'shatil',
            'source_name': 'שתיל',
            'school': school,
            'title': title,
            'subject': '',
            'role': derive_role(title + ' ' + desc),
            'level': derive_level(title + ' ' + desc),
            'sector': derive_sector(title + ' ' + desc),
            'region': norm_region(zones),
            'sub_area': zones,
            'city': find_city(title + ' ' + desc),
            'scope': derive_scope(title + ' ' + desc, j.get('jobType', '')),
            'contact_name': j.get('contact', ''),
            'email': email,
            'phone': j.get('phone', ''),
            'date': j.get('dateDisplay', ''),
            'date_iso': iso_date_dotted(j.get('dateDisplay', '')) or j.get('date', '')[:10],
            'snippet': desc[:300],
            'description': desc,
            'url': j.get('url', ''),
        })
    return out


# ─── merge ─────────────────────────────────────────────────────────
def main():
    igm = load('igm-jobs.json')
    itu = load('itu-jobs.json')
    shatil = load('shatil-jobs.json')

    all_jobs = transform_igm(igm) + transform_itu(itu) + transform_shatil(shatil)

    seen = set()
    unique = []
    for j in all_jobs:
        if j['id'] in seen:
            continue
        seen.add(j['id'])
        unique.append(j)

    # Apply manual edits (verify.html → manual-edits.json)
    manual_count = 0
    if MANUAL_EDITS.exists():
        with open(MANUAL_EDITS, 'r', encoding='utf-8') as f:
            manual = json.load(f).get('edits', {})
        for j in unique:
            if j['id'] in manual:
                for field, value in manual[j['id']].items():
                    j[field] = value
                manual_count += 1

    unique.sort(key=lambda j: j.get('date_iso', ''), reverse=True)

    from collections import Counter
    by_source = Counter(j['source'] for j in unique)
    by_region = Counter(j['region'] or '(לא זוהה)' for j in unique)
    by_role = Counter(j['role'] for j in unique)
    by_level = Counter(j.get('level') or '(לא זוהה)' for j in unique)
    by_sector = Counter(j.get('sector') or '(לא זוהה)' for j in unique)
    by_scope = Counter(j.get('scope') or '(לא זוהה)' for j in unique)

    out = {
        'updated_at': '2026-04-25',
        'total': len(unique),
        'by_source': dict(by_source),
        'by_region': dict(by_region),
        'by_role': dict(by_role),
        'by_level': dict(by_level),
        'by_sector': dict(by_sector),
        'by_scope': dict(by_scope),
        'jobs': unique,
    }
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    # Also write a machine-readable summary (no Hebrew print issues)
    summary_path = ROOT / 'merge-summary.txt'
    with open(summary_path, 'w', encoding='utf-8') as f:
        f.write(f'Total: {len(unique)}\n')
        f.write(f'Manual edits applied: {manual_count}\n')
        f.write(f'By source: {dict(by_source)}\n')
        f.write(f'By region: {dict(by_region)}\n')
        f.write(f'By role: {dict(by_role)}\n')
    print(f'Wrote {OUT.name} with {len(unique)} jobs ({manual_count} manual edits applied)')


if __name__ == '__main__':
    main()
