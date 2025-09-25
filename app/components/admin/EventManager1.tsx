"use client";

import React, { useEffect, useMemo, useState } from "react";

type Event = {
  _id: string;
  eventType: string;
  ownerEmail: string;
  date: string; // יכול להיות ריק/לא תקין — נטפל בזה
  createdAt: string;
  imagePath?: string;
};

// פונקציות קיימות שלך (עדכן נתיבים לפי הפרויקט)
import { deleteEventsByEventClient } from "../../utilityFunctions/eventFunctions";
import { deleteGuestsByEventClient } from "../../utilityFunctions/guestFunctions";
import { deleteTablesByEventClient } from "../../utilityFunctions/tableFunctions";

// shadcn/ui dialog (עדכן נתיב אם צריך)
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";

// ===== עזרי API מקומיים למחיקות “נתוני אירוע” =====
async function deleteSmsLogsByEventClient(eventId: string, email: string) {
  const url = `/api/sms-log?eventId=${encodeURIComponent(
    eventId
  )}&email=${encodeURIComponent(email)}`;
  const res = await fetch(url, { method: "DELETE", cache: "no-store" });
  if (!res.ok) throw new Error("מחיקת לוגי SMS נכשלה");
  return (await res.json()) as { deletedCount: number };
}

async function deleteImageByPath(imagePath?: string) {
  if (!imagePath) return { ok: true, skipped: true as const };
  const res = await fetch("/api/supabase/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: imagePath }),
  });
  if (!res.ok) {
    let msg = "מחיקת תמונה נכשלה";
    try {
      const data = await res.json();
      if (data?.error) msg = `מחיקת תמונה נכשלה: ${data.error}`;
    } catch {}
    throw new Error(msg);
  }
  return { ok: true, skipped: false as const };
}

// ===== סינון/מיון =====
type SortKey = "eventType" | "ownerEmail" | "date" | "createdAt";
type SortDir = "asc" | "desc";
type TimeScope = "all" | "future" | "past";

function parseDateSafe(s?: string) {
  const t = s ? Date.parse(s) : NaN;
  return Number.isFinite(t) ? new Date(t) : null;
}
function cmp(
  a: string | Date | null | undefined,
  b: string | Date | null | undefined,
  dir: SortDir
) {
  let av: number | string = a instanceof Date ? a.getTime() : (a ?? "");
  let bv: number | string = b instanceof Date ? b.getTime() : (b ?? "");
  if (typeof av === "string") av = av.toLocaleLowerCase();
  if (typeof bv === "string") bv = bv.toLocaleLowerCase();

  if (av < bv) return dir === "asc" ? -1 : 1;
  if (av > bv) return dir === "asc" ? 1 : -1;
  return 0;
}
function hebDate(d?: string) {
  const dd = parseDateSafe(d);
  return dd ? dd.toLocaleDateString("he-IL") : "—";
}

// ===== אפשרויות מחיקה =====
type DeleteOptions = {
  sms: boolean;
  image: boolean;
  tables: boolean;
  guests: boolean;
  eventItself: boolean; // ברירת מחדל false — לא מוחקים אירוע אם היו כשלים
};

