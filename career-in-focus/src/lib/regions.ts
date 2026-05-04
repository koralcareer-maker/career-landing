/**
 * Map an Israeli city / location string to one of six regions used for
 * the jobs filter on /jobs:
 *
 *   "צפון"   — North (Carmel + Galilee + Golan)
 *   "חיפה"   — Haifa & near (treated separately because it's a major hub)
 *   "מרכז"   — Center (Tel Aviv metro + Sharon + Petah Tikva belt)
 *   "שפלה"   — Shfela (Rehovot / Rishon LeZion / Yavne / Modiin belt)
 *   "ירושלים" — Jerusalem & near
 *   "דרום"   — South (Beersheba + everything south to Mitzpe Ramon)
 *   "אילת"   — Eilat (treated separately on Coral's request)
 *
 * If we can't classify, returns null and the UI shows the raw location
 * string instead. The classifier is text-based — we look for a known
 * city name as a substring of the input. Job-board location fields can
 * be free text ("ת״א / היברידי", "באר שבע + אופציה לעבודה מהבית"),
 * so substring matching is the most forgiving approach.
 */

export type Region = "צפון" | "חיפה" | "מרכז" | "שפלה" | "ירושלים" | "דרום" | "אילת";

export const ALL_REGIONS: Region[] = [
  "צפון", "חיפה", "מרכז", "שפלה", "ירושלים", "דרום", "אילת",
];

// Cities — keep each list short to the most common synonyms / abbreviations
// people actually write. The classifier scans these in order, so the first
// match wins. We scan more specific (multi-word) before less specific.

const NORTH = [
  "נהריה", "כרמיאל", "צפת", "טבריה", "נצרת עילית", "נצרת",
  "עכו", "קצרין", "מעלות", "קרית שמונה", "ראש פינה",
  "מגדל העמק", "עפולה", "בית שאן", "יקנעם", "טמרה", "סח'נין",
  "גליל", "גולן", "עמק", "כפר תבור", "נופית",
];

const HAIFA = [
  "חיפה", "קרית אתא", "קרית מוצקין", "קרית ביאליק", "קרית ים",
  "קרית טבעון", "טירת כרמל", "נשר", "פרדס חנה", "כרכור",
  "זכרון יעקב", "בנימינה", "חוף הכרמל", "עתלית",
];

const CENTER = [
  // Tel Aviv metro
  "תל אביב", "תל-אביב", "תל אביב-יפו", "ת\"א", "ת'\"א", "ת״א",
  "רמת גן", "ר\"ג", "ר'\"ג", "ר״ג", "גבעתיים",
  "הרצליה", "כפר סבא", "רעננה", "הוד השרון", "רמת השרון",
  "פתח תקווה", "פ\"ת", "פ״ת",
  "בני ברק", "ב\"ב", "בת ים", "חולון",
  "ראש העין", "אור יהודה", "סביון", "קרית אונו",
  // Sharon
  "כפר יונה", "נתניה", "אבן יהודה",
  // misc
  "שוהם", "יהוד", "אזור", "לוד", "רמלה",
];

const SHFELA = [
  "ראשון לציון", "ראשל\"צ", "ראשל״צ",
  "רחובות", "נס ציונה", "באר יעקב",
  "יבנה", "גדרה", "גן יבנה", "מזכרת בתיה",
  "מודיעין", "מכבים", "רעות", "שוהם",
  "אריאל", "כרמי יוסף", "אלעד",
];

const JERUSALEM = [
  "ירושלים", "מבשרת ציון", "בית שמש", "בית שמש",
  "מעלה אדומים", "גבעת זאב", "אבו גוש", "הר אדר",
  "אפרת", "עפרת",
];

const SOUTH = [
  "באר שבע", "ב\"ש", "ב״ש",
  "אשדוד", "אשקלון", "קרית גת", "קרית מלאכי",
  "דימונה", "ערד", "נתיבות", "אופקים", "שדרות",
  "מצפה רמון", "ירוחם", "להבים", "מיתר",
  "רהט", "תל שבע", "ערערה", "קרית עקרון",
];

const EILAT = ["אילת"];

// (region, city) pairs in scanning order — most specific first.
const TABLE: Array<[Region, string]> = [
  ...EILAT.map((c) => ["אילת", c] as [Region, string]),
  ...JERUSALEM.map((c) => ["ירושלים", c] as [Region, string]),
  ...HAIFA.map((c) => ["חיפה", c] as [Region, string]),
  ...NORTH.map((c) => ["צפון", c] as [Region, string]),
  ...SOUTH.map((c) => ["דרום", c] as [Region, string]),
  ...SHFELA.map((c) => ["שפלה", c] as [Region, string]),
  ...CENTER.map((c) => ["מרכז", c] as [Region, string]),
];

/**
 * Classify a free-text location string into one of the seven regions.
 * Returns null when no city in the table matches. Pass a job's title
 * too — many civi jobs put the city in the title ("מנהל/ת משרד בר״ג")
 * rather than in a separate location field.
 */
export function classifyRegion(...sources: Array<string | null | undefined>): Region | null {
  const haystack = sources.filter(Boolean).join(" ");
  for (const [region, city] of TABLE) {
    if (haystack.includes(city)) return region;
  }
  return null;
}
