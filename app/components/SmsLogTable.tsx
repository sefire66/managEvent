"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Guest } from "../types/types";
import Stat from "./Stat";
import { Loader2 } from "lucide-react";

type SmsType =
  | "saveDate"
  | "invitation"
  | "reminder"
  | "tableNumber"
  | "thankYou"
  | "cancel";

type SmsStatus = "sent" | "failed";

type LogItem = {
  _id: string;
  guestId?: string; // legacy
  guestName?: string; // new
  guestPhone?: string; // new
  eventId: string;
  smsType: SmsType;
  status: SmsStatus;
  sentAt: string | Date;
  ownerEmail: string;
  errorMessage?: string;
};

const smsTypeLabels: Record<SmsType, string> = {
  saveDate: "שמרו את התאריך",
  invitation: "הזמנה עם אישור",
  reminder: "תזכורת ללא ענה",
  tableNumber: "מספר שולחן",
  thankYou: "תודה אחרי האירוע",
  cancel: "ארוע בוטל",
};

type Props = {
  ownerEmail: string;
  eventId: string;
  guests: Guest[];
  className?: string;
  refreshKey?: number;
};

export default function SmsLogTable({
  ownerEmail,
  eventId,
  guests,
  className,
  refreshKey = 0,
}: Props) {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<SmsType | "">("");
  const [statusFilter, setStatusFilter] = useState<SmsStatus | "">("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Accordion
  const [isOpen, setIsOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(id);
  }, [query]);

  // Guest map (legacy fallback for old logs that only have guestId)
  const guestMap = useMemo(() => {
    const m = new Map<string, { name: string; phone: string }>();
    guests.forEach((g) =>
      m.set(String(g._id), { name: g.name || "", phone: g.phone || "" })
    );
    return m;
  }, [guests]);

  // Fetch logs (refresh on refreshKey)
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!ownerEmail || !eventId) {
      setLogs([]);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          email: ownerEmail,
          eventId,
          ts: String(refreshKey), // bust cache on refresh
        });
        const res = await fetch(`/api/sms-log?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) throw new Error("כשל בשליפת לוגים");
        const data: LogItem[] = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (e?.name !== "AbortError") setError(e?.message || "שגיאה לא צפויה");
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [ownerEmail, eventId, refreshKey]);

  const toDate = (d: string | Date) => new Date(d);

  const filtered = useMemo(() => {
    let out = logs
      .slice()
      .sort((a, b) => +toDate(b.sentAt) - +toDate(a.sentAt));

    if (typeFilter) out = out.filter((x) => x.smsType === typeFilter);
    if (statusFilter) out = out.filter((x) => x.status === statusFilter);

    if (dateFrom) {
      const from = new Date(dateFrom + "T00:00:00");
      out = out.filter((x) => toDate(x.sentAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59");
      out = out.filter((x) => toDate(x.sentAt) <= to);
    }

    const q = debouncedQuery.toLowerCase();
    if (q) {
      out = out.filter((x: LogItem) => {
        const name = (x.guestName || "").toLowerCase();
        const phone = (x.guestPhone || "").toLowerCase();

        const legacy = guestMap.get(String(x.guestId));
        const legacyName = (legacy?.name || "").toLowerCase();
        const legacyPhone = (legacy?.phone || "").toLowerCase();

        return (
          name.includes(q) ||
          phone.includes(q) ||
          legacyName.includes(q) ||
          legacyPhone.includes(q)
        );
      });
    }

    return out;
  }, [
    logs,
    typeFilter,
    statusFilter,
    dateFrom,
    dateTo,
    debouncedQuery,
    guestMap,
  ]);

  const sentCount = useMemo(
    () => filtered.filter((x) => x.status === "sent").length,
    [filtered]
  );
  const failedCount = useMemo(
    () => filtered.filter((x) => x.status === "failed").length,
    [filtered]
  );

  const clearFilters = () => {
    setTypeFilter("");
    setStatusFilter("");
    setQuery("");
    setDateFrom("");
    setDateTo("");
  };

  // Export CSV
  const downloadCSV = () => {
    const header = ["תאריך", "אורח", "טלפון", "סוג הודעה", "סטטוס"];
    const rows = filtered.map((row: LogItem) => {
      const legacy = guestMap.get(String(row.guestId));
      const date = toDate(row.sentAt).toLocaleString("he-IL", {
        timeZone: "Asia/Jerusalem",
        hour12: false,
      });
      const name = row.guestName ?? legacy?.name ?? "-";
      const phone = row.guestPhone ?? legacy?.phone ?? "-";
      const typeLabel = smsTypeLabels[row.smsType];
      const statusLabel = row.status === "sent" ? "נשלח" : "נכשל";
      return [date, name, phone, typeLabel, statusLabel];
    });

    const csv = [header, ...rows]
      .map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sms-log.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`bg-white p-0 rounded-2xl max-w-5xl mx-auto w-full my-1 mb-2 transition-all hover:scale-103 duration-300 ${className || ""}`}
    >
      <div className="max-w-5xl mx-auto w-full">
        {/* ================= HEADER של הסקשן ================= */}
        <div
          onClick={() => setIsOpen(!isOpen)}
          style={{ cursor: "pointer" }}
          className={`w-full border border-gray-300 rounded-md shadow p-2 mb-0 
    text-blue-600 transition-all duration-300 
    ${isOpen ? "border-b-4 border-blue-500" : ""} 
    grid grid-cols-1 md:grid-cols-[180px_1fr_160px] gap-4 items-start`}
          dir="rtl"
        >
          {/* טור 1 – כותרת */}
          <div className="flex flex-row items-center gap-2">
            <div
              className={`text-base transform transition-transform duration-300 ${
                isOpen ? "rotate-180" : "rotate-0"
              }`}
            >
              {isOpen ? "−" : "+"}
            </div>
            <div className="font-bold text-blue-600 text-base min-w-[150px]">
              יומן הודעות SMS
            </div>
          </div>

          {/* טור 2 – תקציר/סטטיסטיקות */}
          <div className="w-full">
            <div className="bg-gray-50 border border-gray-200 rounded-md p-2 text-sm text-gray-700 font-semibold grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 gap-x-4 gap-y-2 text-right">
              <Stat
                icon="📊"
                label=" סהכ הודעות"
                value={filtered.length}
                color="gray"
              />
              <Stat icon="✅" label="נשלחו" value={sentCount} color="green" />
              <Stat icon="❌" label="נכשלו" value={failedCount} color="red" />
            </div>
          </div>

          {/* טור 3 – כפתור ייצוא */}
          <div className="w-full text-center px-3 py-2 border border-blue-500 rounded-md text-blue-600 font-semibold text-sm hover:bg-blue-50 transition ">
            <button
              type="button"
              className="px-3  rounded text-sm"
              onClick={(e) => {
                e.stopPropagation(); // 👈 מונע מהקליק לסגור/לפתוח את ההדר
                downloadCSV();
              }}
              title="ייצוא CSV"
            >
              ייצוא CSV
            </button>
          </div>
        </div>

        {/* =============== סוף HEADER של הסקשן =============== */}
      </div>

      {isOpen && (
        <div
          className="w-full bg-white border rounded-2xl shadow p-4"
          dir="rtl"
        >
          {/* Filters */}
          {/* Filters */}
          <div className="mb-3 flex flex-wrap gap-2 items-end">
            <div className="shrink-0 w-[150px]">
              <label className="block text-xs text-gray-600 mb-1">
                חיפוש לפי שם/טלפון
              </label>
              <input
                className="border rounded p-2 w-full text-xs"
                placeholder="הקלד/י לחיפוש…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">
                סוג הודעה
              </label>
              <select
                className="border rounded p-2 w-full text-xs"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as SmsType | "")}
              >
                <option value="">הכל</option>
                {Object.entries(smsTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">סטטוס</label>
              <select
                className="border rounded p-2 w-full text-xs"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as SmsStatus | "")
                }
              >
                <option value="">הכל</option>
                <option value="sent">נשלח</option>
                <option value="failed">נכשל</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">מתאריך</label>
              <input
                type="date"
                className="border rounded p-2 w-full text-xs"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                max={dateTo || undefined}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">
                עד תאריך
              </label>
              <input
                type="date"
                className="border rounded p-2 w-full text-xs"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                min={dateFrom || undefined}
              />
            </div>

            {/* הכפתור בשורה אחת עם השדות */}
            <div>
              <button
                type="button"
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                onClick={clearFilters}
                title="נקה סינון"
              >
                נקה סינון
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">טוען…</div>
          ) : error ? (
            <div className="text-center text-red-600 py-8">{error}</div>
          ) : (
            <div className="max-h-96 overflow-y-auto border rounded">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0 z-10 text-xs">
                  <tr>
                    <th className="p-2 text-right">תאריך</th>
                    <th className="p-2 text-right">אורח</th>
                    <th className="p-2 text-right">טלפון</th>
                    <th className="p-2 text-right">סוג הודעה</th>
                    <th className="p-2 text-right">סטטוס</th>
                  </tr>
                </thead>
                <tbody className="[&>tr:nth-child(odd)]:bg-gray-50/40 text-xs">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-gray-500">
                        אין נתונים לתצוגה
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => {
                      const legacy = guestMap.get(String(row.guestId));
                      const name = row.guestName ?? legacy?.name ?? "-";
                      const phone = row.guestPhone ?? legacy?.phone ?? "-";

                      return (
                        <tr key={row._id} className="border-t">
                          <td
                            className="p-2"
                            title={toDate(row.sentAt).toISOString()}
                          >
                            {toDate(row.sentAt).toLocaleString("he-IL", {
                              timeZone: "Asia/Jerusalem",
                              hour12: false,
                            })}
                          </td>
                          <td className="p-2">{name}</td>
                          <td className="p-2" dir="rtl">
                            {phone}
                          </td>
                          <td className="p-2">{smsTypeLabels[row.smsType]}</td>
                          <td
                            className={`p-2 flex items-center gap-2 ${
                              row.status === "sent"
                                ? "text-green-700"
                                : "text-red-700"
                            }`}
                            title={row.errorMessage || undefined}
                          >
                            <span
                              className={`inline-block h-2.5 w-2.5 rounded-full ${
                                row.status === "sent"
                                  ? "bg-green-500"
                                  : "bg-red-500"
                              }`}
                            />
                            {row.status === "sent" ? "נשלח" : "נכשל"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
