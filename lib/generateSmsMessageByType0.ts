import type { Guest } from "../app/types/types";
import type { EventDetails } from "../app/types/types";

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
      return `חברת ${event.brideFirst}`;
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
  const { date, time, venue, address, eventType } = event;

  const celebrants = getCelebrants(event);
  const fullLocation = venue
    ? `ב"${venue}"`
    : address
    ? `ב${address}`
    : "במיקום שטרם נקבע";

  switch (type) {
    case "saveDate":
      return `שלום ${name},

שמרו את התאריך! ${eventType || "האירוע"} של ${celebrants} יתקיים ב־${date}.

נשמח לראותכם!`;

    case "invitation":
      return `שלום ${name},

הוזמנתם ל${eventType || "אירוע"} של ${celebrants}!

האירוע יתקיים בתאריך ${date} בשעה ${time}, ${fullLocation}.

לאישור הגעה לחצו:
${rsvpLink}`;

    case "reminder":
      return `שלום ${name},

טרם קיבלנו מכם אישור הגעה ל${
        eventType || "האירוע"
      } של ${celebrants} שיתקיים ב־${date}.

אנא אשרו הגעה בקישור:
${rsvpLink}`;

    case "tableNumber":
      return `שלום ${name},

האירוע מתחיל בקרוב! ${
        eventType || "האירוע"
      } של ${celebrants} יתקיים היום ${fullLocation}.

הושבתם לשולחן מספר ${table}. נתראה!`;

    case "thankYou":
      return `שלום ${name},

תודה שהשתתפתם ב${eventType || "אירוע"} של ${celebrants}!

היה לנו לעונג לחגוג איתכם.`;

    default:
      return "הודעה לא זמינה.";
  }
}
