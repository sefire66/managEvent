import {
  getHebrewWeekday,
  reverseDateOrder,
} from "@/app/utilityFunctions/dateFunctions";
import type { Guest } from "../app/types/types";
import type { EventDetails } from "../app/types/types";

export type SmsType =
  | "saveDate"
  | "invitation"
  | "reminder"
  | "tableNumber"
  | "thankYou"
  | "cancel";

// אופציות לביטול (משמשות גם ב-Preview וגם בשליחה)
export type CancelTemplateOpts = {
  cancelCustomText?: string; // טקסט חופשי עם placeholders
  cancelIncludeTime?: boolean; // אם לכלול שעה (ב-MVP → false מהרכיב)
  cancelIncludeLocation?: boolean; // האם לכלול מקום (ברירת מחדל: true)
  cancelShortLink?: string; // קישור קצר (יופיע בסוף)
};

function getCelebrants(event: EventDetails): string {
  switch (event.eventType) {
    case "חתונה":
      return `${event.groomFirst} ${event.groomLast} ו${event.brideFirst} ${event.brideLast}`;
    case "חינה":
      return `${event.groomFirst} ${event.groomLast} ו${event.brideFirst} ${event.brideLast}`;
    case "בר מצווה":
      return `${event.groomFirst}`;
    case "בת מצווה":
      return `${event.brideFirst}`;
    case "יום הולדת":
      return `${event.brideFirst}`;
    case "אירוע עסקי":
      return `${event.brideFirst} של ${event.brideLast}`;
    case "ברית":
      return `לבנם של ${event.brideFirst}`;
    case "בריתה":
      return `לבתם של ${event.brideFirst}`;
    default:
      return "האירוע שלנו";
  }
}

// ---- bidi helpers ----
const LRM = "\u200E";
const LRI = "\u2066";
const PDI = "\u2069";

const isolateLTR = (s?: string) => (s ? `${LRI}${s}${PDI}` : "");
const ltrDate = (iso?: string) => {
  if (!iso) return "";
  const safe = iso.replace(/-/g, `${LRM}-${LRM}`);
  return isolateLTR(safe);
};
const ltrTime = (t?: string) => {
  if (!t) return "";
  const safe = t.replace(/:/g, `${LRM}:${LRM}`);
  return isolateLTR(safe);
};

// תחליף משתנים בסיסי
function renderTemplate(tpl: string, vars: Record<string, string | undefined>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? "") as string).trim();
}

function firstName(full?: string) {
  return (full || "").trim().split(/\s+/)[0] || "";
}

