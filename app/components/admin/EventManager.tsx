"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";

// ===== Types =====
type Event = {
  _id: string;
  eventType: string;
  ownerEmail: string;
  date: string; // ISO
  createdAt: string; // ISO
  imagePath?: string;
};

// ===== Utilities from your app (עדכן נתיבים לפי הפרויקט שלך) =====
import { deleteEventsByEventClient } from "../../utilityFunctions/eventFunctions";
import { deleteGuestsByEventClient } from "../../utilityFunctions/guestFunctions";
import { deleteTablesByEventClient } from "../../utilityFunctions/tableFunctions";

// ===== shadcn/ui dialog (עדכן נתיב אם צריך) =====
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";

// ===== Helpers (local) =====
async function deleteSmsLogsByEventClient(eventId: string, email: string) {
  const url = `/api/sms-log?eventId=${encodeURIComponent(
    eventId
  )}&email=${encodeURIComponent(email)}`;
  const res = await fetch(url, { method: "DELETE", cache: "no-store" });
  if (!res.ok) throw new Error("מחיקת לוגי SMS נכשלה");
  return (await res.json()) as { deletedCount: number };
}

// ✨ חדש: מחיקה מרוכזת של ScheduledSms לכל סוגי ה-SMS (ללא cancel)
async function deleteScheduledSmsByEventClient(eventId: string) {
  const types: Array<
    "saveDate" | "invitation" | "reminder" | "tableNumber" | "thankYou"
  > = ["saveDate", "invitation", "reminder", "tableNumber", "thankYou"];

  let deleted = 0;
  let notFound = 0;
  let failed = 0;

  await Promise.all(
    types.map(async (smsType) => {
      try {
        const res = await fetch(
          `/api/scheduledSms?eventId=${encodeURIComponent(
            eventId
          )}&smsType=${smsType}`,
          { method: "DELETE", cache: "no-store" }
        );
        if (res.ok) {
          deleted += 1; // כל קריאה מוחקת רשומת תיזמון אחת (אם קיימת)
        } else if (res.status === 404) {
          notFound += 1;
        } else {
          failed += 1;
        }
      } catch {
        failed += 1;
      }
    })
  );

  return { deleted, notFound, failed, totalTried: types.length };
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

// ===== Sorting / Filtering helpers =====
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
  if (typeof av === "string") av = av.toLowerCase();
  if (typeof bv === "string") bv = bv.toLowerCase();
  if (av < bv) return dir === "asc" ? -1 : 1;
  if (av > bv) return dir === "asc" ? 1 : -1;
  return 0;
}
function hebDate(d?: string) {
  const dd = parseDateSafe(d);
  return dd ? dd.toLocaleDateString("he-IL") : "—";
}

// ===== Delete options/results =====
type DeleteOptions = {
  sms: boolean; // לוגי SMS
  schedules: boolean; // ✨ חדש: ScheduledSms
  image: boolean;
  tables: boolean;
  guests: boolean;
  eventItself: boolean; // delete event doc itself (רק אם אין כשלים)
};

type DeleteResultDetails = {
  sms?: { ok: boolean; count?: number; error?: string };
  schedules?: {
    ok: boolean;
    deleted?: number;
    notFound?: number;
    failed?: number;
    totalTried?: number;
    error?: string;
  };
  image?: { ok: boolean; skipped?: boolean; error?: string };
  tables?: { ok: boolean; count?: number; error?: string };
  guests?: { ok: boolean; count?: number; error?: string };
  event?: { ok: boolean; count?: number; error?: string; skipped?: boolean };
};

