"use client";

import RsvpForm from "./RsvpForm";
import type { Guest, EventDetails } from "../types/types";
import {
  formatHebrewDateFromISO,
  reverseDateOrder,
} from "../utilityFunctions/dateFunctions";

type DesignOptions = {
  hideDetails?: boolean;
  imageRatio?: "auto" | "16:9" | "4:3";
  cacheBust?: string | number; // 👈 לעקיפת קאש
};

type Props = {
  guest: Guest;
  event: EventDetails;
  readOnly?: boolean;
  design?: DesignOptions;
};

function getCelebrants(event: EventDetails): string {
  switch (event.eventType) {
    case "חתונה":
    case "חינה":
      return `${event.groomFirst} ${event.groomLast} ו${event.brideFirst} ${event.brideLast}`;
    case "בר מצווה":
      return `${event.groomFirst}`;
    case "בת מצווה":
      return `${event.brideFirst}`;
    case "יום הולדת":
      return `ל${event.brideFirst}`;
    case "אירוע עסקי":
      return `חברת ${event.brideFirst}`;
    case "ברית":
      return `ברית לבנם של ${event.brideFirst}`;
    case "בריתה":
      return `הולדת בתם של ${event.brideFirst}`;
    default:
      return "האירוע שלנו";
  }
}

const addCacheBust = (url: string, token?: string | number) => {
  if (!token) return url;
  return url.includes("?") ? `${url}&cb=${token}` : `${url}?cb=${token}`;
};

export default function RsvpView({
  guest,
  event,
  readOnly = false,
  design,
}: Props) {
  // ברירות מחדל: קודם design (פריוויו), אח"כ event.preferences, ואז default
  const hideDetails =
    design?.hideDetails ?? (event as any)?.preferences?.hideDetails ?? false;

  const imageRatio: "auto" | "16:9" | "4:3" =
    design?.imageRatio ?? (event as any)?.preferences?.imageRatio ?? "auto";

  const cacheBust = design?.cacheBust;

  const celebrants = getCelebrants(event);
  const venue = event.venue
    ? `ב"${event.venue}"`
    : event.address
      ? `ב${event.address}`
      : "במיקום שטרם נקבע";

  const defaultImageMap: Record<string, string> = {
    חתונה: "/images/wedding-3d.jpg",
    חינה: "/images/wedding-3d.jpg",
    "בר מצווה": "/images/tfilin.jpg",
    "בת מצווה": "/images/birthday-3d.jpg",
    "יום הולדת": "/images/birthday-3d.jpg",
    "אירוע עסקי": "/images/buisiness-3d.jpg",
    ברית: "/images/baby-3d.jpg",
    בריתה: "/images/baby-3d.jpg",
  };

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

  const eventTypeKey = event.eventType?.trim() || "";
  const imageToShowBase =
    event.imageUrl ||
    (eventTypeKey ? defaultImageMap[eventTypeKey] : undefined) ||
    "/images/wedding-3d.jpg";

  const imageToShow = addCacheBust(imageToShowBase, cacheBust);

  const imageIsAuto = imageRatio === "auto";
  const imageStyle: React.CSSProperties = imageIsAuto
    ? {}
    : { aspectRatio: imageRatio === "16:9" ? "16 / 9" : "4 / 3" };

  return (
    <div
      dir="rtl"
      className="
        w-full max-w-sm sm:max-w-md mx-auto
        p-3
        bg-[#fff8f2] rounded-xl shadow border border-[#e7d3b8]
        flex flex-col
      "
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* עטיפת התמונה */}
      <div
        className="relative w-full rounded-xl overflow-hidden mt-2 mb-2"
        style={{
          ...imageStyle,
          ...(imageIsAuto ? { height: "clamp(260px, 42svh, 560px)" } : {}),
        }}
      >
        <img
          key={imageToShow} // מכריח רנדר מחדש כשמשתנה ה-URL (cb)
          src={imageToShow}
          alt="תמונת האירוע"
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 w-full h-full object-contain ${
            imageIsAuto ? "object-[50%_35%]" : "object-center"
          }`}
        />
      </div>

      {/* כותרת/טקסטים — מוסתרים אם hideDetails=true */}
      {!hideDetails && (
        <>
          <h1 className="shrink-0 text-lg sm:text-xl font-bold text-center text-[#4b2e1e] mb-0">
            אנא אשרו הגעתכם
          </h1>

          {event.eventType === "אירוע עסקי" ? (
            <p className="shrink-0 text-center text-sm font-medium text-[#4b2e1e] mb-1">
              ל{event?.brideFirst} של {event?.brideLast}
            </p>
          ) : (
            <>
              {event.eventType !== "ברית" && event.eventType !== "בריתה" && (
                <p className="shrink-0 text-center text-sm font-medium text-[#4b2e1e] mb-0.5">
                  {event?.eventType === "בר מצווה"
                    ? "בר המצווה"
                    : event.eventType === "בת מצווה"
                      ? "בת המצווה"
                      : event.eventType}{" "}
                  {event.eventType === "יום הולדת" ? "" : "של"} {celebrants}
                </p>
              )}

              {(event.eventType === "ברית" || event.eventType === "בריתה") && (
                <p className="shrink-0 text-center text-sm font-medium text-[#4b2e1e] mb-0.5">
                  {celebrants}
                </p>
              )}

              <p className="shrink-0 text-center text-xs text-[#4b2e1e] mb-1">
                ב{formatHebrewDateFromISO(event.date)}
              </p>
              <p className="shrink-0 text-center text-xl text-[#4b2e1e] mb-1">
                {reverseDateOrder(event.date)}
              </p>

              <p className="shrink-0 text-center text-xs text-[#4b2e1e] mb-1">
                {venue}
                {event.address ? `, ${event.address}` : ""}
              </p>
            </>
          )}
        </>
      )}

      {/* הטופס */}
      <div className="mt-2">
        <RsvpForm
          guestId={guest._id}
          guestName={guest.name}
          currentStatus={guest.status}
          readOnly={readOnly}
        />
      </div>

      {/* חתימת משפחה */}
      {!hideDetails && (
        <p className="shrink-0 text-center text-xs text-[#4b2e1e] mb-1 py-2">
          {getFamilySignature(event)}
        </p>
      )}

      {/* פוטר */}
      <div dir="rtl" className="mt-2 w-full text-[#4b2e1e] py-2 text-center">
        <p dir="rtl" className="text-sm">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-80"
          >
            &copy; {new Date().getFullYear()} managevent.co.il
          </a>
          <span> כל הזכויות שמורות.</span>
        </p>
      </div>
    </div>
  );
}
