"use client";

import RsvpForm from "./RsvpForm";
import type { Guest, EventDetails } from "../types/types";
import { reverseDateOrder } from "../utilityFunctions/dateFunctions";

type Props = {
  guest: Guest;
  event: EventDetails;
  readOnly?: boolean;
};

function getCelebrants(event: EventDetails): string {
  switch (event.eventType) {
    case "חתונה":
      return `${event.groomFirst} ${event.groomLast} ו${event.brideFirst} ${event.brideLast}`;
    case "בר מצווה":
      return `${event.groomFirst}`;
    case "בת מצווה":
      return `${event.brideFirst}`;
    case "יום הולדת":
      return `${event.brideFirst}`;
    case "אירוע עסקי":
      return `חברת ${event.brideFirst}`;
    case "ברית":
      return `ברית לבנם של ${event.groomFirst} ו${event.brideFirst}`;
    case "בריתה":
      return `בריתה לבתם של ${event.groomFirst} ו${event.brideFirst}`;
    default:
      return "האירוע שלנו";
  }
}

export default function RsvpView({ guest, event, readOnly = false }: Props) {
  const celebrants = getCelebrants(event);
  const venue = event.venue
    ? `ב"${event.venue}"`
    : event.address
      ? `ב${event.address}`
      : "במיקום שטרם נקבע";

  // מפת תמונות
  const defaultImageMap: Record<string, string> = {
    חתונה: "/images/wedding-3d.jpg",
    חינה: "/images/wedding-3d.jpg", // ← חדש
    "בר מצווה": "/images/jewish.jpg",
    "בת מצווה": "/images/birthday-3d.jpg",
    "יום הולדת": "/images/birthday-3d.jpg",
    "אירוע עסקי": "/images/buisiness-3d.jpg",
    ברית: "/images/baby-3d.jpg",
    בריתה: "/images/baby-3d.jpg",
  };

  const eventTypeKey = event.eventType?.trim() || "";
  const imageToShow =
    event.imageUrl ||
    (eventTypeKey ? defaultImageMap[eventTypeKey] : undefined) ||
    "/images/wedding-3d.jpg"; // עדיף fallback כללי; ודא שהנתיב קיים

  return (
    <div
      dir="rtl"
      className="
        w-full max-w-sm sm:max-w-md mx-auto
        h-[100svh] sm:h-auto
        p-3
        bg-[#fff8f2] rounded-xl shadow border border-[#e7d3b8]
        flex flex-col overflow-hidden
       
      "
    >
      {/* תמונת האירוע – מעט קטנה יותר בגובה */}
      <div className="flex items-center justify-center w-full rounded-xl overflow-hidden mt-2 mb-2  h-[54svh] sm:h-[90svh]  ">
        <img
          src={imageToShow}
          alt="תמונת האירוע"
          className="w-full h-full  object-cover "
        />
      </div>

      {/* כותרות – קומפקטי */}
      <h1 className="shrink-0 text-lg sm:text-xl font-bold text-center text-[#4b2e1e] mb-0">
        אישור הגעה
      </h1>

      {event.eventType === "אירוע עסקי" ? (
        <p className="shrink-0 text-center text-sm font-medium text-[#4b2e1e] mb-1">
          ל{event?.brideFirst} של {event?.brideLast}
        </p>
      ) : (
        <>
          <p className="shrink-0 text-center text-sm font-medium text-[#4b2e1e] mb-0.5">
            ל{event?.eventType} של
          </p>
          <p className="shrink-0 text-center text-sm font-medium text-[#4b2e1e] mb-1">
            {celebrants}
          </p>
        </>
      )}

      <p className="shrink-0 text-center text-xs text-[#4b2e1e] mb-1">
        בתאריך {reverseDateOrder(event.date)} בשעה {event.time} {venue}
        {event.address ? `, ${event.address}` : ""}
      </p>

      {/* הטופס – פונקציונליות מקורית, רק פריסה קומפקטית */}
      <div className="flex-1 overflow-y-auto">
        <RsvpForm
          guestId={guest._id}
          guestName={guest.name}
          currentStatus={guest.status}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