export default function EventManager() {
  // Accordion state
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Data
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);

  // Delete modal state
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<Event | null>(null);
  const [opts, setOpts] = useState<DeleteOptions>({
    sms: true,
    schedules: true, // ✨ ברירת־מחדל: למחוק גם תיזמונים
    image: true,
    tables: true,
    guests: true,
    eventItself: false,
  });
  const [deleting, setDeleting] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState<"none" | "partial" | "success">(
    "none"
  );

  // ✅ תוצאות פרטניות לכל סעיף
  const [resultDetails, setResultDetails] =
    useState<DeleteResultDetails | null>(null);

  // Filters / Sorting
  const [query, setQuery] = useState("");
  const [timeScope, setTimeScope] = useState<TimeScope>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [createdFrom, setCreatedFrom] = useState<string>("");
  const [createdTo, setCreatedTo] = useState<string>("");

  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Fetch all events
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

  // Filter + sort memo
  const filteredSorted = useMemo(() => {
    const now = new Date();
    let list = events.slice();

    // text query
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((e) => {
        const a = (e.eventType || "").toLowerCase();
        const b = (e.ownerEmail || "").toLowerCase();
        return a.includes(q) || b.includes(q);
      });
    }

    // time scope
    if (timeScope !== "all") {
      list = list.filter((e) => {
        const d = parseDateSafe(e.date);
        if (!d) return false;
        return timeScope === "future" ? d >= now : d < now;
      });
    }

    // event date range
    const df = parseDateSafe(dateFrom);
    const dt = parseDateSafe(dateTo);
    if (df || dt) {
      list = list.filter((e) => {
        const d = parseDateSafe(e.date);
        if (!d) return false;
        if (df && d < df) return false;
        if (dt) {
          const end = new Date(dt);
          end.setHours(23, 59, 59, 999);
          if (d > end) return false;
        }
        return true;
      });
    }

    // createdAt date range
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

    // sort
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

  // Export CSV of current view (filtered + sorted)
  const handleExportCSV = useCallback(() => {
    const rows = filteredSorted;
    const headers = [
      "שם האירוע",
      "אימייל הלקוח",
      "תאריך האירוע",
      "נוצר בתאריך",
      "מזהה (_id)",
    ];

    const escape = (val: unknown) => {
      if (val === null || val === undefined) return "";
      const s = String(val);
      if (/[",\n\r]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const lines: string[] = [];
    lines.push(headers.map(escape).join(","));
    for (const e of rows) {
      lines.push(
        [
          e.eventType || "",
          e.ownerEmail || "",
          hebDate(e.date),
          hebDate(e.createdAt),
          e._id,
        ]
          .map(escape)
          .join(",")
      );
    }

    const csv = "\uFEFF" + lines.join("\r\n"); // BOM + CRLF
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
    a.href = url;
    a.download = `events-export-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [filteredSorted]);

  // Delete modal
  const openDeleteModal = (ev: Event) => {
    setSelected(ev);
    setResultMsg(null);
    setErrorMap({});
    setCompleted("none");
    setResultDetails(null); // ✅ איפוס תוצאות פר סעיף
    setShowModal(true);
  };
  const closeDeleteModal = () => {
    if (deleting) return;
    setShowModal(false);
  };

  const handleRunDelete = async () => {
    if (!selected) return;

    setDeleting(true);
    setResultMsg(null);
    setErrorMap({});
    setCompleted("none");

    const errors: Record<string, string> = {};
    const results: DeleteResultDetails = {};

    try {
      // SMS logs
      if (opts.sms) {
        try {
          const r = await deleteSmsLogsByEventClient(
            String(selected._id),
            selected.ownerEmail
          );
          results.sms = { ok: true, count: r?.deletedCount ?? 0 };
        } catch (e: any) {
          results.sms = {
            ok: false,
            error: e?.message || "מחיקת לוגי SMS נכשלה",
          };
          errors.sms = results.sms.error!;
        }
      }

      // ✨ ScheduledSms
      if (opts.schedules) {
        try {
          const r = await deleteScheduledSmsByEventClient(String(selected._id));
          if (r.failed > 0) {
            results.schedules = {
              ok: false,
              ...r,
              error: "לא כל התיזמונים נמחקו",
            };
            errors.schedules = "לא כל התיזמונים נמחקו";
          } else {
            results.schedules = { ok: true, ...r };
          }
        } catch (e: any) {
          results.schedules = {
            ok: false,
            error: e?.message || "מחיקת תיזמונים נכשלה",
          };
          errors.schedules = results.schedules.error!;
        }
      }

      // Image
      if (opts.image) {
        try {
          const r = await deleteImageByPath(selected.imagePath);

          const res = await fetch("/api/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              _id: selected._id,
              imageUrl: null,
              imagePath: null,
            }),
          });

          let data: any = null;
          try {
            data = await res.json();
          } catch {}
          if (!res.ok || data?.error) {
            throw new Error(data?.error || "ניקוי שדות בבסיס הנתונים נכשל");
          }

          results.image = { ok: true, skipped: !!r.skipped };
        } catch (e: any) {
          results.image = {
            ok: false,
            error: e?.message || "מחיקת תמונה/ניקוי DB נכשל",
          };
          errors.image = results.image.error!;
        }
      }

      // Tables
      if (opts.tables) {
        try {
          const r = await deleteTablesByEventClient(
            String(selected._id),
            selected.ownerEmail
          );
          // @ts-ignore בהתאם להחזרה שלך
          results.tables = { ok: true, count: r?.deletedCount ?? 0 };
        } catch (e: any) {
          results.tables = {
            ok: false,
            error: e?.message || "מחיקת שולחנות נכשלה",
          };
          errors.tables = results.tables.error!;
        }
      }

      // Guests
      if (opts.guests) {
        try {
          const r = await deleteGuestsByEventClient(
            String(selected._id),
            selected.ownerEmail
          );
          // @ts-ignore בהתאם להחזרה שלך
          results.guests = { ok: true, count: r?.deletedCount ?? 0 };
        } catch (e: any) {
          results.guests = {
            ok: false,
            error: e?.message || "מחיקת אורחים נכשלה",
          };
          errors.guests = results.guests.error!;
        }
      }

      const hadErrors = Object.keys(errors).length > 0;

      // Event itself
      if (opts.eventItself) {
        if (hadErrors) {
          results.event = {
            ok: false,
            skipped: true,
            error: "לא נמחק (יש כשלים בנתונים)",
          };
        } else {
          try {
            const r = await deleteEventsByEventClient(
              String(selected._id),
              selected.ownerEmail
            );
            // @ts-ignore בהתאם להחזרה שלך
            const delCount = r?.deletedCount ?? 0;
            if (delCount > 0) {
              results.event = { ok: true, count: delCount };
              setEvents((prev) => prev.filter((e) => e._id !== selected._id));
            } else {
              results.event = { ok: false, count: 0, error: "לא נמחק בפועל" };
              errors.event = "לא נמחק בפועל";
            }
          } catch (e: any) {
            results.event = {
              ok: false,
              error: e?.message || "מחיקת אירוע נכשלה",
            };
            errors.event = results.event.error!;
          }
        }
      }

      // קובע completed
      if (opts.eventItself) {
        setCompleted(
          results.event?.ok && !hadErrors
            ? "success"
            : hadErrors
              ? "partial"
              : "partial"
        );
      } else {
        setCompleted(hadErrors ? "partial" : "success");
      }

      setErrorMap(errors);
      setResultDetails(results);

      // סיכום טקסטואלי
      const parts: string[] = [];
      if (opts.sms) {
        parts.push(
          results.sms?.ok
            ? `SMS לוגים: ${typeof results.sms.count === "number" ? results.sms.count : "✓"}`
            : "SMS לוגים: ✗"
        );
      }
      if (opts.schedules) {
        if (results.schedules?.ok) {
          const d = results.schedules.deleted ?? 0;
          const total = results.schedules.totalTried ?? 5;
          const nf = results.schedules.notFound ?? 0;
          parts.push(
            `תיזמונים: נמחקו ${d}/${total}${nf ? ` (לא נמצאו ${nf})` : ""}`
          );
        } else {
          parts.push("תיזמונים: ✗");
        }
      }
      if (opts.image) {
        parts.push(
          results.image?.ok
            ? results.image.skipped
              ? "תמונה: אין"
              : "תמונה: ✓"
            : "תמונה: ✗"
        );
      }
      if (opts.tables) {
        parts.push(
          results.tables?.ok
            ? `שולחנות: ${typeof results.tables.count === "number" ? results.tables.count : "✓"}`
            : "שולחנות: ✗"
        );
      }
      if (opts.guests) {
        parts.push(
          results.guests?.ok
            ? `אורחים: ${typeof results.guests.count === "number" ? results.guests.count : "✓"}`
            : "אורחים: ✗"
        );
      }
      if (opts.eventItself) {
        parts.push(
          results.event?.ok
            ? `אירוע: ${typeof results.event.count === "number" ? results.event.count : "✓"}`
            : results.event?.skipped
              ? "אירוע: לא נמחק (כשלים)"
              : "אירוע: ✗"
        );
      }

      const header =
        Object.keys(errors).length === 0
          ? opts.eventItself
            ? "המחיקה הושלמה בהצלחה."
            : "המחיקה הושלמה בהצלחה (נתוני האירוע)."
          : "בוצעה מחיקה חלקית — חלק מהפריטים לא נמחקו.";

      setResultMsg(`${header}\n${parts.join(" | ")}`);
    } finally {
      setDeleting(false);
    }
  };

  // ===== Render =====
  return (
    <div className="bg-white rounded shadow" dir="rtl">
      {/* כותרת אקורדיון */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="w-full border-b p-3 text-right flex items-center justify-between hover:bg-gray-50 transition cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span
            className={`text-xl transform transition-transform duration-300 ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
          >
            {isOpen ? "−" : "+"}
          </span>
          <span className="text-sm font-semibold">ניהול אירועים</span>
        </div>

        {/* מונה */}
        <span className="text-xs text-gray-600">
          סה״כ: <b>{filteredSorted.length}</b> מתוך <b>{events.length}</b>
        </span>
      </button>

      {/* גוף האקורדיון */}
      {isOpen && (
        <div className="p-4">
          {/* סרגל סינון/מיון – קומפקטי בשורה אחת עם גלילה אופקית בעת צורך */}
          <FiltersBar
            query={query}
            setQuery={setQuery}
            timeScope={timeScope}
            setTimeScope={setTimeScope}
            dateFrom={dateFrom}
            setDateFrom={setDateFrom}
            dateTo={dateTo}
            setDateTo={setDateTo}
            createdFrom={createdFrom}
            setCreatedFrom={setCreatedFrom}
            createdTo={createdTo}
            setCreatedTo={setCreatedTo}
            sortKey={sortKey}
            setSortKey={setSortKey}
            sortDir={sortDir}
            setSortDir={setSortDir}
            totalFiltered={filteredSorted.length}
            totalAll={events.length}
            onReset={resetFilters}
            onExport={handleExportCSV}
          />

          {/* טבלה – מוקטנת */}
          <div className="max-h-[60vh] overflow-y-auto border rounded text-[12px] leading-tight">
            {loadingTable ? (
              <div className="p-3 text-gray-600 text-[12px]">טוען…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100 text-right">
                      <ThSort
                        label="שם האירוע"
                        sortBy="eventType"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onToggle={(k) => {
                          if (sortKey === k)
                            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                          else {
                            setSortKey(k);
                            setSortDir("asc");
                          }
                        }}
                        onExact={(k, dir) => {
                          setSortKey(k);
                          setSortDir(dir);
                        }}
                      />
                      <ThSort
                        label="אימייל הלקוח"
                        sortBy="ownerEmail"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onToggle={(k) => {
                          if (sortKey === k)
                            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                          else {
                            setSortKey(k);
                            setSortDir("asc");
                          }
                        }}
                        onExact={(k, dir) => {
                          setSortKey(k);
                          setSortDir(dir);
                        }}
                      />
                      <ThSort
                        label="תאריך האירוע"
                        sortBy="date"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onToggle={(k) => {
                          if (sortKey === k)
                            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                          else {
                            setSortKey(k);
                            setSortDir("asc");
                          }
                        }}
                        onExact={(k, dir) => {
                          setSortKey(k);
                          setSortDir(dir);
                        }}
                      />
                      <ThSort
                        label="נוצר בתאריך"
                        sortBy="createdAt"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onToggle={(k) => {
                          if (sortKey === k)
                            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                          else {
                            setSortKey(k);
                            setSortDir("asc");
                          }
                        }}
                        onExact={(k, dir) => {
                          setSortKey(k);
                          setSortDir(dir);
                        }}
                      />
                      <th className="border p-1.5 text-right">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSorted.map((event) => (
                      <tr key={event._id} className="text-right">
                        <td className="border p-1.5 whitespace-nowrap">
                          {event.eventType || "—"}
                        </td>
                        <td className="border p-1.5 whitespace-nowrap">
                          {event.ownerEmail || "לא ידוע"}
                        </td>
                        <td className="border p-1.5 whitespace-nowrap">
                          {hebDate(event.date)}
                        </td>
                        <td className="border p-1.5 whitespace-nowrap">
                          {hebDate(event.createdAt)}
                        </td>
                        <td className="border p-1.5 whitespace-nowrap">
                          <button
                            onClick={() => openDeleteModal(event)}
                            className="px-2.5 py-1 rounded bg-red-600 text-white hover:bg-red-700 text-[12px] cursor-pointer"
                          >
                            מחיקה / ניקוי נתונים
                          </button>
                        </td>
                      </tr>
                    ))}

                    {filteredSorted.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-3 text-center text-gray-500"
                        >
                          אין אירועים תואמים לסינון הנוכחי.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* מודל מחיקה */}
          <Dialog
            open={showModal}
            onOpenChange={(o) => !deleting && setShowModal(o)}
          >
            <DialogContent dir="rtl" className="max-w-[620px]">
              <DialogHeader>
                <DialogTitle>
                  מחיקת נתונים עבור: {selected?.eventType} (ID: {selected?._id})
                </DialogTitle>
              </DialogHeader>

              <div className="text-sm text-gray-700 space-y-3">
                <p>
                  בחר מה למחוק. נמשיך גם אם יהיה כשל בפריט מסוים. לאחר ההפעלה
                  תוצג תוצאה ליד כל שורה:
                </p>

                {/* SMS logs */}
                <OptionRow
                  label="מחיקת לוגי SMS"
                  checked={opts.sms}
                  disabled={deleting || completed === "success"}
                  onChange={(v) => setOpts((o) => ({ ...o, sms: v }))}
                  result={
                    resultDetails?.sms
                      ? resultDetails.sms.ok
                        ? `נמחקו ${resultDetails.sms.count ?? 0} ✔️`
                        : `שגיאה ✗`
                      : undefined
                  }
                  resultType={
                    resultDetails?.sms
                      ? resultDetails.sms.ok
                        ? "success"
                        : "error"
                      : undefined
                  }
                />

                {/* ✨ ScheduledSms */}
                <OptionRow
                  label="מחיקת תיזמוני SMS (Scheduled)"
                  checked={opts.schedules}
                  disabled={deleting || completed === "success"}
                  onChange={(v) => setOpts((o) => ({ ...o, schedules: v }))}
                  result={
                    resultDetails?.schedules
                      ? resultDetails.schedules.ok
                        ? `נמחקו ${resultDetails.schedules.deleted ?? 0}${
                            typeof resultDetails.schedules.totalTried ===
                            "number"
                              ? ` / ${resultDetails.schedules.totalTried}`
                              : ""
                          }${
                            resultDetails.schedules.notFound
                              ? ` (לא נמצאו ${resultDetails.schedules.notFound})`
                              : ""
                          } ✔️`
                        : "שגיאה ✗"
                      : undefined
                  }
                  resultType={
                    resultDetails?.schedules
                      ? resultDetails.schedules.ok
                        ? "success"
                        : "error"
                      : undefined
                  }
                />

                {/* Image */}
                <OptionRow
                  label="מחיקת תמונת הזמנה"
                  checked={opts.image}
                  disabled={deleting || completed === "success"}
                  onChange={(v) => setOpts((o) => ({ ...o, image: v }))}
                  result={
                    resultDetails?.image
                      ? resultDetails.image.ok
                        ? resultDetails.image.skipped
                          ? "אין תמונה"
                          : "נמחקה ✔️"
                        : "שגיאה ✗"
                      : undefined
                  }
                  resultType={
                    resultDetails?.image
                      ? resultDetails.image.ok
                        ? resultDetails.image.skipped
                          ? "neutral"
                          : "success"
                        : "error"
                      : undefined
                  }
                />

                {/* Tables */}
                <OptionRow
                  label="מחיקת שולחנות"
                  checked={opts.tables}
                  disabled={deleting || completed === "success"}
                  onChange={(v) => setOpts((o) => ({ ...o, tables: v }))}
                  result={
                    resultDetails?.tables
                      ? resultDetails.tables.ok
                        ? `נמחקו ${resultDetails.tables.count ?? 0} ✔️`
                        : "שגיאה ✗"
                      : undefined
                  }
                  resultType={
                    resultDetails?.tables
                      ? resultDetails.tables.ok
                        ? "success"
                        : "error"
                      : undefined
                  }
                />

                {/* Guests */}
                <OptionRow
                  label="מחיקת אורחים"
                  checked={opts.guests}
                  disabled={deleting || completed === "success"}
                  onChange={(v) => setOpts((o) => ({ ...o, guests: v }))}
                  result={
                    resultDetails?.guests
                      ? resultDetails.guests.ok
                        ? `נמחקו ${resultDetails.guests.count ?? 0} ✔️`
                        : "שגיאה ✗"
                      : undefined
                  }
                  resultType={
                    resultDetails?.guests
                      ? resultDetails.guests.ok
                        ? "success"
                        : "error"
                      : undefined
                  }
                />

                <div className="pt-2 border-t">
                  <OptionRow
                    label="מחיקת האירוע עצמו (יבוצע רק אם לא יהיו כשלים בשלבים הקודמים)"
                    checked={opts.eventItself}
                    disabled={deleting || completed === "success"}
                    onChange={(v) => setOpts((o) => ({ ...o, eventItself: v }))}
                    result={
                      resultDetails?.event
                        ? resultDetails.event.ok
                          ? `נמחק ${resultDetails.event.count ?? 1} ✔️`
                          : resultDetails.event.skipped
                            ? "לא נמחק (כשלים)"
                            : "שגיאה ✗"
                        : undefined
                    }
                    resultType={
                      resultDetails?.event
                        ? resultDetails.event.ok
                          ? "success"
                          : resultDetails.event.skipped
                            ? "neutral"
                            : "error"
                        : undefined
                    }
                  />
                </div>

                {/* תקציר שגיאות */}
                {Object.keys(errorMap).length > 0 && (
                  <div className="mt-2 p-2 rounded bg-red-50 text-red-700 text-xs leading-5">
                    <div className="font-semibold mb-1">שגיאות שהתרחשו:</div>
                    <ul className="list-disc pr-5">
                      {Object.entries(errorMap).map(([k, v]) => (
                        <li key={k}>
                          <span className="font-medium">{labelHeb(k)}:</span>{" "}
                          {v}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* הודעת סיכום */}
                {resultMsg && (
                  <div className="mt-2 p-2 rounded bg-green-50 text-green-800 text-xs whitespace-pre-line">
                    {resultMsg}
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <button
                  onClick={handleRunDelete}
                  disabled={deleting || completed === "success" || !selected}
                  className="px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 text-[12px] cursor-pointer"
                >
                  {completed === "success"
                    ? "נמחק"
                    : deleting
                      ? "מוחק…"
                      : "הפעל מחיקה"}
                </button>
                <button
                  onClick={closeDeleteModal}
                  disabled={deleting}
                  className="px-3 py-1.5 rounded border text-[12px] cursor-pointer"
                >
                  {completed === "success" ? "סגור" : "בטל"}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}

/* ========= רכיבי עזר לתצוגה ========= */

// === סרגל קומפקטי: שורה אחת, גלילה אופקית בעת צורך, פונט קטן ===
function FiltersBar(props: {
  query: string;
  setQuery: (v: string) => void;
  timeScope: TimeScope;
  setTimeScope: (v: TimeScope) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  createdFrom: string;
  setCreatedFrom: (v: string) => void;
  createdTo: string;
  setCreatedTo: (v: string) => void;
  sortKey: SortKey;
  setSortKey: (v: SortKey) => void;
  sortDir: SortDir;
  setSortDir: (v: SortDir) => void;
  totalFiltered: number;
  totalAll: number;
  onReset: () => void;
  onExport: () => void;
}) {
  const {
    query,
    setQuery,
    timeScope,
    setTimeScope,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    createdFrom,
    setCreatedFrom,
    createdTo,
    setCreatedTo,
    sortKey,
    setSortKey,
    sortDir,
    setSortDir,
    totalFiltered,
    totalAll,
    onReset,
    onExport,
  } = props;

  return (
    <div className="mb-2 p-2 border rounded bg-gray-50">
      <div className="flex items-center gap-2 flex-nowrap overflow-x-auto whitespace-nowrap">
        {/* חיפוש */}
        <input
          aria-label="חיפוש (שם אירוע / אימייל)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 text-[12px] px-2 border rounded w-48"
          placeholder="חיפוש: אירוע / אימייל"
        />

        {/* טווח תאריך אירוע */}
        <div className="flex items-center gap-1 text-[12px]">
          <span className="text-gray-600">תאריך אירוע:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-8 text-[12px] px-2 border rounded w-36"
          />
          <span className="text-gray-500">עד</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-8 text-[12px] px-2 border rounded w-36"
          />
        </div>

        {/* טווח תאריך יצירה */}
        <div className="flex items-center gap-1 text-[12px]">
          <span className="text-gray-600">יצירה:</span>
          <input
            type="date"
            value={createdFrom}
            onChange={(e) => setCreatedFrom(e.target.value)}
            className="h-8 text-[12px] px-2 border rounded w-36"
          />
          <span className="text-gray-500">עד</span>
          <input
            type="date"
            value={createdTo}
            onChange={(e) => setCreatedTo(e.target.value)}
            className="h-8 text-[12px] px-2 border rounded w-36"
          />
        </div>

        {/* תצוגה */}
        <select
          aria-label="תחום זמן"
          value={timeScope}
          onChange={(e) => setTimeScope(e.target.value as TimeScope)}
          className="h-8 text-[12px] px-2 border rounded w-36"
          title="סנן לפי תחום זמן"
        >
          <option value="all">כל האירועים</option>
          <option value="future">אירועים עתידיים</option>
          <option value="past">אירועי עבר</option>
        </select>

        {/* מיון */}
        <select
          aria-label="מיון לפי"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="h-8 text-[12px] px-2 border rounded w-40"
          title="מיין לפי"
        >
          <option value="createdAt">תאריך יצירה</option>
          <option value="date">תאריך אירוע</option>
          <option value="eventType">שם אירוע</option>
          <option value="ownerEmail">אימייל</option>
        </select>
        <button
          className="h-8 text-[12px] px-2 border rounded cursor-pointer"
          onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
          title="הפוך כיוון מיון"
        >
          {sortDir === "asc" ? "⬆️" : "⬇️"}
        </button>

        {/* צד ימין: ספירה + כפתורים */}
        <div className="ml-auto flex items-center gap-2 pl-2">
          <span className="text-[12px] text-gray-600">
            סה״כ: <b>{totalFiltered}</b> / <b>{totalAll}</b>
          </span>

          <button
            onClick={onExport}
            className="h-8 text-[12px] px-2 border rounded hover:bg-gray-100 cursor-pointer"
            title="ייצוא התצוגה לקובץ CSV"
          >
            ייצוא לאקסל
          </button>

          <button
            onClick={onReset}
            className="h-8 text-[12px] px-2 border rounded hover:bg-gray-100 cursor-pointer"
            title="ניקוי כל הסינונים והמיון"
          >
            אפס
          </button>
        </div>
      </div>
    </div>
  );
}

function ThSort({
  label,
  sortBy,
  sortKey,
  sortDir,
  onToggle,
  onExact,
}: {
  label: string;
  sortBy: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onToggle: (k: SortKey) => void;
  onExact: (k: SortKey, dir: SortDir) => void;
}) {
  const active = sortKey === sortBy;
  return (
    <th className="border p-0 text-[12px]">
      <div className="w-full flex items-stretch">
        <button
          className={`flex-1 text-right px-2 py-1.5 flex items-center justify-between ${
            active ? "bg-gray-100 font-semibold" : "bg-gray-100"
          } cursor-pointer`}
          onClick={() => onToggle(sortBy)}
          title="לחץ למיון (החלפה בין עולה/יורד)"
        >
          <span>{label}</span>
          <span className="text-[11px] opacity-70">
            {active ? (sortDir === "asc" ? "⬆️" : "⬇️") : "↕️"}
          </span>
        </button>
        <div className="flex border-l">
          <button
            className={`px-2 text-[11px] ${
              active && sortDir === "asc"
                ? "bg-white font-semibold"
                : "bg-gray-100"
            } cursor-pointer`}
            onClick={() => onExact(sortBy, "asc")}
            title="מיון עולה"
          >
            ▲
          </button>
          <button
            className={`px-2 text-[11px] border-r ${
              active && sortDir === "desc"
                ? "bg-white font-semibold"
                : "bg-gray-100"
            } cursor-pointer`}
            onClick={() => onExact(sortBy, "desc")}
            title="מיון יורד"
          >
            ▼
          </button>
        </div>
      </div>
    </th>
  );
}

function labelHeb(k: string) {
  switch (k) {
    case "sms":
      return "לוגי SMS";
    case "schedules":
      return "תיזמוני SMS";
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

/* ========= שורת אופציה עם סטטוס ========= */
function OptionRow({
  label,
  checked,
  disabled,
  onChange,
  result,
  resultType,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  result?: string;
  resultType?: "success" | "error" | "neutral";
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{label}</span>
      </label>

      {result !== undefined && (
        <span
          className={
            resultType === "success"
              ? "text-green-700 text-xs bg-green-50 border border-green-200 px-2 py-0.5 rounded"
              : resultType === "error"
                ? "text-red-700 text-xs bg-red-50 border border-red-200 px-2 py-0.5 rounded"
                : "text-gray-700 text-xs bg-gray-50 border border-gray-200 px-2 py-0.5 rounded"
          }
        >
          {result}
        </span>
      )}
    </div>
  );
}
