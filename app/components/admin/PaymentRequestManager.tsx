"use client";

import React, { useEffect, useMemo, useState } from "react";

/**
 * PaymentRequestManager — בסגנון PaymentManager
 * - טבלת בקשות תשלום עם סינון/מיון/חיפוש
 * - פתיחת דיאלוג עריכה בלחיצה על שורה (כולל מחיקה כשמאופשר)
 * - סנכרון ברוטו↔︎לפני־מע"מ (amount↔net) ו-vatAmount
 *
 * הערות:
 * 1) מחיקה תוצג רק אם מתקבל allowDelete=true בפרופס (דגל פרונט).
 * 2) "טעינת מע"מ מפרופיל חיוב" מחייבת דרך שרתית להשגת שיעור המע"מ של ה-owner.
 *    כרגע ממומש כ-hook נקודתי שניתן להחליף מאוחר יותר (ראה loadVatFromBillingProfile).
 */

// ===== Types from API =====
export type PaymentRequestStatus =
  | "draft"
  | "active"
  | "paid"
  | "expired"
  | "canceled";
export type PaymentRequestType = "payment" | "gift";
export type FeeMode = "included" | "add_on";

export type PaymentRequestListItem = {
  _id: string;
  title: string;
  type: PaymentRequestType;
  status: PaymentRequestStatus;
  token: string;
  shortUrl?: string | null;
  amount: number | null; // ברוטו
  currency: string;
  vatRate?: number | null; // אחרי עדכון המודל
  vatAmount?: number | null; // חדש
  uses: number;
  usageLimit: number;
  expiresAt?: string | null; // ISO
  createdAt: string; // ISO
  createdBy?: { name?: string | null; email?: string | null } | null;
};

// ===== Utilities =====
const fmtCurrency = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 2,
});

function parseDateSafe(s?: string | null) {
  const t = s ? Date.parse(s) : NaN;
  return Number.isFinite(t) ? new Date(t) : null;
}

function cmp<T>(a: T, b: T, dir: SortDir) {
  if (a === b) return 0;
  // treat null/undefined as last
  const av = (a as any) ?? "\uffff";
  const bv = (b as any) ?? "\uffff";
  if (av < bv) return dir === "asc" ? -1 : 1;
  if (av > bv) return dir === "asc" ? 1 : -1;
  return 0;
}

function hebDate(d?: string | null) {
  const dd = parseDateSafe(d);
  return dd ? dd.toLocaleString("he-IL") : "—";
}

function roundAgorot(n: number) {
  return Math.round(n * 100) / 100;
}

// ==== Props ====
export type PaymentRequestManagerProps = {
  allowDelete?: boolean; // דגל תצוגת מחיקה (פרונט־אנד)
};

// ==== Sort types ====
type SortKey =
  | "title"
  | "type"
  | "status"
  | "amount"
  | "vatAmount"
  | "uses"
  | "usageLimit"
  | "expiresAt"
  | "createdAt"
  | "createdBy";

type SortDir = "asc" | "desc";

