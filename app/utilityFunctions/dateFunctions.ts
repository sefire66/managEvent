import { HDate } from "@hebcal/core";

// גרש/גרשיים תקניים
const GERESH = "\u05F3"; // ׳
const GERSHAYIM = "\u05F4"; // ״

// ממיר מספר יום (1–30) לגימטריה עם גרש/גרשיים
export function renderHebrewDay(day: number): string {
  if (day < 1 || day > 30) return String(day); // בטיחות

  // כללים מיוחדים: 15,16
  if (day === 15) return `ט${GERSHAYIM}ו`;
  if (day === 16) return `ט${GERSHAYIM}ז`;

  const units = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  const tens = [
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "י",
    "כ",
    "ל",
    "מ",
    "נ",
    "ס",
    "ע",
    "פ",
    "צ",
  ];
  const t = Math.floor(day / 10);
  const u = day % 10;

  let letters = "";
  if (t > 0) letters += tens[t + 9]; // 10→י, 20→כ, ...
  if (u > 0) letters += units[u];

  // 10,20,30... (ללא יחידות) → אות אחת עם גרש (י׳, כ׳...)
  if (u === 0) return `${letters}${GERESH}`;

  // יותר מאות אחת → גרשיים לפני האות האחרונה (כ״א, י״ד, כ״ט...)
  const last = letters.slice(-1);
  const rest = letters.slice(0, -1);
  return `${rest}${GERSHAYIM}${last}`;
}

const hebrewWeekdays = [
  "יום ראשון",
  "יום שני",
  "יום שלישי",
  "יום רביעי",
  "יום חמישי",
  "יום שישי",
  "שבת",
];

// YYYY-MM-DD → Date (לוקאלי)
function dateFromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d); // שים לב: חודשים ב-JS מתחילים מ-0
}

export function formatHebrewDateFromISO(iso: string): string {
  const date = new Date(iso); // או new Date() להיום
  const hdate = new HDate(date);

  const hebrewWeekdays = [
    "יום ראשון",
    "יום שני",
    "יום שלישי",
    "יום רביעי",
    "יום חמישי",
    "יום שישי",
    "שבת",
  ];
  const weekday = hebrewWeekdays[date.getDay()];

  const hebrewDayNum = hdate.getDate(); // 13, 25 וכו׳
  const hebrewDayTxt = renderHebrewDay(hebrewDayNum); // י״ג, כ״ה ...
  const hebrewMonth = hdate.getMonthName(); // תשרי, סיון...
  console.log("hebrewMonth:", hebrewMonth);
  const hebrewYear = hdate.renderGematriya(); // תשפ״ה
  console.log("hebrewYear:", hebrewYear);
  console.log("hebrewDayTxt:", hebrewDayTxt);
  return `${weekday}, ${hebrewYear}`;

  // return `📅 התאריך העברי הוא: ${weekday}, ${hebrewDayTxt} ב${hebrewMonth} ${hebrewYear}`;
}

export function reverseDateOrder(input?: string | null): string {
  // הגנות: undefined/null/מחרוזת ריקה
  if (input == null) return "";
  const s = String(input).trim();
  if (!s) return "";

  // אם הפורמט לא עם מפריד מוכר — פשוט החזר כפי שהוא
  const parts = s.split(/[.\-\/]/); // תומך ב- 2025-08-25 / 25-08-2025 / 25.08.2025
  if (parts.length !== 3) return s;

  const [a, b, c] = parts;

  // זיהוי גס של היכן השנה (לפי אורך 4)
  // yyyy-mm-dd  => dd-mm-yyyy
  if (a.length === 4) return `${c}-${b}-${a}`;
  // dd-mm-yyyy  => yyyy-mm-dd
  if (c.length === 4) return `${c}-${b}-${a}`;

  // אם לא זוהה — החזר כפי שהוא (לא להפיל את האפליקציה)
  return s;
}

// מחזירה את שם היום בשבוע בעברית (לדוגמה: "יום שלישי")
// מחזירה את שם היום בשבוע בעברית מתוך מחרוזת (DD-MM-YYYY / DD/MM/YYYY / DD.MM.YYYY) או Date
export function getHebrewWeekday(input: string | Date = new Date()): string {
  let date: Date;

  if (input instanceof Date) {
    date = input;
  } else if (/^\d{2}[./-]\d{2}[./-]\d{4}$/.test(input.trim())) {
    // פורמט אירופאי: DD-MM-YYYY (וכן / או .)
    const [d, m, y] = input.trim().split(/[./-]/).map(Number);
    date = new Date(y, m - 1, d, 12, 0, 0); // 12:00 מקומי כדי להימנע מהפתעות אזור-זמן
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(String(input))) {
    // ISO תקני: YYYY-MM-DD
    date = new Date(`${input}T12:00:00`);
  } else {
    // כל פורמט אחר – ניסיון אחרון (עלול להיות לא עקבי בין דפדפנים)
    date = new Date(input as string);
  }

  if (isNaN(date.getTime())) return "תאריך לא תקין";

  const hebrewWeekdays = [
    "יום ראשון",
    "יום שני",
    "יום שלישי",
    "יום רביעי",
    "יום חמישי",
    "יום שישי",
    "שבת",
  ];

  return hebrewWeekdays[date.getDay()];
}

// ==============================
// export function reverseDateOrder(dateStr: string): string {
//   const m = dateStr.trim().match(/^(\d{4})[./-](\d{2})[./-](\d{2})$/);
//   if (!m) return dateStr; // אם לא בפורמט צפוי — מחזיר כמו שהוא
//   const [, y, mo, d] = m;
//   return `${d}-${mo}-${y}`;
// }
