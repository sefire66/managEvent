// app/host/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Logo3lines from "../components/Logo3Lines";

type Guest = {
  _id?: string;
  name: string;
  phone: string;
  table?: string | null;
  arrived?: boolean;
};

type EventDetails = {
  _id?: string;
  brideFirst: string;
  brideLast: string;
  groomFirst: string;
  groomLast: string;
  date: string; // "YYYY-MM-DD"
  time?: string; // אופציונלי
  venue: string;
  address?: string;
  eventType?: string; // "חתונה" | "בר מצווה" | "בת מצווה" | "חינה" | "ברית" | "בריתה" | ...
  ownerEmail?: string;
  imageUrl?: string;
  imagePath?: string;
  googleMapsLink?: string;
  wazeLink?: string;
};

export default function HostDashboard() {
  const search = useSearchParams();
  const router = useRouter();

  // --------- פרמטרים מה־URL ----------
  const clientParam = search.get("client");
  const eventIdParam = search.get("eventId");
  const clientEmail = clientParam ? decodeURIComponent(clientParam) : null;
  const eventId = eventIdParam ? decodeURIComponent(eventIdParam) : null;

  // אם חסר אימייל או eventId → חוזרים ללוגין
  useEffect(() => {
    if (!clientEmail || !eventId) {
      if (typeof window !== "undefined") router.replace("/host/login");
    }
  }, [clientEmail, eventId, router]);

  if (!clientEmail || !eventId) {
    return null;
  }

  // --------- סטייטים ----------
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(true);
  const [guestsError, setGuestsError] = useState("");

  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [eventError, setEventError] = useState("");

  const [query, setQuery] = useState("");

  // --------- עזרים לכותרת ----------
  const getCelebrants = (ev: EventDetails) => {
    switch (ev.eventType) {
      case "חתונה":
      case "חינה":
        return `${ev.groomFirst} ו${ev.brideFirst}`;
      case "בר מצווה":
      case "ברית":
        return ev.groomFirst;
      case "בת מצווה":
      case "בריתה":
        return ev.brideFirst;
      case "יום הולדת":
        return ev.brideFirst || ev.groomFirst || "החוגג";
      case "אירוע עיסקי":
        return ev.brideFirst || ev.groomFirst || "האירוע";
      default:
        return ev.brideFirst || ev.groomFirst || "החוגג";
    }
  };

  const fmtDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(`${dateStr}T00:00`);
      return d.toLocaleDateString("he-IL", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // --------- פטצ' לאירוע ----------
  useEffect(() => {
    let cancelled = false;

    const fetchEvent = async () => {
      try {
        setLoadingEvent(true);
        setEventError("");
        // נתיב מומלץ: /api/events/[id] שמחזיר פרטי אירוע בודד
        const res = await fetch(`/api/events/${encodeURIComponent(eventId!)}`);
        if (!res.ok) throw new Error(`event API responded ${res.status}`);
        const data = (await res.json()) as EventDetails;
        if (!cancelled) setEventDetails(data);
      } catch (e) {
        console.error("Failed to fetch event:", e);
        if (!cancelled) {
          setEventDetails(null);
          setEventError("נכשלה טעינת פרטי האירוע");
        }
      } finally {
        if (!cancelled) setLoadingEvent(false);
      }
    };

    if (eventId) fetchEvent();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  // --------- פטצ' לאורחים ----------
  useEffect(() => {
    let cancelled = false;

    const fetchGuests = async (email: string, evId: string) => {
      try {
        setLoadingGuests(true);
        setGuestsError("");
        const res = await fetch(
          `/api/guests?email=${encodeURIComponent(email)}&eventId=${encodeURIComponent(evId)}`
        );
        if (!res.ok) throw new Error(`guests API responded ${res.status}`);
        const data = await res.json();

        if (!Array.isArray(data)) {
          console.log("❌ Guest API returned invalid data:", data);
          if (!cancelled) {
            setGuests([]);
            setGuestsError("נתוני אורחים לא תקינים מהשרת");
          }
          return;
        }

        const normalized: Guest[] = data.map((g: any) => ({
          _id: g._id,
          name: String(g.name ?? ""),
          phone: String(g.phone ?? ""),
          table: g.table ?? null,
          arrived: Boolean(g.arrived ?? false),
        }));

        if (!cancelled) setGuests(normalized);
      } catch (e) {
        console.error("Failed to fetch guests:", e);
        if (!cancelled) {
          setGuests([]);
          setGuestsError("נכשלה טעינת רשימת האורחים");
        }
      } finally {
        if (!cancelled) setLoadingGuests(false);
      }
    };

    if (clientEmail && eventId) {
      fetchGuests(clientEmail, eventId);
    }

    return () => {
      cancelled = true;
    };
  }, [clientEmail, eventId]);

  // --------- חיפוש + מיון ----------
  const filteredGuests = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    const isDigitsOnly = /^\d+$/.test(q);

    const sorted = [...guests].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", "he")
    );

    if (!q) return sorted;

    return sorted.filter((g) => {
      const nameMatch = (g.name || "").toLowerCase().includes(q);

      const phoneNorm = (g.phone || "").replace(/\D/g, "");

      if (isDigitsOnly) {
        return phoneNorm.includes(qDigits);
      }

      if (qDigits.length > 0) {
        return nameMatch || phoneNorm.includes(qDigits);
      }

      return nameMatch;
    });
  }, [query, guests]);

  const goBack = () => router.push("/host/login");

  // ----- sticky measuring for search -----
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState<number>(0);

  useEffect(() => {
    const measure = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.getBoundingClientRect().height);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  // ---------------------------------------

  // ----- Fullscreen -----
  const [isFull, setIsFull] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullScreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };
  // ----------------------

  // כותרת האירוע (נבנית מנתוני האירוע אם קיימים, אחרת טקסט ברירת מחדל)
  const headerTitle = eventDetails
    ? `${eventDetails.eventType ?? "אירוע"} של ${getCelebrants(eventDetails)}`
    : "אירוע";

  const headerSubtitle = eventDetails
    ? `${fmtDate(eventDetails.date)} • ${eventDetails.venue || eventDetails.address || ""}`
    : "";

  return (
    <div className="container mx-auto p-2" dir="rtl">
      {/* Header: sticky + compact logo inline */}
      <div
        ref={headerRef}
        className="sticky top-0 z-20 rounded-2xl p-3 mt-2 mb-3 shadow
             bg-gradient-to-l from-pink-400 to-white border border-blue-200
             backdrop-blur supports-[backdrop-filter]:bg-white/70"
      >
        <div className="flex items-center justify-between gap-3">
          {/* Left side: Logo + event info */}
          <div className="flex items-center gap-3">
            <div className="transform scale-90 origin-left w-28 sm:w-32 mr-10">
              <Logo3lines />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-blue-800">
                {loadingEvent ? "טוען פרטי אירוע…" : headerTitle}
              </h1>

              {eventError ? (
                <p className="text-red-700 text-sm mt-1">{eventError}</p>
              ) : (
                <p className="text-white">
                  {loadingEvent ? "" : headerSubtitle}
                </p>
              )}

              <p className="text-xs text-white mt-1">(מארח של {clientEmail})</p>
            </div>
          </div>
          <div>
            <button
              onClick={toggleFullScreen}
              className="px-4 ml-2 py-2 bg-blue-500 text-white rounded-xl shadow hover:bg-blue-600 "
            >
              {isFull ? "צא ממסך מלא" : "מסך מלא"}
            </button>
            <button
              onClick={goBack}
              className="px-4 py-2 rounded-xl border border-red-300 bg-red-50 hover:bg-red-100 transition"
            >
              יציאה
            </button>
          </div>
        </div>
      </div>

      {/* Search: sticky right under header */}
      <div
        className="z-10 bg-blue-50 border border-blue-200 rounded-2xl shadow p-4 mb-3
                   backdrop-blur supports-[backdrop-filter]:bg-blue-50/80 sticky"
        style={{ top: headerHeight }}
      >
        <label className="block text-sm text-blue-900 mb-2 font-semibold">
          חיפוש אורחים
        </label>
        <input
          className="w-full border-2 border-blue-300 rounded-xl p-3 focus:outline-none focus:border-blue-500"
          placeholder="חפש לפי שם או טלפון…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <p className="text-xs text-gray-500 mt-2">
          טיפ: אפשר להקליד 3–4 ספרות אחרונות של הטלפון.
        </p>
      </div>

      {/* Results */}
      {loadingGuests ? (
        <div className="grid gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse bg-white p-3 rounded-xl shadow border border-blue-100 h-16"
            />
          ))}
        </div>
      ) : guestsError ? (
        <div className="text-center text-red-600 p-6 bg-red-50 rounded-2xl border border-red-200">
          {guestsError}
        </div>
      ) : (
        <div className="grid gap-2">
          {filteredGuests.map((g, idx) => (
            <div
              key={g._id ?? `${g.phone}-${idx}`}
              className={`relative bg-white p-3 rounded-xl shadow flex items-center justify-between border
              ${g.arrived ? "border-gray-300" : "border-green-300"}`}
            >
              {/* right color bar */}
              <div
                className={`absolute right-0 top-0 bottom-0 w-2 rounded-r-xl
                ${g.arrived ? "bg-gray-300" : "bg-green-400"}`}
              />
              <div className="text-sm pr-3">
                <div className="font-semibold text-gray-900">{g.name}</div>
                <div className="text-gray-600">
                  {g.phone} •{" "}
                  <span className="text-blue-700">שולחן: {g.table || "-"}</span>
                </div>
              </div>
              <div
                className={`text-xs font-semibold ${
                  g.arrived ? "text-gray-500" : "text-green-600"
                }`}
              >
                {g.arrived ? "הגיע" : "טרם הגיע"}
              </div>
            </div>
          ))}

          {filteredGuests.length === 0 && (
            <div className="text-center text-gray-400 p-10 bg-white rounded-2xl shadow">
              לא נמצאו תוצאות
            </div>
          )}
        </div>
      )}
    </div>
  );
}
