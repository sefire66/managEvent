// app/host/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Logo3lines from "../components/Logo3Lines";

// ===== Types =====
type Guest = {
  _id?: string;
  name: string;
  phone: string;
  table?: string | null;
  arrived?: boolean; // לא משפיע על צבע כרגע
  count?: number;
  status?: "לא ענה" | "בא" | "לא בא" | "אולי";
};

type EventDetails = {
  _id?: string;
  brideFirst: string;
  brideLast: string;
  groomFirst: string;
  groomLast: string;
  date: string; // "YYYY-MM-DD"
  time?: string;
  venue: string;
  address?: string;
  eventType?: string;
  ownerEmail?: string;
  imageUrl?: string;
  imagePath?: string;
  googleMapsLink?: string;
  wazeLink?: string;

  // 👇 אופציונלי: קיבולת לכל שולחן (לפי מזהה/שם השולחן)
  tableCapacities?: Record<string, number>;
};

// ===== Status UI helpers (זהה ל-RSVP) =====
const statusBarColor = (status: NonNullable<Guest["status"]>) => {
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

const statusBadge = (status: NonNullable<Guest["status"]>) => {
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

// טלפון לחיץ (כמו ב-RSVP)
const toTelHref = (raw: string) => {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  if (/^\+/.test(trimmed)) return `tel:${trimmed.replace(/\s+/g, "")}`;
  const digits = trimmed.replace(/\D/g, "");
  if (/^0\d{8,9}$/.test(digits)) return `tel:+972${digits.slice(1)}`;
  return `tel:${digits}`;
};
const formatPhoneDisplay = (raw: string) => raw.replace(/\s+/g, "");

// ===== Event title helpers (מיושר ל-EventTitle) =====
const normalizeEventType = (t?: string) => {
  const x = (t || "").trim();
  if (x === "אירוע עיסקי") return "אירוע עסקי";
  return x || "";
};

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
      return `ברית לבנם של ${bride}`;
    case "בריתה":
      return `בריתה לבתם של ${bride}`;
    case "יום הולדת":
      return `חוגגים יום הולדת ל${bride || groom}`;
    case "אירוע עסקי":
      return `ברוכים הבאים ל${bride}${brideLast ? ` של ${brideLast}` : ""}`;
    default:
      return `${type || "אירוע"} של ${groom || bride || "החוגג"}`;
  }
};

// תאריך לקריאות
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

// חילוץ מספר משדה שולחן (למיון מספרי אמיתי)
const extractTableNumber = (t?: string | null): number | null => {
  if (!t) return null;
  const m = String(t).match(/\d+/);
  if (!m) return null;
  return Number(m[0]);
};

type SortField = "name" | "table";
type SortDir = "asc" | "desc";