export default function PaymentRequestManager({
  allowDelete = true,
}: PaymentRequestManagerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // data
  const [items, setItems] = useState<PaymentRequestListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // sorting
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // dialog
  const [editing, setEditing] = useState<PaymentRequestListItem | null>(null);

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchList() {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status !== "all") params.set("status", status);
      if (type !== "all") params.set("type", type);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      params.set("limit", "500");

      const res = await fetch(`/api/payment-requests?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as PaymentRequestListItem[];
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "שגיאה בשליפה");
    } finally {
      setLoading(false);
    }
  }

  const { filteredSorted, totalAmount, totalVat } = useMemo(() => {
    let list = items.slice();

    // text search
    const qq = q.trim().toLowerCase();
    if (qq) {
      list = list.filter(
        (it) =>
          (it.title || "").toLowerCase().includes(qq) ||
          (it.token || "").toLowerCase().includes(qq) ||
          (it.createdBy?.email || "").toLowerCase().includes(qq) ||
          (it.createdBy?.name || "").toLowerCase().includes(qq)
      );
    }

    if (status !== "all") list = list.filter((it) => it.status === status);
    if (type !== "all") list = list.filter((it) => it.type === type);

    // date range by createdAt
    const df = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
    const dt = dateTo ? new Date(dateTo + "T23:59:59.999") : null;
    if (df || dt) {
      list = list.filter((it) => {
        const d = parseDateSafe(it.createdAt);
        if (!d) return false;
        if (df && d < df) return false;
        if (dt && d > dt) return false;
        return true;
      });
    }

    // sort
    list.sort((a, b) => {
      switch (sortKey) {
        case "title":
          return cmp(a.title, b.title, sortDir);
        case "type":
          return cmp(a.type, b.type, sortDir);
        case "status":
          return cmp(a.status, b.status, sortDir);
        case "amount":
          return cmp(a.amount ?? 0, b.amount ?? 0, sortDir);
        case "vatAmount":
          return cmp(a.vatAmount ?? 0, b.vatAmount ?? 0, sortDir);
        case "uses":
          return cmp(a.uses, b.uses, sortDir);
        case "usageLimit":
          return cmp(a.usageLimit, b.usageLimit, sortDir);
        case "expiresAt":
          return cmp(
            parseDateSafe(a.expiresAt)?.getTime() ?? 0,
            parseDateSafe(b.expiresAt)?.getTime() ?? 0,
            sortDir
          );
        case "createdBy":
          return cmp(
            a.createdBy?.email || "",
            b.createdBy?.email || "",
            sortDir
          );
        case "createdAt":
        default:
          return cmp(
            parseDateSafe(a.createdAt)?.getTime() ?? 0,
            parseDateSafe(b.createdAt)?.getTime() ?? 0,
            sortDir
          );
      }
    });

    const totals = list.reduce(
      (acc, it) => {
        acc.amount += Number(it.amount || 0);
        acc.vat += Number(it.vatAmount || 0);
        return acc;
      },
      { amount: 0, vat: 0 }
    );

    return {
      filteredSorted: list,
      totalAmount: totals.amount,
      totalVat: totals.vat,
    };
  }, [items, q, status, type, dateFrom, dateTo, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function resetFilters() {
    setQ("");
    setStatus("all");
    setType("all");
    setDateFrom("");
    setDateTo("");
    setSortKey("createdAt");
    setSortDir("desc");
  }

  return (
    <div className="bg-white rounded shadow" dir="rtl">
      {/* Header Accordion */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="w-full border-b p-3 text-right flex items-center justify-between hover:bg-gray-50 transition cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span
            className={`text-xl transform transition-transform duration-300 ${isOpen ? "rotate-180" : "rotate-0"}`}
          >
            {isOpen ? "−" : "+"}
          </span>
          <span className="text-sm font-semibold">ניהול בקשות תשלום</span>
        </div>
        <span className="text-xs text-gray-600">
          סה״כ: <b>{filteredSorted.length}</b> מתוך <b>{items.length}</b>
        </span>
      </button>

      {isOpen && (
        <div className="p-4">
          {/* Filters */}
          <div className="mb-2 flex flex-wrap gap-2 items-center">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-8 text-[16px] px-2 border rounded w-60"
              placeholder="חיפוש בכותרת/טוקן/יוצר"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-8 text-[16px] px-2 border rounded"
            >
              <option value="all">כל הסטטוסים</option>
              <option value="draft">טיוטה</option>
              <option value="active">פעילה</option>
              <option value="paid">שולמה</option>
              <option value="expired">פג תוקף</option>
              <option value="canceled">בוטלה</option>
            </select>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-8 text-[16px] px-2 border rounded"
            >
              <option value="all">כל הסוגים</option>
              <option value="payment">תשלום</option>
              <option value="gift">מתנה</option>
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 text-[16px] px-2 border rounded"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 text-[16px] px-2 border rounded"
            />
            <button
              onClick={resetFilters}
              className="h-8 px-2 text-[16px] border rounded cursor-pointer hover:bg-gray-100"
            >
              איפוס
            </button>
            <button
              onClick={fetchList}
              className="h-8 px-2 text-[16px] border rounded cursor-pointer hover:bg-gray-100"
            >
              רענן
            </button>
          </div>

          {/* Totals */}
          <div className="mb-2 p-2 border rounded bg-gray-50 text-[16px] flex gap-6">
            <span>
              סה״כ ברוטו: <b>{fmtCurrency.format(totalAmount)}</b>
            </span>
            <span>
              סה״כ מע״מ: <b>{fmtCurrency.format(totalVat)}</b>
            </span>
          </div>

          {/* Table */}
          <div className="overflow-y-auto" dir="ltr">
            <div className="max-h-[60vh] border rounded text-[16px]" dir="rtl">
              {loading ? (
                <div className="p-3">טוען…</div>
              ) : error ? (
                <div className="p-3 text-red-700">שגיאה: {error}</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100 text-right">
                      <Th
                        label="כותרת"
                        sortKey="title"
                        activeKey={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                      />
                      <Th
                        label="סוג"
                        sortKey="type"
                        activeKey={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                      />
                      <Th
                        label="סטטוס"
                        sortKey="status"
                        activeKey={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                      />
                      <Th
                        label="ברוטו"
                        sortKey="amount"
                        activeKey={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                      />
                      <Th
                        label="מעמ"
                        sortKey="vatAmount"
                        activeKey={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                      />
                      <Th
                        label="שימושים"
                        sortKey="uses"
                        activeKey={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                      />
                      <Th
                        label="מגבלה"
                        sortKey="usageLimit"
                        activeKey={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                      />
                      <Th
                        label="תוקף"
                        sortKey="expiresAt"
                        activeKey={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                      />
                      <Th
                        label="נוצר"
                        sortKey="createdAt"
                        activeKey={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                      />
                      <Th
                        label="יוצר"
                        sortKey="createdBy"
                        activeKey={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSorted.map((it) => (
                      <tr
                        key={it._id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setEditing(it)}
                      >
                        <td className="border p-1.5">{it.title}</td>
                        <td className="border p-1.5">{it.type}</td>
                        <td className="border p-1.5">{it.status}</td>
                        <td className="border p-1.5">
                          {it.amount != null
                            ? fmtCurrency.format(it.amount)
                            : "—"}
                        </td>
                        <td className="border p-1.5">
                          {it.vatAmount != null
                            ? fmtCurrency.format(it.vatAmount)
                            : "—"}
                        </td>
                        <td className="border p-1.5">{it.uses}</td>
                        <td className="border p-1.5">{it.usageLimit}</td>
                        <td className="border p-1.5">
                          {hebDate(it.expiresAt)}
                        </td>
                        <td className="border p-1.5">
                          {hebDate(it.createdAt)}
                        </td>
                        <td className="border p-1.5">
                          {it.createdBy?.name || it.createdBy?.email || "—"}
                        </td>
                      </tr>
                    ))}
                    {filteredSorted.length === 0 && (
                      <tr>
                        <td
                          colSpan={10}
                          className="p-3 text-center text-gray-500"
                        >
                          אין בקשות תואמות לסינון.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {editing && (
        <EditPaymentRequestDialog
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            fetchList();
          }}
          allowDelete={allowDelete}
        />
      )}
    </div>
  );
}

function Th({
  label,
  sortKey,
  activeKey,
  dir,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onClick: (k: SortKey) => void;
}) {
  const isActive = activeKey === sortKey;
  return (
    <th
      onClick={() => onClick(sortKey)}
      className="border p-1.5 cursor-pointer select-none"
    >
      <div className="flex items-center justify-between">
        <span>{label}</span>
        {isActive && <span>{dir === "asc" ? "⬆️" : "⬇️"}</span>}
      </div>
    </th>
  );
}

// ===== Edit Dialog =====
function EditPaymentRequestDialog({
  item,
  onClose,
  onSaved,
  allowDelete,
}: {
  item: PaymentRequestListItem;
  onClose: () => void;
  onSaved: () => void;
  allowDelete?: boolean;
}) {
  // local form state
  const [title, setTitle] = useState(item.title || "");
  const [description, setDescription] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");

  const [status, setStatus] = useState<PaymentRequestStatus>(item.status);
  const [type, setType] = useState<PaymentRequestType>(item.type);

  const [amount, setAmount] = useState<number>(item.amount || 0); // ברוטו
  const [vatRate, setVatRate] = useState<number>(
    typeof item.vatRate === "number" ? item.vatRate! : 0
  );
  const [vatAmount, setVatAmount] = useState<number>(item.vatAmount || 0);

  const [currency, setCurrency] = useState<string>(item.currency || "ILS");
  const [usageLimit, setUsageLimit] = useState<number>(item.usageLimit || 1);
  const [expiresAt, setExpiresAt] = useState<string>(
    item.expiresAt ? item.expiresAt.slice(0, 10) : ""
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // derived net
  const net = useMemo(
    () => roundAgorot(Math.max(0, (amount || 0) - (vatAmount || 0))),
    [amount, vatAmount]
  );

  // handlers for sync rules
  function onAmountChange(next: number) {
    const amt = Math.max(0, next || 0);
    const computedVat =
      vatRate > 0 ? roundAgorot((amt * vatRate) / (100 + vatRate)) : 0;
    setAmount(amt);
    setVatAmount(computedVat);
  }

  function onNetChange(nextNet: number) {
    const netVal = Math.max(0, nextNet || 0);
    const gross =
      vatRate > 0 ? roundAgorot(netVal * (1 + vatRate / 100)) : netVal;
    setAmount(gross);
    setVatAmount(roundAgorot(gross - netVal));
  }

  function onVatRateChange(nextRate: number) {
    const r = Math.max(0, Math.min(100, nextRate || 0));
    setVatRate(r);
    // recompute based on gross
    const computedVat = r > 0 ? roundAgorot((amount * r) / (100 + r)) : 0;
    setVatAmount(computedVat);
  }

  async function loadVatFromBillingProfile() {
    /**
     * ⚠️ חשוב: כדי לטעון vatRate אמיתי של ה-owner, נדרש שירות שרת שמחזיר אותו לפי ה-PR.
     * כרגע אין לנו email של ה-owner בקליינט. לכן יש שתי אפשרויות:
     * 1) להרחיב את ה-GET של /api/payment-requests להחזיר גם ownerEmail (לא יוצג בטבלה).
     * 2) להוסיף endpoint ייעודי, למשל GET /api/payment-requests/[id]/owner-vat שמחזיר { vatRate }.
     * להלן אימפל׳ דמה שמנסה קודם דרך endpoint אופציונלי (2), ונופל חזרה ללא שינוי אם אינו קיים.
     */
    try {
      const res = await fetch(
        `/api/payment-requests/${item.token}n}/owner-vat`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        if (typeof data?.vatRate === "number") {
          onVatRateChange(data.vatRate);
          return;
        }
      }
      alert(
        'לא נמצא מקור מע"מ לפרופיל הבעלים. יש להוסיף endpoint או לכלול ownerEmail בתשובת הרשימה.'
      );
    } catch (e) {
      console.error(e);
      alert('שגיאה בטעינת מע"מ מפרופיל');
    }
  }

  async function onSave() {
    try {
      setSaving(true);
      setError(null);
      const payload = {
        title,
        description,
        imageUrl,
        status,
        type,
        amount,
        vatRate,
        vatAmount,
        currency,
        usageLimit,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      };

      //   console.log("POST /api/payment-requests body:", payload);
      const res = await fetch(`/api/payment-requests/${item.token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onSaved();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "שגיאה בעדכון הבקשה");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!allowDelete) return;
    if (!confirm("למחוק את הבקשה לצמיתות? הפעולה אינה הפיכה.")) return;

    try {
      setSaving(true);
      setError(null);
      const res = await fetch(`/api/payment-requests/${item.token}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onSaved();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "שגיאה במחיקת הבקשה");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div
        className="bg-white rounded shadow-xl w-full max-w-2xl m-w-[600px] max-h-[60vh] overflow-y-auto px-4 py-2"
        dir="rtl"
      >
        <div className="border-b px-4 py-2 flex items-center justify-between">
          <div className="text-sm font-semibold">עריכת בקשה</div>
          <button
            onClick={onClose}
            className="text-sm px-2 py-1 hover:bg-gray-100 rounded"
          >
            סגור
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[18px]">
          <div>
            <label className="block text-gray-600 mb-1">כותרת</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded px-2 h-8"
            />
          </div>
          <div>
            <label className="block text-gray-600 mb-1">סטטוס</label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as PaymentRequestStatus)
              }
              className="w-full border rounded px-2 h-8"
            >
              <option value="draft">טיוטה</option>
              <option value="active">פעילה</option>
              <option value="paid">שולמה</option>
              <option value="expired">פג תוקף</option>
              <option value="canceled">בוטלה</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-gray-600 mb-1">תיאור</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded px-2 py-2 h-15"
            />
          </div>

          <div>
            <label className="block text-gray-600 mb-1">תמונה (URL)</label>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full border rounded px-2 h-8"
            />
          </div>
          <div>
            <label className="block text-gray-600 mb-1">סוג</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as PaymentRequestType)}
              className="w-full border rounded px-2 h-8"
            >
              <option value="payment">תשלום</option>
              <option value="gift">מתנה</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-600 mb-1">ברוטו (amount)</label>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => onAmountChange(Number(e.target.value))}
              className="w-full border rounded px-2 h-8"
              min={0}
            />
          </div>
          <div>
            <label className="block text-gray-600 mb-1">לפני מע"מ (net)</label>
            <input
              type="number"
              inputMode="decimal"
              value={net}
              onChange={(e) => onNetChange(Number(e.target.value))}
              className="w-full border rounded px-2 h-8"
              min={0}
            />
          </div>

          <div>
            <label className="block text-gray-600 mb-1">שיעור מע"מ (%)</label>
            <input
              type="number"
              inputMode="decimal"
              value={vatRate}
              onChange={(e) => onVatRateChange(Number(e.target.value))}
              className="w-full border rounded px-2 h-8"
              min={0}
              max={100}
            />
          </div>
          <div>
            <label className="block text-gray-600 mb-1">מע"מ (₪)</label>
            <input
              type="number"
              inputMode="decimal"
              value={vatAmount}
              onChange={(e) =>
                setVatAmount(Math.max(0, Number(e.target.value) || 0))
              }
              className="w-full border rounded px-2 h-8"
              min={0}
            />
          </div>

          <div>
            <label className="block text-gray-600 mb-1">מטבע</label>
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full border rounded px-2 h-8"
            />
          </div>
          <div>
            <label className="block text-gray-600 mb-1">מגבלת שימוש</label>
            <input
              type="number"
              value={usageLimit}
              onChange={(e) =>
                setUsageLimit(Math.max(1, Number(e.target.value) || 1))
              }
              className="w-full border rounded px-2 h-8"
            />
          </div>

          <div>
            <label className="block text-gray-600 mb-1">תאריך תפוגה</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full border rounded px-2 h-8"
            />
          </div>

          {/* <div className="md:col-span-2 flex gap-2 items-center">
            <button
              onClick={loadVatFromBillingProfile}
              className="h-8 text-[16px] px-2 border rounded cursor-pointer hover:bg-gray-100"
            >
              משוך מע"מ מפרופיל חיוב
            </button>
            <span className="text-[16px] text-gray-500">
              (דורש endpoint שרת ייעודי או ownerEmail בתשובת הרשימה)
            </span>
          </div> */}
        </div>

        {error && (
          <div className="px-4 text-[16px] text-red-700">שגיאה: {error}</div>
        )}

        <div className="border-t px-4 py-2 flex items-center justify-between">
          <div className="text-[16px] text-gray-600">
            <b>Token:</b> {item.token}{" "}
            {item.shortUrl ? (
              <span className="ml-2">
                (
                <a
                  className="text-blue-600 underline"
                  href={item.shortUrl}
                  target="_blank"
                >
                  קישור
                </a>
                )
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {allowDelete && (
              <button
                onClick={onDelete}
                className="px-3 h-8 text-[16px] rounded border border-red-400 text-red-700 hover:bg-red-50"
              >
                מחק
              </button>
            )}
            <button
              onClick={onSave}
              disabled={saving}
              className="px-3 h-8 text-[16px] rounded border bg-blue-50 hover:bg-blue-100 disabled:opacity-50"
            >
              שמור
            </button>
            {/* ================================= */}
            <button
              onClick={onClose}
              className="text-sm px-2 py-1 hover:bg-gray-100 rounded"
            >
              סגור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
