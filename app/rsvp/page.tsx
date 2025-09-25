// app/rsvp/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Logo3lines from "../components/Logo3Lines";

// ===== Types =====
type Guest = {
  _id?: string;
  name: string;
  phone: string;
  status: "לא ענה" | "בא" | "לא בא" | "אולי";
  count?: number; // כמות משתתפים
  table?: string | null; // מס' שולחן כמחרוזת או null/"" כשאין
};

type EventDetails = {
  _id?: string;
  brideFirst: string;
  brideLast: string;
  groomFirst: string;
  groomLast: string;
  date: string; // YYYY-MM-DD
  time?: string;
  venue: string;
  address?: string;
  eventType?: string;
  ownerEmail?: string;
};

// ===== Status UI helpers =====
const STATUS_OPTIONS: Array<Guest["status"]> = [
  "לא ענה",
  "בא",
  "לא בא",
  "אולי",
];

const statusBarColor = (status: Guest["status"]) => {
  switch (status) {
    case "לא ענה":
      return "bg-yellow-400";
    case "בא":
      return "bg-green-400";
    case "לא בא":
      return "bg-red-400";
    case "אולי":
      return "bg-blue-400";
    default:
      return "bg-gray-300";
  }
};

const statusBadge = (status: Guest["status"]) => {
  switch (status) {
    case "לא ענה":
      return "bg-yellow-100 text-yellow-700";
    case "בא":
      return "bg-green-100 text-green-700";
    case "לא בא":
      return "bg-red-100 text-red-700";
    case "אולי":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
};

// מסיר תווים לא-ספרתיים ומחזיר tel תקין; לישראל ממיר 0 בתחילת המספר ל-+972
const toTelHref = (raw: string) => {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  // אם כבר מתחיל ב-+ השאר כמו שהוא (רק הסר רווחים)
  if (/^\+/.test(trimmed)) return `tel:${trimmed.replace(/\s+/g, "")}`;
  // שמור רק ספרות
  const digits = trimmed.replace(/\D/g, "");
  // המרה ל-E.164 בסיסית לישראל (05XXXXXXXX -> +9725XXXXXXXX)
  if (/^0\d{8,9}$/.test(digits)) {
    return `tel:+972${digits.slice(1)}`;
  }
  // fallback
  return `tel:${digits}`;
};

// פורמט לתצוגה נקייה + כיוון LTR בתוך RTL
const formatPhoneDisplay = (raw: string) => raw.replace(/\s+/g, "");

export default function RsvpManagerPage() {
  const search = useSearchParams();
  const router = useRouter();

  // ----- URL params -----
  const clientParam = search.get("client");
  const eventIdParam = search.get("eventId");
  const clientEmail = clientParam ? decodeURIComponent(clientParam) : null;
  const eventId = eventIdParam ? decodeURIComponent(eventIdParam) : null;

  // נווט למסך התחברות אם חסר פרמטרים
  useEffect(() => {
    if (!clientEmail || !eventId) {
      if (typeof window !== "undefined") router.replace("/rsvp/login");
    }
  }, [clientEmail, eventId, router]);

  if (!clientEmail || !eventId) return null;

  // ----- State -----
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [eventError, setEventError] = useState("");

  const [guests, setGuests] = useState<Guest[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(true);
  const [guestsError, setGuestsError] = useState("");

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Guest | null>(null); // המודל
  const [saving, setSaving] = useState(false);

  // ----- Filters & Sort state -----
  const [filterStatus, setFilterStatus] = useState<Guest["status"] | "הכל">(
    "הכל"
  );
  const [filterTable, setFilterTable] = useState<string>("הכל"); // "הכל" | "" (בלי שולחן) | ערך שולחן
  const [filterCount, setFilterCount] = useState<"הכל" | "0" | "1+">("הכל");

  type SortField = "status" | "name" | "phone" | "table" | "count";
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // ----- Sticky header height -----
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState<number>(0);
  useEffect(() => {
    const measure = () => {
      if (headerRef.current)
        setHeaderHeight(headerRef.current.getBoundingClientRect().height);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // ===== Helpers =====
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
      const [y, m, d] = dateStr.split("-").map(Number);
      const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
      return new Intl.DateTimeFormat("he-IL", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Jerusalem",
      }).format(dt);
    } catch {
      return dateStr;
    }
  };

  // ===== Fetch Event Details =====
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoadingEvent(true);
        setEventError("");
        const res = await fetch(`/api/events/${encodeURIComponent(eventId!)}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`event API ${res.status}`);
        const data: EventDetails = await res.json();
        if (!cancelled) setEventDetails(data);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setEventError("נכשלה טעינת פרטי האירוע");
          setEventDetails(null);
        }
      } finally {
        if (!cancelled) setLoadingEvent(false);
      }
    };
    if (eventId) run();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  // ===== Fetch Guests =====
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoadingGuests(true);
        setGuestsError("");
        const url = `/api/guests?email=${encodeURIComponent(clientEmail!)}&eventId=${encodeURIComponent(eventId!)}&fields=name,phone,status,count,table`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`guests API ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("Invalid guests payload");
        const normalized: Guest[] = data.map((g: any) => ({
          _id: g._id,
          name: String(g.name ?? ""),
          phone: String(g.phone ?? ""),
          status: (g.status ?? "לא ענה") as Guest["status"],
          count: typeof g.count === "number" ? g.count : 0,
          table: g.table ?? null,
        }));
        if (!cancelled) setGuests(normalized);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setGuestsError("נכשלה טעינת רשימת האורחים");
          setGuests([]);
        }
      } finally {
        if (!cancelled) setLoadingGuests(false);
      }
    };
    if (clientEmail && eventId) run();
    return () => {
      cancelled = true;
    };
  }, [clientEmail, eventId]);

  // ===== Search + Filter + Sort =====
  const filteredGuests = useMemo(() => {
    // חיפוש
    const q = query.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    const isDigitsOnly = /^\d+$/.test(q);

    // סדר לוגי לפי סטטוס
    const statusOrder = (s: Guest["status"]) => {
      switch (s) {
        case "לא ענה":
          return 0;
        case "אולי":
          return 1;
        case "בא":
          return 2;
        case "לא בא":
          return 3;
        default:
          return 4;
      }
    };

    // 1) חיפוש בסיסי
    let base = guests.filter((g) => {
      if (!q) return true;
      const nameMatch = (g.name || "").toLowerCase().includes(q);
      const phoneNorm = (g.phone || "").replace(/\D/g, "");
      if (isDigitsOnly) return phoneNorm.includes(qDigits);
      if (qDigits.length > 0) return nameMatch || phoneNorm.includes(qDigits);
      return nameMatch;
    });

    // 2) סינונים
    if (filterStatus !== "הכל") {
      base = base.filter((g) => g.status === filterStatus);
    }
    if (filterTable !== "הכל") {
      base = base.filter((g) =>
        filterTable === "" ? !g.table : g.table === filterTable
      );
    }
    if (filterCount !== "הכל") {
      base = base.filter((g) => {
        const c = g.count ?? 0;
        return filterCount === "0" ? c === 0 : c >= 1;
      });
    }

    // 3) מיון
    const cmp = (a: Guest, b: Guest) => {
      let res = 0;
      switch (sortField) {
        case "status":
          res = statusOrder(a.status) - statusOrder(b.status);
          break;
        case "name":
          res = (a.name || "").localeCompare(b.name || "", "he");
          break;
        case "phone":
          res = (a.phone || "").localeCompare(b.phone || "", "he", {
            numeric: true,
          });
          break;
        case "table":
          res = (a.table ?? "").localeCompare(b.table ?? "", "he", {
            numeric: true,
          });
          break;
        case "count":
          res = (a.count ?? 0) - (b.count ?? 0);
          break;
      }
      return sortDir === "asc" ? res : -res;
    };

    return base.sort(cmp);
  }, [
    guests,
    query,
    filterStatus,
    filterTable,
    filterCount,
    sortField,
    sortDir,
  ]);

  // ===== Totals =====
  const totalGuests = guests.length;
  const totalPeople = guests.reduce((s, g) => s + (g.count ?? 0), 0);
  const confirmedPeople = guests
    .filter((g) => g.status === "בא")
    .reduce((s, g) => s + (g.count ?? 0), 0);

  // נרמול סוג אירוע לשם הקנוני כמו ב-EventTitle
  const normalizeEventType = (t?: string) => {
    const x = (t || "").trim();
    if (x === "אירוע עיסקי") return "אירוע עסקי";
    return x || "";
  };

  // בניית טקסט כותרת האירוע כמו ב-EventTitle (ללא אימוג'ים)
  const buildEventTitle = (ev: EventDetails) => {
    const type = normalizeEventType(ev.eventType);
    const bride = ev.brideFirst || "";
    const groom = ev.groomFirst || "";
    const brideLast = ev.brideLast || "";

    switch (type) {
      case "חתונה":
        return `החתונה המרגשת של ${groom} ו${bride}`;
      case "חינה":
        return `חוגגים חינה ל${groom} ו${bride}`;
      case "בר מצווה":
        return `בר המצווה החגיגי של ${groom}`;
      case "בת מצווה":
        return `בת המצווה הנוצצת של ${bride}`;
      case "ברית":
        // אצלך brideName משמש "ניב ואורות" (ההורים)
        return `ברית לבנם של ${bride}`;
      case "בריתה":
        return `בריתה לבתם של ${bride}`;
      case "יום הולדת":
        return `חוגגים יום הולדת ל${bride || groom}`;
      case "אירוע עסקי":
        // לפי EventTitle: "ברוכים הבאים ל{brideName} של {brideLast}"
        return `ברוכים הבאים ל${bride}${brideLast ? ` של ${brideLast}` : ""}`;
      default:
        // ברירת מחדל ידידותית
        return `${type || "אירוע"} של ${groom || bride || "החוגג"}`;
    }
  };

  // ===== Header Text =====
  // ===== Header Text (מיושר ל-EventTitle) =====
  const headerTitle = eventDetails
    ? `ניהול אישורי הגעה • ${buildEventTitle(eventDetails)}`
    : "ניהול אישורי הגעה";

  const headerSubtitle = eventDetails
    ? `${fmtDate(eventDetails.date)} • ${eventDetails.venue || eventDetails.address || ""}`
    : "";

  // ===== saveGuest: PATCH אורח יחיד (לא מוחק אחרים) =====
  const saveGuest = async (draft: Guest) => {
    if (!draft || !draft._id) return;
    setSaving(true);

    // נרמול: אם "בא" → count >= 1, אחרת אפס ובלי שולחן
    const normalized: Guest =
      draft.status === "בא"
        ? {
            ...draft,
            count: Math.max(1, draft.count ?? 1),
            table: draft.table?.toString() ?? "",
          }
        : { ...draft, count: 0, table: "" };

    // עדכון אופטימי
    const prevGuests = guests;
    const nextGuests = guests.map((g) =>
      g._id === normalized._id ? { ...g, ...normalized } : g
    );
    setGuests(nextGuests);

    try {
      const res = await fetch(`/api/guests/${normalized._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: normalized.name,
          phone: normalized.phone,
          status: normalized.status,
          count: normalized.count,
          table: normalized.table,
          eventId, // חשוב: מה-URL param
        }),
      });
      if (!res.ok) throw new Error(`PATCH failed: ${res.status}`);
      setSelected(null);
    } catch (err) {
      console.error("Failed to save guest:", err);
      setGuests(prevGuests); // רולבק
      alert("שמירה נכשלה. השינוי בוטל.");
    } finally {
      setSaving(false);
    }
  };

  // ===== UI =====
  return (
    <div className="container mx-auto p-2" dir="rtl">
      {/* Header */}
      <div
        ref={headerRef}
        className="sticky top-0 z-20 rounded-2xl p-3 mt-2 mb-3 shadow
        bg-gradient-to-l from-pink-400 to-white border border-blue-200
        backdrop-blur supports-[backdrop-filter]:bg-white/70 "
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="transform scale-70 sm:scale-90 origin-left w-28 sm:w-32 mr-10 ml-2">
              <Logo3lines />
            </div>
            <div>
              <h1 className="text-xs sm:text-lg font-bold text-blue-800">
                {loadingEvent ? "טוען פרטי אירוע…" : headerTitle}
              </h1>
              {eventError ? (
                <p className="text-red-700 text-sm mt-1">{eventError}</p>
              ) : (
                <p className="hidden sm:block  text-blue-900/80 text-sm">
                  {loadingEvent ? "" : headerSubtitle}
                </p>
              )}
              <div className=" hidden sm:block mt-1 text-sm text-blue-900/90">
                <span className="mr-2">אורחים: {totalGuests}</span>
                <span className="mr-2">סה״כ אנשים: {totalPeople} </span>
                <span>מאושרים: {confirmedPeople}</span>
              </div>
              <p className="hidden sm:block text-xs text-blue-900/60 mt-1">
                (לקוח: {clientEmail})
              </p>
            </div>
          </div>
          <div>
            <button
              onClick={() => router.push("/rsvp/login")}
              className="px-4 py-2 rounded-xl border border-red-300 bg-red-50 hover:bg-red-100 transition"
            >
              יציאה
            </button>
          </div>
        </div>
      </div>

      {/* Search + Filters — single sticky block */}
      <div
        className="z-10 bg-blue-50 border border-blue-200 rounded-2xl shadow p-3 mb-3
             backdrop-blur supports-[backdrop-filter]:bg-blue-50/80 sticky"
        style={{ top: headerHeight }}
      >
        <div
          className="flex items-end gap-2 flex-nowrap overflow-x-auto"
          dir="rtl"
        >
          {/* חיפוש (רחב) */}
          <div className="shrink-0 flex-[2] min-w-[130px]">
            <label className="block text-xs text-blue-900 mb-1 font-semibold">
              חיפוש אורחים
            </label>
            <input
              className="w-full border-2 border-blue-300 rounded-xl h-8.5 px-3
                   focus:outline-none focus:border-blue-500 text-xs"
              placeholder="חפש לפי שם או טלפון…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* סטטוס */}
          <div className="shrink-0">
            <label className="block text-xs text-blue-900 mb-1 font-semibold">
              סטטוס
            </label>
            <select
              className="border rounded-md p-2 bg-white min-w-[100px] text-xs"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="הכל">הכל</option>
              <option value="לא ענה">לא ענה</option>
              <option value="אולי">אולי</option>
              <option value="בא">בא</option>
              <option value="לא בא">לא בא</option>
            </select>
          </div>

          {/* שולחן */}
          <div className="shrink-0">
            <label className="block text-xs text-blue-900 mb-1 font-semibold">
              שולחן
            </label>
            <select
              className="border rounded-md p-2 bg-white min-w-[70px] text-xs"
              value={filterTable}
              onChange={(e) => setFilterTable(e.target.value)}
            >
              <option value="הכל">הכל</option>
              <option value="">בלי שולחן</option>
              {[
                ...new Set(
                  guests.map((g) => g.table).filter(Boolean) as string[]
                ),
              ]
                .sort((a, b) => a.localeCompare(b, "he", { numeric: true }))
                .map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
            </select>
          </div>

          {/* כמות */}
          <div className="shrink-0">
            <label className="block text-xs text-blue-900 mb-1 font-semibold">
              כמות
            </label>
            <select
              className="border rounded-md p-2 bg-white min-w-[70px] text-xs"
              value={filterCount}
              onChange={(e) => setFilterCount(e.target.value as any)}
            >
              <option value="הכל">הכל</option>
              <option value="0">0</option>
              <option value="1+">1+</option>
            </select>
          </div>

          {/* מיון לפי */}
          <div className="shrink-0">
            <label className="block text-xs text-blue-900 mb-1 font-semibold">
              מיון לפי
            </label>
            <select
              className="border rounded-md p-2 bg-white min-w-[100px] text-xs"
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
            >
              <option value="status">סטטוס</option>
              <option value="name">שם</option>
              <option value="phone">טלפון</option>
              <option value="table">שולחן</option>
              <option value="count">כמות</option>
            </select>
          </div>

          {/* כיוון מיון */}
          <div className="shrink-0">
            <label className="block text-xs text-transparent mb-1">.</label>
            <button
              type="button"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="px-3 py-2 rounded-xl border bg-gray-50 hover:bg-gray-100 text-xs whitespace-nowrap"
              title="שנה כיוון מיון"
            >
              כיוון: {sortDir === "asc" ? "עולה ↑" : "יורד ↓"}
            </button>
          </div>

          {/* איפוס */}
          <div className="shrink-0">
            <label className="block text-xs text-transparent mb-1">.</label>
            <button
              type="button"
              onClick={() => {
                setFilterStatus("הכל");
                setFilterTable("הכל");
                setFilterCount("הכל");
                setSortField("name");
                setSortDir("asc");
                setQuery("");
              }}
              className="px-3 py-2 rounded-xl border bg-gray-50 hover:bg-gray-100 text-xs whitespace-nowrap"
              title="איפוס סינון ומיון"
            >
              אפס
            </button>
          </div>
        </div>

        {/* שורת תוצאות נפרדת */}
        <div className="mt-2 text-xs text-blue-900/70">
          תוצאות: {filteredGuests.length}
        </div>
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
            <button
              key={g._id ?? `${g.phone}-${idx}`}
              onClick={() => setSelected(g)}
              className="relative bg-white p-3 rounded-2xl shadow flex items-center justify-between border text-right hover:border-blue-300 transition"
            >
              {/* right accent */}
              <div
                className={`absolute right-0 top-0 bottom-0 w-2 rounded-r-2xl ${statusBarColor(g.status)}`}
              />
              <div className="text-sm pr-3">
                <div className="font-semibold text-gray-900">
                  {g.name}{" "}
                  <span className="text-gray-500 text-xs">
                    ({g.count ?? 0})
                  </span>
                </div>
                <div className="text-gray-600">
                  <a
                    dir="ltr"
                    href={toTelHref(g.phone)}
                    className="text-blue-700 underline underline-offset-2 hover:no-underline"
                    aria-label={`חיוג אל ${g.name}`}
                    onClick={(e) => e.stopPropagation()} // שלא יפתח מודל
                    onMouseDown={(e) => e.stopPropagation()} // הגנה נוספת במובייל
                  >
                    {formatPhoneDisplay(g.phone)}
                  </a>{" "}
                  •{" "}
                  <span className="text-blue-700">שולחן: {g.table || "-"}</span>
                  {/* =============================== */}
                  {/* תגית הסטטוס –  צמודה לשולחן */}
                  {/* ============================= */}
                  <span
                    className={`inline-block text-xs font-semibold rounded-full px-5 mr-2 py-0.5 ${statusBadge(g.status)}`}
                  >
                    {g.status}
                  </span>
                </div>
              </div>
              {/* <div
                className={`text-xs font-semibold rounded-full px-2 py-1 ${statusBadge(g.status)}`}
              >
                {g.status}
              </div> */}
            </button>
          ))}

          {filteredGuests.length === 0 && (
            <div className="text-center text-gray-400 p-10 bg-white rounded-2xl shadow">
              לא נמצאו תוצאות
            </div>
          )}
        </div>
      )}

      {/* Compact Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3">
          <div
            className="w-full max-w-sm md:max-w-[420px] bg-white rounded-xl shadow-lg p-4
                 max-h-[80vh] overflow-y-auto"
            dir="rtl"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold">עריכת אורח</h2>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-500 hover:text-gray-700 text-sm"
                aria-label="סגור"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveGuest(selected);
              }}
              className="space-y-2 text-sm"
            >
              <div>
                <label className="block text-xs text-gray-700 mb-1">שם</label>
                <input
                  className="w-full border rounded-md h-9 px-2"
                  value={selected.name}
                  onChange={(e) =>
                    setSelected({ ...selected, name: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-gray-700 mb-1">
                  טלפון
                </label>
                <input
                  className="w-full border rounded-md h-9 px-2"
                  value={selected.phone}
                  onChange={(e) =>
                    setSelected({ ...selected, phone: e.target.value })
                  }
                  inputMode="tel"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-gray-700 mb-1">
                  סטטוס
                </label>
                <select
                  className="w-full border rounded-md h-9 px-2 bg-white"
                  value={selected.status}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      status: e.target.value as Guest["status"],
                    })
                  }
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-700 mb-1">
                  כמות משתתפים
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  className="w-full border rounded-md h-9 px-2"
                  value={selected.count ?? 0}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      count: Math.max(0, Number(e.target.value || 0)),
                    })
                  }
                  disabled={selected.status !== "בא"}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-700 mb-1">
                  שולחן
                </label>
                <input
                  className="w-full border rounded-md h-9 px-2"
                  placeholder="מס׳ שולחן (אופציונלי)"
                  value={selected.table ?? ""}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      table: e.target.value.trim() || "",
                    })
                  }
                  disabled={selected.status !== "בא"}
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-md border text-sm"
                  onClick={() => setSelected(null)}
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-sm"
                  disabled={saving}
                >
                  {saving ? "שומר…" : "שמור"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Simple Modal */}
      {/* {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5"
            dir="rtl"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">עריכת אורח</h2>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveGuest(selected);
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-sm text-gray-700">שם</label>
                <input
                  className="w-full border rounded-md p-2"
                  value={selected.name}
                  onChange={(e) =>
                    setSelected({ ...selected, name: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="text-sm text-gray-700">טלפון</label>
                <input
                  className="w-full border rounded-md p-2"
                  value={selected.phone}
                  onChange={(e) =>
                    setSelected({ ...selected, phone: e.target.value })
                  }
                  inputMode="tel"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-gray-700">סטטוס</label>
                <select
                  className="w-full border rounded-md p-2 bg-white"
                  value={selected.status}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      status: e.target.value as Guest["status"],
                    })
                  }
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-700">כמות משתתפים</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  className="w-full border rounded-md p-2"
                  value={selected.count ?? 0}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      count: Math.max(0, Number(e.target.value || 0)),
                    })
                  }
                  disabled={selected.status !== "בא"}
                />
              </div>

              <div>
                <label className="text-sm text-gray-700">שולחן</label>
                <input
                  className="w-full border rounded-md p-2"
                  placeholder="מס׳ שולחן (אופציונלי)"
                  value={selected.table ?? ""}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      table: e.target.value.trim() || "",
                    })
                  }
                  disabled={selected.status !== "בא"}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-md border"
                  onClick={() => setSelected(null)}
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? "שומר…" : "שמור"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )} */}
    </div>
  );
}