export function generateSmsMessageByType(
  type: SmsType,
  guest: Guest,
  event: EventDetails,
  rsvpLink?: string,
  cancelOpts?: CancelTemplateOpts
): string {
  const { name, table } = guest;
  const { date, time, venue, address, eventType, wazeLink, googleMapsLink } =
    event;

  const dateLtr = ltrDate(date);
  const timeLtr = ltrTime(time);

  function getFamilySignature(event: EventDetails): string {
    if (
      event.eventType === "בר מצווה" ||
      event.eventType === "בת מצווה" ||
      event.eventType === "ברית" ||
      event.eventType === "בריתה" ||
      event.eventType === "יום הולדת"
    ) {
      if (event.eventType === "ברית" || event.eventType === "בריתה") {
        const last = (event.brideFirst || "").trim();
        return last ? `\n${last}` : "";
      } else if (event.eventType === "בר מצווה") {
        const last = (event.groomLast || "").trim();
        return last ? `\n${last}` : "";
      } else {
        const last = (event.brideLast || "").trim();
        return last ? `\n${last}` : "";
      }
    }
    return "";
  }

  const celebrants = getCelebrants(event);
  const isBusiness = eventType === "אירוע עסקי";

  const fullLocation =
    venue && address
      ? `ב"${venue}", ${address}`
      : venue
        ? `ב"${venue}"`
        : address
          ? `ב${address}`
          : "";

  const wazeText = wazeLink ? `\nלניווט ב-Waze: ${wazeLink}` : "";
  const googleMapsText = googleMapsLink
    ? `\nהוראות הגעה ב-Google Maps: ${googleMapsLink}`
    : "";

  function makeTitle(
    etype: string | undefined,
    celebrants: string,
    fallbackWord: string
  ) {
    if (etype === "אירוע עסקי") return celebrants;
    if (etype === "ברית" || etype === "בריתה") return `${etype} ${celebrants}`;
    if (etype === "בר מצווה") return `בר המצווה של ${celebrants}`;
    if (etype === "בת מצווה") return `בת המצווה של ${celebrants}`;
    if (etype === "יום הולדת") return `יום הולדת ל${celebrants}`;
    return `${etype || fallbackWord} של ${celebrants}`;
  }

  const titleForInvitation = makeTitle(eventType, celebrants, "אירוע");
  const titleForSaveDate = makeTitle(eventType, celebrants, "האירוע");
  const titleForReminder = makeTitle(eventType, celebrants, "האירוע");
  const titleForTable = makeTitle(eventType, celebrants, "האירוע");
  const titleForThankYou = makeTitle(eventType, celebrants, "אירוע");
  const titleForCancel = makeTitle(eventType, celebrants, "האירוע");

  const whenWhere = (withTime = true) => {
    const when = `האירוע יתקיים בתאריך ${dateLtr}, ${getHebrewWeekday(
      event.date
    )}${withTime && time ? ` בשעה ${timeLtr}` : ""}`;
    const where = fullLocation ? `, ${fullLocation}.` : ".";
    return when + where;
  };

  switch (type) {
    case "saveDate":
      return `שלום ${name},

שמרו את התאריך! ${titleForSaveDate} יתקיים ב־${dateLtr}.

נשמח לראותכם!\n${getFamilySignature(event)}`.trim();

    case "invitation": {
      if (eventType === "ברית" || eventType === "בריתה") {
        const ceremonyWord = eventType === "ברית" ? "הברית" : "הבריתה";
        const childPhrase =
          eventType === "ברית"
            ? "לברית המילה של בננו היקר"
            : "לבריתה של בתנו היקרה";

        return `שלום ${name},

אנו שמחים ונרגשים להזמינכם ${childPhrase}.

${ceremonyWord} תתקיים בתאריך ${dateLtr} ${getHebrewWeekday(event.date)}${
          time ? ` בשעה ${timeLtr}` : ""
        }${fullLocation ? `, ${fullLocation}` : ""}\n${getFamilySignature(
          event
        )}.

לאישור הגעה לחצו:
${rsvpLink || ""}`.trim();
      }

      return `שלום ${name},

הוזמנת/ם ל${titleForInvitation}!

${whenWhere(true)}${getFamilySignature(event)}

לאישור הגעה לחצו:
${rsvpLink || ""}`.trim();
    }

    case "reminder":
      return `שלום ${name},

טרם קיבלנו מכם אישור הגעה ל${titleForReminder}.

${whenWhere(true)}${getFamilySignature(event)}

אנא אשרו הגעה בקישור:
${rsvpLink || ""}`.trim();

    case "tableNumber":
      return `שלום ${name},

האירוע מתחיל בקרוב! ${titleForTable} יתקיים היום, ${getHebrewWeekday(
        event.date
      )}${time ? ` בשעה ${timeLtr}` : ""} ${fullLocation || ""}.
${
  table ? `הושבתם לשולחן מספר ${table}.${getFamilySignature(event)}\n` : ""
}${wazeText}${googleMapsText}
\nנתראה!`.trim();

    case "thankYou": {
      let thanyouBrit = "";
      if (eventType === "ברית" || eventType === "בריתה") {
        thanyouBrit = event.brideFirst
          ? eventType === "ברית"
            ? `ברית המילה של בננו היקר`
            : `בריתה של ביתנו היקרה`
          : "";
      }

      return `שלום ${name},

תודה שהשתתפתם ב${thanyouBrit || titleForThankYou}!${
        ["אירוע עסקי", "ארוע עסקי"].includes((event.eventType ?? "").trim())
          ? ""
          : `

היה לנו לעונג לחגוג איתכם.
${getFamilySignature(event)}`
      }`.trim();
    }

    // NEW ▼ הודעת ביטול
    case "cancel": {
      // שליטה אם לכלול שעה/מיקום וקישור קצר
      const includeTime = !!cancelOpts?.cancelIncludeTime;
      const includeLoc = cancelOpts?.cancelIncludeLocation ?? true;
      const short = (cancelOpts?.cancelShortLink || "").trim();

      // מתי/היכן – ללא שעה כברירת מחדל (MVP שולח false)
      const parts: string[] = [];
      if (dateLtr) parts.push(`בתאריך ${dateLtr}`);
      if (includeTime && time) parts.push(`בשעה ${timeLtr}`);
      if (includeLoc && (venue || address)) {
        const loc =
          venue && address
            ? `ב"${venue}", ${address}`
            : venue
              ? `ב"${venue}"`
              : `ב${address}`;
        parts.push(loc);
      }
      const extra = parts.join(" ");

      // משתנים לטמפלט מותאם
      const vars = {
        recipientFirstName: firstName(guest.name),
        title: titleForCancel,
        dateHeb: dateLtr,
        weekday: getHebrewWeekday(event.date),
        time: includeTime && time ? timeLtr : "",
        venue,
        address,
        shortLink: short,
      };

      // אם יש טקסט מותאם – נשתמש בו
      const custom = (cancelOpts?.cancelCustomText || "").trim();
      if (custom) {
        return renderTemplate(custom, vars);
      }

      // ברירת מחדל קצרה ונקייה (ללא שעה ב-MVP)
      return `שלום ${guest.name},

${titleForCancel}${extra ? ` ${extra}` : ""} בוטל.
נעדכן בהמשך.${short ? `\n${short}` : ""}`.trim();
    }

    default:
      return "הודעה לא זמינה.";
  }
}