export default function HostDashboard() {
  const search = useSearchParams();
  const router = useRouter();

  // ----- URL params -----
  const clientParam = search.get("client");
  const eventIdParam = search.get("eventId");
  const clientEmail = clientParam ? decodeURIComponent(clientParam) : null;
  const eventId = eventIdParam ? decodeURIComponent(eventIdParam) : null;

  // redirect if missing params
  useEffect(() => {
    if (!clientEmail || !eventId) {
      if (typeof window !== "undefined") router.replace("/host/login");
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

  // סרגל אחד: חיפוש כללי + מס' שולחן + מיון + כיוון + שולחנות פנויים + איפוס
  const [query, setQuery] = useState("");
  const [tableQuery, setTableQuery] = useState(""); // רק מספרים
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showAvailableTables, setShowAvailableTables] = useState(false);

  // ----- Sticky header height -----
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState<number>(0);

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

  // ----- Fetch Event -----
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

  // ----- Fetch Guests -----
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoadingGuests(true);
        setGuestsError("");
        const res = await fetch(
          `/api/guests?email=${encodeURIComponent(clientEmail!)}&eventId=${encodeURIComponent(
            eventId!
          )}&fields=name,phone,table,count,status`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`guests API ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("Invalid guests payload");

        const normalized: Guest[] = data.map((g: any) => {
          const status = (g.status as Guest["status"]) ?? "לא ענה";
          const count =
            typeof g.count === "number" ? g.count : status === "בא" ? 1 : 0;
          return {
            _id: g._id,
            name: String(g.name ?? ""),
            phone: String(g.phone ?? ""),
            table: g.table ?? null,
            count,
            status,
            arrived: Boolean(g.arrived ?? false), // לא בשימוש לצבע
          };
        });

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

  // ----- Header text -----
  const headerTitle = eventDetails ? buildEventTitle(eventDetails) : "אירוע";
  const headerSubtitle = eventDetails
    ? `${fmtDate(eventDetails.date)} • ${eventDetails.venue || eventDetails.address || ""}`
    : "";

  // ===== Derivations =====

  // מסננים רק "בא"
  const confirmed = useMemo(
    () => guests.filter((g) => (g.status ?? "לא ענה") === "בא"),
    [guests]
  );

  // חיפוש לפי שם/טלפון
  const searchFilter = (g: Guest) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const nameMatch = (g.name || "").toLowerCase().includes(q);
    const phoneDigits = (g.phone || "").replace(/\D/g, "");
    const qDigits = q.replace(/\D/g, "");
    const isDigitsOnly = /^\d+$/.test(q);
    if (isDigitsOnly) return phoneDigits.includes(qDigits);
    if (qDigits.length > 0) return nameMatch || phoneDigits.includes(qDigits);
    return nameMatch;
  };

  // סינון לפי מס' שולחן (אם מולא)
  const tableFilter = (g: Guest) => {
    const t = tableQuery.trim();
    if (!t) return true; // לא מולא → לא מסנן
    const num = extractTableNumber(g.table);
    const wanted = Number(t);
    if (Number.isNaN(wanted)) return true;
    return num === wanted;
  };

  // מיון לפי שם / שולחן (שולחן — מספרי אמיתי; לא-מספרי בסוף)
  const sortGuests = (arr: Guest[]) => {
    const cmpName = (a: Guest, b: Guest) =>
      (a.name || "").localeCompare(b.name || "", "he");
    const cmpTable = (a: Guest, b: Guest) => {
      const na = extractTableNumber(a.table);
      const nb = extractTableNumber(b.table);
      if (na !== null && nb !== null) {
        if (na !== nb) return na - nb;
        return cmpName(a, b);
      }
      if (na !== null && nb === null) return -1; // מספרי לפני לא-מספרי/ריק
      if (na === null && nb !== null) return 1;
      // שניהם לא-מספריים/ריקים → אלפביתי לפי table ואז שם
      const ta = a.table ?? "";
      const tb = b.table ?? "";
      const tcmp = ta.localeCompare(tb, "he", { numeric: true });
      return tcmp !== 0 ? tcmp : cmpName(a, b);
    };

    const base = [...arr].sort(sortField === "name" ? cmpName : cmpTable);
    return sortDir === "asc" ? base : base.reverse();
  };

  // רשימת אורחים מוצגת (כש"פנויים" כבוי)
  const visibleGuests = useMemo(() => {
    const base = confirmed.filter((g) => searchFilter(g) && tableFilter(g));
    return sortGuests(base);
  }, [confirmed, query, tableQuery, sortField, sortDir]);

  // חישוב תפוסה לכל שולחן (רק "בא")
  const occupancy = useMemo(() => {
    const map = new Map<string, number>();
    confirmed.forEach((g) => {
      const key = (g.table ?? "").trim();
      if (!key) return;
      const prev = map.get(key) ?? 0;
      map.set(key, prev + Math.max(0, g.count ?? 0));
    });
    return map; // table -> sum(count)
  }, [confirmed]);

  // רשימת שולחנות פנויים (capacity - occupied >= 1)
  const availableTables = useMemo(() => {
    const caps = eventDetails?.tableCapacities || null;
    if (!caps) return null; // אין קיבולות → לא ניתן לחשב
    const out: Array<{
      table: string;
      capacity: number;
      occupied: number;
      remaining: number;
    }> = [];
    Object.entries(caps).forEach(([table, capacity]) => {
      const occ = occupancy.get(table) ?? 0;
      const remaining = Math.max(0, (capacity || 0) - occ);
      if (remaining >= 1) {
        out.push({ table, capacity: capacity || 0, occupied: occ, remaining });
      }
    });
    // מיון: לפי נותרו (יורד) ואז לפי מספר שולחן (מספרי), ואז אלפביתי
    out.sort((a, b) => {
      if (b.remaining !== a.remaining) return b.remaining - a.remaining;
      const na = extractTableNumber(a.table);
      const nb = extractTableNumber(b.table);
      if (na !== null && nb !== null) return na - nb;
      if (na !== null) return -1;
      if (nb !== null) return 1;
      return a.table.localeCompare(b.table, "he", { numeric: true });
    });
    // החלת tableQuery אם מולא
    if (tableQuery.trim()) {
      const wanted = Number(tableQuery.trim());
      if (!Number.isNaN(wanted)) {
        return out.filter((t) => extractTableNumber(t.table) === wanted);
      }
    }
    return out;
  }, [eventDetails?.tableCapacities, occupancy, tableQuery]);

  // Totals (לכותרת/מידע)
  const totalConfirmedGuests = confirmed.length;
  const totalConfirmedPeople = confirmed.reduce(
    (s, g) => s + (g.count ?? 0),
    0
  );
  const totalConfirmedNoTable = confirmed.filter(
    (g) => !g.table || g.table === ""
  ).length;

  // ===== UI =====
  return (
    <div className="container mx-auto p-2" dir="rtl">
      {/* Header */}
      <div
        ref={headerRef}
        className="sticky top-0 z-20 rounded-2xl p-3 mt-2 mb-3 shadow
             bg-gradient-to-l from-pink-400 to-white border border-blue-200
             backdrop-blur supports-[backdrop-filter]:bg-white/70"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="transform scale-90 origin-left w-28 sm:w-32 mr-10 ml-2">
              <Logo3lines />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-blue-800">
                {loadingEvent ? "טוען פרטי אירוע…" : headerTitle}
              </h1>
              {eventError ? (
                <p className="text-red-700 text-sm mt-1">{eventError}</p>
              ) : (
                <p className="hidden sm:block text-xs text-blue-900/80">
                  {loadingEvent ? "" : headerSubtitle}
                </p>
              )}
              <div className="hidden sm:block mt-1 text-xs text-blue-900/80">
                <span className="mr-2">מאושרים: {totalConfirmedGuests}</span>
                <span className="mr-2">סה״כ אנשים: {totalConfirmedPeople}</span>
                <span>מאושרים ללא שולחן: {totalConfirmedNoTable}</span>
              </div>
              <p className="hidden sm:block text-[11px] text-blue-900/60 mt-1">
                (מארח של {clientEmail})
              </p>
            </div>
          </div>
          <div>
            <button
              onClick={toggleFullScreen}
              className="px-4 ml-2 py-2 bg-blue-500 text-white rounded-xl shadow hover:bg-blue-600"
            >
              {isFull ? "צא ממסך מלא" : "מסך מלא"}
            </button>

            <button
              onClick={() => router.push("/host/login")}
              className="px-4 py-2 rounded-xl border border-red-300 bg-red-50 hover:bg-red-100 transition"
            >
              יציאה
            </button>
          </div>
        </div>
      </div>

      {/* Controls — הכל בשורה אחת */}
      <div
        className="z-10 bg-blue-50 border border-blue-200 rounded-2xl shadow p-3 mb-3
                   backdrop-blur supports-[backdrop-filter]:bg-blue-50/80 sticky overflow-x-auto"
        style={{ top: headerHeight }}
      >
        <div className="flex items-center gap-2 flex-nowrap whitespace-nowrap">
          {/* חיפוש רחב */}
          <input
            className="flex-[2] min-w-[160px] border-2 border-blue-300 rounded-xl h-9 px-3
                       focus:outline-none focus:border-blue-500 text-xs"
            placeholder="חפש לפי שם או טלפון…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <span className="opacity-50">•</span>

          {/* מס' שולחן (נומרי) */}
          <input
            className="w-[80px] border rounded-md h-9 px-2 text-xs"
            placeholder="שולחן #"
            inputMode="numeric"
            pattern="\d*"
            value={tableQuery}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d]/g, "");
              setTableQuery(v);
            }}
          />

          {/* מיון: שם / שולחן# */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSortField("name")}
              className={`px-3 h-9 rounded-xl border text-xs ${
                sortField === "name"
                  ? "bg-white border-blue-400"
                  : "bg-gray-50 border-gray-200"
              }`}
              title="מיון לפי שם"
            >
              שם
            </button>
            <button
              type="button"
              onClick={() => setSortField("table")}
              className={`px-3 h-9 rounded-xl border text-xs ${
                sortField === "table"
                  ? "bg-white border-blue-400"
                  : "bg-gray-50 border-gray-200"
              }`}
              title="מיון לפי שולחן (מספרי)"
            >
              שולחן #
            </button>
          </div>

          {/* כיוון מיון */}
          <button
            type="button"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className="px-3 h-9 rounded-xl border bg-gray-50 hover:bg-gray-100 text-xs"
            title="שנה כיוון מיון"
          >
            {sortDir === "asc" ? "עולה ↑" : "יורד ↓"}
          </button>

          <span className="opacity-50">•</span>

          {/* שולחנות פנויים */}
          {/* <button
            type="button"
            onClick={() => setShowAvailableTables((v) => !v)}
            className={`px-3 h-9 rounded-xl border text-xs ${
              showAvailableTables
                ? "bg-white border-blue-400"
                : "bg-gray-50 border-gray-200"
            }`}
            title="הצג שולחנות פנויים"
          >
            שולחנות פנויים
          </button> */}

          {/* איפוס */}
          <button
            type="button"
            className="px-3 h-9 rounded-xl border bg-gray-50 hover:bg-gray-100 text-xs"
            title="איפוס סינון ומיון"
            onClick={() => {
              setQuery("");
              setTableQuery("");
              setSortField("name");
              setSortDir("asc");
              setShowAvailableTables(false);
            }}
          >
            ↺ איפוס
          </button>

          {/* מונה תוצאות */}
          <span className="ml-2 text-xs text-blue-900/70">
            תוצאות:{" "}
            {showAvailableTables
              ? availableTables
                ? availableTables.length
                : 0
              : visibleGuests.length}
          </span>
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
      ) : showAvailableTables ? (
        // מצב "שולחנות פנויים"
        availableTables === null ? (
          <div className="text-center text-blue-900/80 p-6 bg-white rounded-2xl border">
            לא הוגדרה קיבולת לשולחנות באירוע — לא ניתן לחשב פניות.
          </div>
        ) : availableTables.length === 0 ? (
          <div className="text-center text-gray-500 p-10 bg-white rounded-2xl border">
            אין שולחנות פנויים כרגע
          </div>
        ) : (
          <div className="grid gap-2">
            {availableTables.map((t) => (
              <div
                key={t.table}
                className="bg-white p-3 rounded-xl shadow border flex items-center justify-between"
              >
                <div className="text-sm">
                  <div className="font-semibold text-gray-900">
                    שולחן {t.table}
                  </div>
                  <div className="text-gray-600 text-xs">
                    מושבים: {t.occupied}/{t.capacity} • נותרו {t.remaining}
                  </div>
                </div>
                <div className="text-xs font-semibold rounded-full px-2 py-1 bg-green-100 text-green-700">
                  פנוי
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // מצב רשימת אורחים (רק "בא", כולל בלי שולחן)
        <div className="grid gap-2">
          {visibleGuests.map((g, idx) => (
            <div
              key={g._id ?? `${g.phone}-${idx}`}
              className="relative bg-white p-3 rounded-2xl shadow flex items-center justify-between border hover:border-blue-300 transition"
            >
              {/* פס ימין לפי סטטוס (כולם "בא" → ירוק) */}
              <div
                className={`absolute right-0 top-0 bottom-0 w-2 rounded-r-2xl ${statusBarColor(
                  (g.status as NonNullable<Guest["status"]>) || "בא"
                )}`}
              />
              <div className="text-sm pr-3">
                <div className="font-semibold text-gray-900">
                  {g.name}{" "}
                  <span className="text-gray-500 text-xs">
                    ({g.count ?? 1})
                  </span>
                </div>
                <div className="text-gray-600 flex items-center gap-1 whitespace-nowrap overflow-x-auto">
                  <a
                    dir="ltr"
                    href={toTelHref(g.phone)}
                    className="text-blue-700 underline underline-offset-2 hover:no-underline"
                  >
                    {formatPhoneDisplay(g.phone)}
                  </a>
                  <span className="opacity-60 mx-1">•</span>
                  <span className="text-blue-700">שולחן: {g.table || "-"}</span>
                  <span className="opacity-60 mx-1">•</span>
                  <span
                    className={`inline-block text-sm font-semibold rounded-full px-2 py-0.5 ${statusBadge(
                      (g.status as NonNullable<Guest["status"]>) || "בא"
                    )}`}
                  >
                    {g.status || "בא"}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {visibleGuests.length === 0 && (
            <div className="text-center text-gray-500 p-10 bg-white rounded-2xl border">
              לא נמצאו תוצאות
            </div>
          )}
        </div>
      )}
    </div>
  );
}
