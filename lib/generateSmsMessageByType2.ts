import type { Guest } from "../app/types/types";
import type { EventDetails } from "../app/types/types";
import { createShortWazeLink } from "@/app/utilityFunctions/createShortWazeLink";

function getCelebrants(event: EventDetails): string {
  switch (event.eventType) {
    case "חתונה":
      return `${event.groomFirst} ${event.groomLast} ו${event.brideFirst} ${event.brideLast}`;
    case "בר מצווה":
      return `${event.groomFirst} `;
    case "בת מצווה":
      return `${event.brideFirst} `;
    case "יום הולדת":
      return `${event.brideFirst} `;
    case "אירוע עסקי":
      return `${event.brideFirst} של ${event.brideLast}`; // ← כאן השינוי
    case "ברית":
      return `ברית לבנם של ${event.groomFirst} ו${event.brideFirst}`;
    case "בריתה":
      return `בריתה לבתם של ${event.groomFirst} ו${event.brideFirst}`;
    default:
      return "שני וניב";
  }
}

export type SmsType =
  | "saveDate"
  | "invitation"
  | "reminder"
  | "tableNumber"
  | "thankYou";

export function generateSmsMessageByType(
  type: SmsType,
  guest: Guest,
  event: EventDetails,
  rsvpLink?: string
): string {
  const { name, table } = guest;
  const { date, time, venue, address, eventType, wazeLink, googleMapsLink } =
    event;

  // כפיית LTR לתאריך/שעה ב-SMS טקסטואלי
  const forceLTR = (s?: string) => (s ? `\u200E${s}\u200E` : "");
  const dateLtr = forceLTR(date);
  const timeLtr = forceLTR(time);

  const celebrants = getCelebrants(event); // ל"אירוע עסקי": "X של Y"
  const isBusiness = eventType === "אירוע עסקי";

  const fullLocation = venue
    ? `ב"${venue}"`
    : address
      ? `ב${address}`
      : "במיקום שטרם נקבע";

  const wazeText = wazeLink ? `\n\nלניווט ב-Waze: ${wazeLink}` : "";
  const googleMapsText = googleMapsLink
    ? `\nהוראות הגעה ב-Google Maps: ${googleMapsLink}`
    : "";

  // כותרות/כינויים בהתאם לסוג האירוע
  const titleForInvitation = isBusiness
    ? `${celebrants}`
    : `${eventType || "אירוע"} של ${celebrants}`;

  const titleForSaveDate = isBusiness
    ? `${celebrants}`
    : `${eventType || "האירוע"} של ${celebrants}`;

  const titleForReminder = isBusiness
    ? `${celebrants}`
    : `${eventType || "האירוע"} של ${celebrants}`;

  const titleForTable = isBusiness
    ? `${celebrants}`
    : `${eventType || "האירוע"} של ${celebrants}`;

  const titleForThankYou = isBusiness
    ? `${celebrants}`
    : `${eventType || "אירוע"} של ${celebrants}`;

  switch (type) {
    case "saveDate":
      return `שלום ${name},

שמרו את התאריך! ${titleForSaveDate} יתקיים ב־${dateLtr}.
${time ? `בשעה ${timeLtr}\n` : ""}נשמח לראותכם!`.trim();

    case "invitation":
      return `שלום ${name},

הוזמנתם ל${titleForInvitation}!

האירוע יתקיים בתאריך ${dateLtr}${time ? ` בשעה ${timeLtr}` : ""}, ${fullLocation}.

לאישור הגעה לחצו:
${rsvpLink || ""}`.trim();

    case "reminder":
      return `שלום ${name},

טרם קיבלנו מכם אישור הגעה ל${titleForReminder} שיתקיים ב־${dateLtr}${time ? ` בשעה ${timeLtr}` : ""}.

אנא אשרו הגעה בקישור:
${rsvpLink || ""}`.trim();

    case "tableNumber":
      return `שלום ${name},

האירוע מתחיל בקרוב! ${titleForTable} יתקיים היום${time ? ` בשעה ${timeLtr}` : ""} ${fullLocation}.
${table ? `הושבתם לשולחן מספר ${table}.\n` : ""}${wazeText}${googleMapsText}
\nנתראה!`.trim();

    case "thankYou":
      return `שלום ${name},

תודה שהשתתפתם ב${titleForThankYou}!

היה לנו לעונג לחגוג איתכם.`.trim();

    default:
      return "הודעה לא זמינה.";
  }
}
