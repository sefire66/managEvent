"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EventDetails } from "@/app/types/types";
import Logo3lines from "../../components/Logo3Lines";

export default function HostLoginPage() {
  const router = useRouter();

  const [clientEmail, setClientEmail] = useState("");
  const [hostPassword, setHostPassword] = useState("");
  const [error, setError] = useState("");

  // אירועים שהגיעו מהשרת + אירוע נבחר
  const [events, setEvents] = useState<EventDetails[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  // סטטוסי UX
  const [isSearchingEvents, setIsSearchingEvents] = useState(false);
  const [eventsError, setEventsError] = useState("");

  const getCelebrants = (ev: EventDetails) => {
    switch (ev.eventType) {
      case "חתונה":
        // שני חוגגים
        return `${ev.groomFirst} ו${ev.brideFirst}`;

      case "בר מצווה":
        // חתן בר מצווה
        return ev.groomFirst;

      case "בת מצווה":
        // כלת בת מצווה
        return ev.brideFirst;

      case "ברית":
        // נוהגים לשים שם התינוק/הבן בשדה groomFirst
        return ev.groomFirst;

      case "בריתה":
        // נוהגים לשים שם התינוקת/הבת בשדה brideFirst
        return ev.brideFirst;

      case "חינה":
        // כמו חתונה – שני חוגגים
        return `${ev.groomFirst} ו${ev.brideFirst}`;

      case "יום הולדת":
        // מי שחוגג = brideFirst או groomFirst
        return ev.brideFirst || ev.groomFirst;

      case "אירוע עיסקי":
        // אין חוגג אישי, אפשר להחזיר שם חברה/ארגון (בbrideFirst למשל)
        return ev.brideFirst || ev.groomFirst || "האירוע";

      default:
        // fallback – מנסה להחזיר מישהו
        return ev.brideFirst || ev.groomFirst || "חוגג";
    }
  };

  // ולידציית אימייל קצרה
  const isValidEmail = (v: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  // הקלדת אימייל
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClientEmail(e.target.value);
    setError("");
    setEventsError("");
    // איפוס רשימת אירועים כשמשנים אימייל
    setEvents([]);
    setSelectedEventId("");
  };

  // טעינת אירועים לפי אימייל
  const fetchEvents = async () => {
    const email = clientEmail.trim();
    if (!email) {
      setEventsError("נא להזין אימייל של הלקוח");
      return;
    }

    setIsSearchingEvents(true);
    setEventsError("");
    try {
      const res = await fetch(`/api/events?email=${encodeURIComponent(email)}`);
      if (!res.ok) {
        throw new Error(`events API responded ${res.status}`);
      }
      const data = await res.json();
      if (!Array.isArray(data)) {
        throw new Error("מבנה נתונים לא תקין מהשרת");
      }

      const sorted = [...data].sort((a: any, b: any) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return da - db;
      });

      setEvents(sorted);

      if (sorted.length === 0) {
        setEventsError("לא נמצאו אירועים לאימייל הזה");
        setSelectedEventId("");
        return;
      }

      // ✅ אם יש רק אירוע אחד — בחר אותו אוטומטית
      if (sorted.length === 1) {
        setSelectedEventId(sorted[0]._id as string);
        return;
      }

      // ✅ אם יש אירוע בתאריך של היום — בחר אותו אוטומטית
      const today = new Date().toISOString().split("T")[0]; // yyyy-mm-dd
      const todayEvent = sorted.find((ev) => ev.date === today);
      if (todayEvent) {
        setSelectedEventId(todayEvent._id as string);
      }
    } catch (err) {
      console.error("Error loading events:", err);
      setEvents([]);
      setEventsError("נכשלה טעינת האירועים, נסה/י שוב");
    } finally {
      setIsSearchingEvents(false);
    }
  };

  // מביאים אירועים כשמסיימים להקליד מייל (blur)
  const handleEmailBlur = async () => {
    await fetchEvents();
  };

  // בחירת אירוע מה־select
  const handleSelectEvent = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEventId(e.target.value);
    setError("");
  };

  // ניווט ל־Host
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!clientEmail.trim()) return setError("נא להזין אימייל של הלקוח");
    if (!isValidEmail(clientEmail)) return setError("כתובת אימייל לא תקינה");

    if (!selectedEventId) return setError("נא לבחור אירוע מהרשימה לפני הכניסה");

    if (hostPassword !== "0000")
      return setError("סיסמת מארח שגויה (לניסיון: 0000)");

    const email = encodeURIComponent(clientEmail.trim());
    const eventId = encodeURIComponent(selectedEventId);

    // מעבירים גם eventId ל־host
    router.push(`/host?client=${email}&eventId=${eventId}`);
  };

  // עוזר להצגת תאריך קצר ונעים (אם יש date)
  // מציג יום בשבוע + תאריך + שעה בשעון ישראל, כשהקלט הוא ISO עם Z (UTC)
  // dateStr = "2025-08-22", timeStr = "15:00"
  // dateStr = "2025-08-22", timeStr = "15:00"
  const fmtDateTime = (dateStr?: string, timeStr?: string) => {
    if (!dateStr) return "";
    try {
      // מרכיבים string רגיל בלי Z -> מתפרש כ־local time
      const full = timeStr ? `${dateStr}T${timeStr}` : `${dateStr}T00:00`;
      const d = new Date(full);

      const datePart = d.toLocaleDateString("he-IL", {
        weekday: "long", // יום בשבוע
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const timePart = timeStr
        ? d.toLocaleTimeString("he-IL", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";

      return timePart ? `${datePart} • ${timePart}` : datePart;
    } catch {
      return `${dateStr} ${timeStr ?? ""}`;
    }
  };

  return (
    <>
      <div
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
          </div>
          <div></div>
          {/* <button
            onClick={goBack}
            className="px-4 py-2 rounded-xl border border-red-300 bg-red-50 hover:bg-red-100 transition"
          >
            יציאה
          </button> */}
        </div>
      </div>

      <div
        className="min-h-[70vh] flex items-center justify-center p-4"
        dir="rtl"
      >
        <form
          onSubmit={onSubmit}
          className="w-full max-w-sm bg-white rounded-2xl shadow p-6"
        >
          <h1 className="text-xl font-bold mb-1">כניסת מארח</h1>
          <p className="text-sm text-gray-600 mb-4">
            הזן/י אימייל לקוח, בחר/י אירוע וסיסמת מארח (כרגע: 0000).
          </p>

          {/* אימייל */}
          <label className="text-sm font-semibold text-gray-700 mb-1 block">
            אימייל הלקוח
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="email"
              placeholder="name@example.com"
              className="w-full border rounded-xl p-3"
              value={clientEmail}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              autoComplete="email"
            />
            <button
              type="button"
              onClick={fetchEvents}
              className="px-3 py-2 rounded-xl border bg-gray-50 hover:bg-gray-100 text-sm"
              disabled={!clientEmail || isSearchingEvents}
              title="חיפוש אירועים לפי אימייל"
            >
              {isSearchingEvents ? "טוען…" : "חפש"}
            </button>
          </div>

          {/* בחירת אירוע */}
          <label className="text-sm font-semibold text-gray-700 mb-1 block">
            בחר/י אירוע
          </label>
          <select
            className="w-full border rounded-xl p-3 mb-3 bg-white"
            value={selectedEventId}
            onChange={handleSelectEvent}
            disabled={isSearchingEvents || events.length === 0}
          >
            <option value="" disabled>
              {isSearchingEvents
                ? "טוען אירועים…"
                : events.length === 0
                  ? "אין אירועים להצגה"
                  : "בחר/י אירוע…"}
            </option>
            {events.map((ev) => (
              <option key={ev._id} value={ev._id as string}>
                {ev.eventType ?? "אירוע"} של {getCelebrants(ev)}
                {ev.date ? ` — ${fmtDateTime(ev.date)}` : ""}
                {ev.venue || ev.address ? ` • ${ev.venue ?? ev.address}` : ""}
              </option>
            ))}
          </select>

          {/* הודעות שגיאה של אירועים */}
          {eventsError && (
            <div className="text-red-600 text-sm mb-3">{eventsError}</div>
          )}

          {/* סיסמת מארח */}
          <input
            type="password"
            placeholder="סיסמת מארח"
            className="w-full border rounded-xl p-3 mb-3"
            value={hostPassword}
            onChange={(e) => setHostPassword(e.target.value)}
            autoComplete="current-password"
          />

          {/* שגיאת טופס כללית */}
          {error && <div className="text-red-600 text-sm mb-3">{error}</div>}

          <button
            className="w-full bg-blue-600 text-white rounded-xl p-3 disabled:opacity-60"
            disabled={
              !clientEmail ||
              !isValidEmail(clientEmail) ||
              !selectedEventId ||
              isSearchingEvents
            }
          >
            כניסה
          </button>
        </form>
      </div>
    </>
  );
}
