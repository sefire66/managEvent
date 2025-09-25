import type { EventDetails } from "../app/types/types";

export function generateSmsMessage(
  details: EventDetails,
  guestName: string,
  rsvpLink: string
): string {
  const {
    groomFirst,
    groomLast,
    brideFirst,
    brideLast,
    date,
    time,
    venue,
    address,
  } = details;

  return `שלום ${guestName},

הוזמנתם לחתונה של ${groomFirst} ${groomLast} ו־${brideFirst} ${brideLast}.

האירוע יתקיים בתאריך ${date} בשעה ${time}, ב"${venue}" בכתובת: ${address}.

לאישור הגעה אנא לחצו על הקישור:
${rsvpLink}`;
}