export default function EventManager() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);

  // ---- מצבי מודל מחיקה ----
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<Event | null>(null);
  const [opts, setOpts] = useState<DeleteOptions>({
    sms: true,
    image: true,
    tables: true,
    guests: true,
    eventItself: false,
  });
  const [deleting, setDeleting] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});

  // ---- סינון/מיון ----
  const [query, setQuery] = useState(""); // חיפוש בשם האירוע/אימייל
  const [timeScope, setTimeScope] = useState<TimeScope>("all"); // כל/עתיד/עבר לפי event.date
  const [dateFrom, setDateFrom] = useState<string>(""); // טווח תאריך אירוע
  const [dateTo, setDateTo] = useState<string>("");
  const [createdFrom, setCreatedFrom] = useState<string>(""); // טווח תאריך יצירה
  const [createdTo, setCreatedTo] = useState<string>("");

  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoadingTable(true);
    try {
      const res = await fetch("/api/events", { cache: "no-store" });
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTable(false);
    }
  };

  const filteredSorted = useMemo(() => {
    const now = new Date();
    let list = events.slice();

    // חיפוש טקסט
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((e) => {
        const a = (e.eventType || "").toLowerCase();
        const b = (e.ownerEmail || "").toLowerCase();
        return a.includes(q) || b.includes(q);
      });
    }

    // פילטר עתיד/עבר
    if (timeScope !== "all") {
      list = list.filter((e) => {
        const d = parseDateSafe(e.date);
        if (!d) return false; // ללא תאריך — לא נכלול
        return timeScope === "future" ? d >= now : d < now;
      });
    }

    // טווח תאריך אירוע
    const df = parseDateSafe(dateFrom);
    const dt = parseDateSafe(dateTo);
    if (df || dt) {
      list = list.filter((e) => {
        const d = parseDateSafe(e.date);
        if (!d) return false;
        if (df && d < df) return false;
        if (dt) {
          // כלול גם את יום ה-To (מוסיף 1 יום לקצה עליון)
          const end = new Date(dt);
          end.setHours(23, 59, 59, 999);
          if (d > end) return false;
        }
        return true;
      });
    }

    // טווח תאריך יצירה
    const cf = parseDateSafe(createdFrom);
    const ct = parseDateSafe(createdTo);
    if (cf || ct) {
      list = list.filter((e) => {
        const d = parseDateSafe(e.createdAt);
        if (!d) return false;
        if (cf && d < cf) return false;
        if (ct) {
          const end = new Date(ct);
          end.setHours(23, 59, 59, 999);
          if (d > end) return false;
        }
        return true;
      });
    }

    // מיון
    list.sort((a, b) => {
      switch (sortKey) {
        case "eventType":
          return cmp(a.eventType, b.eventType, sortDir);
        case "ownerEmail":
          return cmp(a.ownerEmail, b.ownerEmail, sortDir);
        case "date":
          return cmp(parseDateSafe(a.date), parseDateSafe(b.date), sortDir);
        case "createdAt":
        default:
          return cmp(
            parseDateSafe(a.createdAt),
            parseDateSafe(b.createdAt),
            sortDir
          );
      }
    });

    return list;
  }, [
    events,
    query,
    timeScope,
    dateFrom,
    dateTo,
    createdFrom,
    createdTo,
    sortKey,
    sortDir,
  ]);

  const resetFilters = () => {
    setQuery("");
    setTimeScope("all");
    setDateFrom("");
    setDateTo("");
    setCreatedFrom("");
    setCreatedTo("");
    setSortKey("createdAt");
    setSortDir("desc");
  };

  // ---- מחיקה (Best-Effort) ----
  const openDeleteModal = (ev: Event) => {
    setSelected(ev);
    setResultMsg(null);
    setErrorMap({});
    setShowModal(true);
  };
  const closeDeleteModal = () => {
    if (deleting) return;
    setShowModal(false);
    setSelected(null);
  };

  const handleRunDelete = async () => {
    if (!selected) return;

    setDeleting(true);
    setResultMsg(null);
    setErrorMap({});

    const errors: Record<string, string> = {};
    const success: {
      sms?: number;
      tables?: number;
      guests?: number;
      event?: number | "not-deleted-errors";
    } = {};
    let imageSkipped = false;
    let imageDeleted = false;

    try {
      if (opts.sms) {
        try {
          const r = await deleteSmsLogsByEventClient(
            String(selected._id),
            selected.ownerEmail
          );
          success.sms = r?.deletedCount ?? 0;
        } catch (e: any) {
          errors.sms = e?.message || "מחיקת לוגי SMS נכשלה";
        }
      }

      if (opts.image) {
        try {
          const r = await deleteImageByPath(selected.imagePath);
          imageSkipped = r.skipped;
          imageDeleted = !r.skipped;
        } catch (e: any) {
          errors.image = e?.message || "מחיקת תמונה נכשלה";
        }
      }

      if (opts.tables) {
        try {
          const r = await deleteTablesByEventClient(
            String(selected._id),
            selected.ownerEmail
          );
          // @ts-ignore
          success.tables = r?.deletedCount ?? 0;
        } catch (e: any) {
          errors.tables = e?.message || "מחיקת שולחנות נכשלה";
        }
      }

      if (opts.guests) {
        try {
          const r = await deleteGuestsByEventClient(
            String(selected._id),
            selected.ownerEmail
          );
          // @ts-ignore
          success.guests = r?.deletedCount ?? 0;
        } catch (e: any) {
          errors.guests = e?.message || "מחיקת אורחים נכשלה";
        }
      }

      const hadErrors = Object.keys(errors).length > 0;

      if (opts.eventItself) {
        if (hadErrors) {
          success.event = "not-deleted-errors";
        } else {
          try {
            const r = await deleteEventsByEventClient(
              String(selected._id),
              selected.ownerEmail
            );
            // @ts-ignore
            success.event = r?.deletedCount ?? 0;
          } catch (e: any) {
            errors.event = e?.message || "מחיקת האירוע נכשלה";
          }
        }
      }

      setErrorMap(errors);

      const parts: string[] = [];
      if (opts.sms) {
        parts.push(
          errors.sms
            ? "SMS: ✗"
            : `SMS: ${typeof success.sms === "number" ? success.sms : "✓"}`
        );
      }
      if (opts.image) {
        if (errors.image) parts.push("תמונה: ✗");
        else
          parts.push(
            `תמונה: ${imageSkipped ? "אין" : imageDeleted ? "✓" : "—"}`
          );
      }
      if (opts.tables) {
        parts.push(
          errors.tables
            ? "שולחנות: ✗"
            : `שולחנות: ${typeof success.tables === "number" ? success.tables : "✓"}`
        );
      }
      if (opts.guests) {
        parts.push(
          errors.guests
            ? "אורחים: ✗"
            : `אורחים: ${typeof success.guests === "number" ? success.guests : "✓"}`
        );
      }
      if (opts.eventItself) {
        if (errors.event) parts.push("אירוע: ✗");
        else if (success.event === "not-deleted-errors")
          parts.push("אירוע: לא נמחק (יש כשלים)");
        else
          parts.push(
            `אירוע: ${typeof success.event === "number" ? success.event : "—"}`
          );
      }

      const header =
        Object.keys(errors).length === 0
          ? opts.eventItself
            ? "המחיקה הושלמה בהצלחה."
            : "המחיקה הושלמה בהצלחה (נתוני האירוע)."
          : "בוצעה מחיקה חלקית — חלק מהפריטים לא נמחקו.";

      setResultMsg(`${header}\n${parts.join(" | ")}`);

      const eventReallyDeleted =
        opts.eventItself &&
        Object.keys(errors).length === 0 &&
        typeof success.event === "number" &&
        success.event > 0;

      if (eventReallyDeleted) {
        setEvents((prev) => prev.filter((e) => e._id !== selected._id));
      }
    } finally {
      setDeleting(false);
    }
  };

  // ---- UI ----
  return (
    <div className="p-6 bg-white rounded shadow" dir="rtl">
      <h2 className="text-2xl font-semibold mb-4">ניהול אירועים</h2>

      {/* סרגל סינון/מיון */}
      <div className="mb-4 p-3 border rounded bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">
              חיפוש (שם אירוע / אימייל)
            </label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
              placeholder="הקלד לחיפוש…"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">
              טווח תאריך אירוע
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
              <span className="text-xs text-gray-500">עד</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">
              טווח תאריך יצירה
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={createdFrom}
                onChange={(e) => setCreatedFrom(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
              <span className="text-xs text-gray-500">עד</span>
              <input
                type="date"
                value={createdTo}
                onChange={(e) => setCreatedTo(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">תצוגה:</span>
            <select
              value={timeScope}
              onChange={(e) => setTimeScope(e.target.value as TimeScope)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="all">כל האירועים</option>
              <option value="future">אירועים עתידיים</option>
              <option value="past">אירועים עברו</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">מיון לפי:</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="createdAt">תאריך יצירה</option>
              <option value="date">תאריך אירוע</option>
              <option value="eventType">שם אירוע</option>
              <option value="ownerEmail">אימייל</option>
            </select>
            <button
              className="border rounded px-2 py-1 text-sm"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              title="הפוך כיוון מיון"
            >
              {sortDir === "asc" ? "⬆️" : "⬇️"}
            </button>
          </div>

          <button
            onClick={resetFilters}
            className="ml-auto border rounded px-3 py-1 text-sm hover:bg-gray-100"
            title="ניקוי כל הסינונים והמיון"
          >
            אפס סינון/מיון
          </button>
        </div>
      </div>

      <div className="max-h-[60vh] overflow-y-auto border rounded">
        {loadingTable ? (
          <div className="p-4 text-sm text-gray-600">טוען…</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 text-right">
                <ThSort
                  label="שם האירוע"
                  sortBy="eventType"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={(k) => {
                    if (sortKey === k)
                      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                    else {
                      setSortKey(k);
                      setSortDir("asc");
                    }
                  }}
                />
                <ThSort
                  label="אימייל הלקוח"
                  sortBy="ownerEmail"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={(k) => {
                    if (sortKey === k)
                      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                    else {
                      setSortKey(k);
                      setSortDir("asc");
                    }
                  }}
                />
                <ThSort
                  label="תאריך האירוע"
                  sortBy="date"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={(k) => {
                    if (sortKey === k)
                      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                    else {
                      setSortKey(k);
                      setSortDir("asc");
                    }
                  }}
                />
                <ThSort
                  label="נוצר בתאריך"
                  sortBy="createdAt"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={(k) => {
                    if (sortKey === k)
                      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                    else {
                      setSortKey(k);
                      setSortDir("asc");
                    }
                  }}
                />
                <th className="border p-2">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredSorted.map((event) => (
                <tr key={event._id} className="text-right">
                  <td className="border p-2">{event.eventType || "—"}</td>
                  <td className="border p-2">
                    {event.ownerEmail || "לא ידוע"}
                  </td>
                  <td className="border p-2">{hebDate(event.date)}</td>
                  <td className="border p-2">{hebDate(event.createdAt)}</td>
                  <td className="border p-2">
                    <button
                      onClick={() => openDeleteModal(event)}
                      className="px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 text-sm"
                    >
                      מחיקה / ניקוי נתונים
                    </button>
                  </td>
                </tr>
              ))}

              {filteredSorted.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    אין אירועים תואמים לסינון הנוכחי.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* מודל shadcn/ui למחיקה */}
      <Dialog
        open={showModal}
        onOpenChange={(o) => !deleting && setShowModal(o)}
      >
        <DialogContent dir="rtl" className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              מחיקת נתונים עבור: {selected?.eventType} (ID: {selected?._id})
            </DialogTitle>
          </DialogHeader>

          <div className="text-sm text-gray-700 space-y-2">
            <p>בחר מה למחוק (נמשיך גם אם יהיה כשל בפריט מסוים):</p>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={opts.sms}
                onChange={(e) =>
                  setOpts((o) => ({ ...o, sms: e.target.checked }))
                }
                disabled={deleting}
              />
              מחיקת לוגי SMS
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={opts.image}
                onChange={(e) =>
                  setOpts((o) => ({ ...o, image: e.target.checked }))
                }
                disabled={deleting}
              />
              מחיקת תמונת הזמנה (אם קיימת)
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={opts.tables}
                onChange={(e) =>
                  setOpts((o) => ({ ...o, tables: e.target.checked }))
                }
                disabled={deleting}
              />
              מחיקת שולחנות
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={opts.guests}
                onChange={(e) =>
                  setOpts((o) => ({ ...o, guests: e.target.checked }))
                }
                disabled={deleting}
              />
              מחיקת אורחים
            </label>

            <div className="pt-2 border-t">
              <label className="flex items-center gap-2 text-red-700">
                <input
                  type="checkbox"
                  checked={opts.eventItself}
                  onChange={(e) =>
                    setOpts((o) => ({ ...o, eventItself: e.target.checked }))
                  }
                  disabled={deleting}
                />
                מחיקת האירוע עצמו (יבוצע רק אם לא יהיו כשלים בשלבים הקודמים)
              </label>
            </div>

            {Object.keys(errorMap).length > 0 && (
              <div className="mt-2 p-2 rounded bg-red-50 text-red-700 text-xs leading-5">
                <div className="font-semibold mb-1">שגיאות שהתרחשו:</div>
                <ul className="list-disc pr-5">
                  {Object.entries(errorMap).map(([k, v]) => (
                    <li key={k}>
                      <span className="font-medium">{labelHeb(k)}:</span> {v}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {resultMsg && (
              <div className="mt-2 p-2 rounded bg-green-50 text-green-800 text-xs whitespace-pre-line">
                {resultMsg /* “בוצעה מחיקה חלקית” במקרה של כשלים */}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <button
              onClick={handleRunDelete}
              disabled={deleting || !selected}
              className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? "מוחק…" : "הפעל מחיקה"}
            </button>
            <button
              onClick={closeDeleteModal}
              disabled={deleting}
              className="px-4 py-2 rounded border"
            >
              סגור
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// תא כותרת עם מיון בלחיצה
function ThSort({
  label,
  sortBy,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  sortBy: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = sortKey === sortBy;
  return (
    <th className="border p-0">
      <button
        className={`w-full text-right px-2 py-2 flex items-center justify-between ${
          active ? "bg-gray-100 font-semibold" : "bg-gray-100"
        }`}
        onClick={() => onSort(sortBy)}
        title="לחץ למיון לפי עמודה זו"
      >
        <span>{label}</span>
        <span className="text-xs opacity-70">
          {active ? (sortDir === "asc" ? "⬆️" : "⬇️") : "↕️"}
        </span>
      </button>
    </th>
  );
}

// תוויות לשגיאות במודל
function labelHeb(k: string) {
  switch (k) {
    case "sms":
      return "לוגי SMS";
    case "image":
      return "תמונה";
    case "tables":
      return "שולחנות";
    case "guests":
      return "אורחים";
    case "event":
      return "אירוע";
    default:
      return k;
  }
}
