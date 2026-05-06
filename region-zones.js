// Edura · אזורי נסיעה (commute zones)
// ──────────────────────────────────────────────────
// תחליף ל-REGION_NEIGHBORS הרחב (מרכז/דרום/צפון/ירושלים/שפלה).
// כל זונה = קבוצת ערים שניתן להתנייד ביניהן ~30 דק' (סבירות לעבודה יומית).
// בנוי מהדאטה האמיתית של 127 ערים ב-jobs.json + teachers.json (מאי 2026).
// ──────────────────────────────────────────────────

(function (root) {
  'use strict';

  // נורמליזציה: רווחים, מרכאות שונות, תוספות נפוצות
  function norm(s) {
    return String(s || '')
      .trim()
      .replace(/\s*-\s*/g, ' ')      // "תל אביב - יפו" → "תל אביב יפו"
      .replace(/[״"']/g, '"')        // אחידות במרכאות
      .replace(/\s+/g, ' ');
  }

  // כל זונה = רשימת שמות + שם זונה. ניתן להוסיף ערים בעתיד.
  const ZONES = {
    'gush-dan': {
      label: 'גוש דן',
      cities: ['תל אביב', 'תל אביב יפו', 'ת"א', 'גבעתיים', 'רמת גן', 'בני ברק',
               'חולון', 'בת ים', 'קרית אונו', 'קריית אונו', 'אזור', 'אור יהודה',
               'יהוד', 'יהוד מונוסון', 'גני תקווה', 'גבעת שמואל', 'סביון',
               'מקווה ישראל', 'בית דגן', 'נווה ירק']
    },
    'petach-tikva': {
      label: 'פ"ת והסביבה',
      cities: ['פתח תקווה', 'פ"ת', 'ראש העין', 'אלעד', 'שוהם',
               'כפר אורנים', 'כפר האורנים']
    },
    'sharon': {
      label: 'השרון',
      cities: ['רמת השרון', 'הרצליה', 'רעננה', 'כפר סבא', 'הוד השרון',
               'אבן יהודה', 'תל מונד', 'כפר יונה', 'וינגייט', 'הכפר הירוק',
               'קיבוץ געש', 'נתניה', 'עמק חפר', 'חוף השרון', 'בן שמן',
               'כפר מונש', 'נווה ירק', 'צור יצחק', 'צופים', 'אלפי מנשה',
               'כוכב יאיר']
    },
    'chadera-area': {
      label: 'חדרה ועמק חפר',
      cities: ['חדרה', 'חריש', 'פרדס חנה כרכור', 'פרדס חנה', 'זכרון יעקב',
               'בנימינה', 'קיסריה', 'עתלית', 'אום אל פחם', 'באקה אל גרביה',
               'ערערה']
    },
    'rishon-rehovot': {
      label: 'ראשון לציון–רחובות',
      cities: ['ראשון לציון', 'ראשל"צ', 'רחובות', 'נס ציונה', 'באר יעקב',
               'גן יבנה', 'יבנה', 'גדרה']
    },
    'modi-in': {
      label: 'מודיעין',
      cities: ['מודיעין', 'מודיעין מכבים רעות', 'רעות', 'מודיעין עילית',
               'חשמונאים']
    },
    'lod-ramla': {
      label: 'לוד–רמלה',
      cities: ['לוד', 'רמלה']
    },
    'shfela-south': {
      label: 'שפלה דרומית',
      cities: ['סתריה', 'שדה יואב', 'כפר סילבר', 'כפר הנוער עיינות',
               'כנות', 'טל שחר']
    },
    'ashdod-ashkelon': {
      label: 'אשדוד–אשקלון',
      cities: ['אשדוד', 'אשקלון', 'יד מרדכי', 'כרמיה', 'קיבוץ כרמיה']
    },
    'kiryat-gat': {
      label: 'קרית גת–שדרות',
      cities: ['קרית גת', 'קריית גת', 'שדרות', 'נתיבות', 'אופקים']
    },
    'be-er-sheva': {
      label: 'באר שבע ונגב צפוני',
      cities: ['באר שבע', 'רהט', 'דימונה', 'ערד', 'להבים', 'מיתר',
               'מועצה אזורית אשכול', 'אשכול', 'שדה צבי']
    },
    'arava-eilat': {
      label: 'ערבה ואילת',
      cities: ['אילת', 'מצפה רמון']
    },
    'jerusalem': {
      label: 'ירושלים והסביבה',
      cities: ['ירושלים', 'מעלה אדומים', 'מבשרת', 'מבשרת ציון', 'בית שמש',
               'קרית ענבים', 'מטה יהודה', 'גוש עציון', 'אפרת',
               'ביתר עילית']
    },
    'shomron': {
      label: 'שומרון/בנימין',
      cities: ['אריאל', 'קדומים', 'שילה', 'גבע בנימין', 'פסגות', 'בית אל',
               'עפרה', 'מעלה לבונה', 'תפוח']
    },
    'haifa-krayot': {
      label: 'חיפה והקריות',
      cities: ['חיפה', 'נשר', 'טירת כרמל', 'טירת הכרמל', 'קרית ביאליק',
               'קרית מוצקין', 'קרית אתא', 'קריות', 'טבעון', 'חוף הכרמל',
               'אליקים']
    },
    'galilee-west': {
      label: 'גליל מערבי',
      cities: ['עכו', 'נהריה', 'מעלות', 'כברי', 'בוסתן הגליל', 'מזרעה',
               'טמרה', 'כרמיאל', 'עראבה', 'סכנין', 'דיר חנא', 'מג\'ד אל-כרום',
               'בענה', 'דיר אל אסד', 'ביר אל מכסור', 'שעב', 'תרשיחא']
    },
    'emek-yizrael': {
      label: 'עמק יזרעאל',
      cities: ['עפולה', 'נצרת', 'יקנעם', 'יקנעם עילית', 'מגדל העמק',
               'רמת ישי', 'אלונים', 'עין חרוד', 'טורעאן']
    },
    'galilee-east': {
      label: 'גליל מזרחי',
      cities: ['צפת', 'טבריה', 'ראש פינה', 'גילון', 'ג\'ולס', 'אבטליון']
    }
  };

  // אזורי שכנות (zone1 → list of neighboring zones).
  // "שכן" = ניתן להגיע ב-30-60 דק', עדיין סביר אם אין מאצ' באותו zone.
  const ZONE_NEIGHBORS = {
    'gush-dan': ['petach-tikva', 'sharon', 'rishon-rehovot', 'lod-ramla'],
    'petach-tikva': ['gush-dan', 'sharon', 'modi-in', 'lod-ramla'],
    'sharon': ['gush-dan', 'petach-tikva', 'chadera-area'],
    'chadera-area': ['sharon', 'haifa-krayot', 'emek-yizrael'],
    'rishon-rehovot': ['gush-dan', 'shfela-south', 'lod-ramla'],
    'modi-in': ['petach-tikva', 'lod-ramla', 'jerusalem'],
    'lod-ramla': ['gush-dan', 'rishon-rehovot', 'modi-in', 'petach-tikva'],
    'shfela-south': ['rishon-rehovot', 'ashdod-ashkelon'],
    'ashdod-ashkelon': ['shfela-south', 'kiryat-gat'],
    'kiryat-gat': ['ashdod-ashkelon', 'be-er-sheva'],
    'be-er-sheva': ['kiryat-gat'],
    'arava-eilat': [],
    'jerusalem': ['modi-in', 'shomron'],
    'shomron': ['jerusalem'],
    'haifa-krayot': ['chadera-area', 'galilee-west', 'emek-yizrael'],
    'galilee-west': ['haifa-krayot', 'emek-yizrael', 'galilee-east'],
    'emek-yizrael': ['chadera-area', 'haifa-krayot', 'galilee-west', 'galilee-east'],
    'galilee-east': ['galilee-west', 'emek-yizrael']
  };

  // city → zone-id (lookup table)
  const _cityToZone = (() => {
    const map = new Map();
    Object.keys(ZONES).forEach(zoneId => {
      ZONES[zoneId].cities.forEach(city => {
        map.set(norm(city), zoneId);
      });
    });
    return map;
  })();

  function cityZone(city) {
    if (!city) return null;
    return _cityToZone.get(norm(city)) || null;
  }

  function zonesAreSame(cityA, cityB) {
    const a = cityZone(cityA), b = cityZone(cityB);
    return !!(a && b && a === b);
  }

  function zonesAreNeighbors(cityA, cityB) {
    const a = cityZone(cityA), b = cityZone(cityB);
    if (!a || !b) return false;
    if (a === b) return true;
    return (ZONE_NEIGHBORS[a] || []).indexOf(b) !== -1;
  }

  // Tier למאצ' לפי מיקום:
  //   'same-city'      — אותה עיר ממש (החזק ביותר)
  //   'same-zone'      — אותה זונת נסיעה (סביר לעבודה יומית)
  //   'neighbor-zone'  — זונה שכנה (אפשרי, בעיקר אם אין מאצ' קרוב יותר)
  //   null             — רחוק מדי (חסום) או אחת הערים לא מזוהה כלל
  function locationTier(cityA, cityB) {
    if (!cityA || !cityB) return null;
    if (norm(cityA) === norm(cityB)) return 'same-city';
    const zA = cityZone(cityA), zB = cityZone(cityB);
    if (!zA || !zB) return null; // לא להעביר אם לא יודעים את שתי הערים
    if (zA === zB) return 'same-zone';
    if ((ZONE_NEIGHBORS[zA] || []).indexOf(zB) !== -1) return 'neighbor-zone';
    return null;
  }

  root.EduraZones = {
    ZONES,
    ZONE_NEIGHBORS,
    cityZone,
    zonesAreSame,
    zonesAreNeighbors,
    locationTier,
    norm
  };
})(typeof window !== 'undefined' ? window : globalThis);
