"use client";

import React, { useEffect, useMemo, useState } from "react";
import PaymentModal, { PaymentModalPayment } from "./PaymentModal";
// ===== Types =====
type Payment = {
  _id: string;
  email: string;
  itemName: string;
  moneyAmount: number; // ברוטו (כולל מע״מ אם יש)
  smsAmount?: number;
  transactionId: string;
  createdAt: string; // ISO

  // שדות אופציונליים אם ה-API מחזיר (נשתמש כשיש):
  appliedVatRate?: number | null; // באחוזים, למשל 18
  taxAmount?: number | null; // רכיב מע״מ על המסמך (אם אתה MoR)
  taxBaseAmount?: number | null; // בסיס לפני מע״מ על המסמך (אם אתה MoR)
  platformFeeVat?: number | null; // מע״מ על עמלת הפלטפורמה (במתנות)
};

type SortKey =
  | "email"
  | "itemName"
  | "moneyAmount"
  | "smsAmount"
  | "transactionId"
  | "createdAt";
type SortDir = "asc" | "desc";

function parseDateSafe(s?: string) {
  const t = s ? Date.parse(s) : NaN;
  return Number.isFinite(t) ? new Date(t) : null;
}
function cmp(a: any, b: any, dir: SortDir) {
  if (a < b) return dir === "asc" ? -1 : 1;
  if (a > b) return dir === "asc" ? 1 : -1;
  return 0;
}
function hebDate(d?: string) {
  const dd = parseDateSafe(d);
  return dd ? dd.toLocaleDateString("he-IL") : "—";
}
function ymKey(dateIso: string) {
  const d = parseDateSafe(dateIso);
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

const fmtCurrency = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 2,
});

type PaymentManagerProps = {
  onUsersUpdated?: () => void; // ריענון טבלת המשתמשים באדמין לאחר תשלום
};

/** ===== Types for /api/payments/summary ===== */
type MonthSummary = {
  ym: string; // "YYYY-MM"
  label: string; // e.g. "ספטמבר 2025"
  sum: number;
  count: number;
};
type SummaryResponse = {
  ok: boolean;
  timezone: string;
  monthsRequested: number;
  currentMonth: MonthSummary;
  lastMonth: MonthSummary;
  prevMonth: MonthSummary;
  rolling: {
    months: number;
    sum: number;
    count: number;
    fromYm: string | null;
    toYm: string | null;
    label: string;
  };
};

export default function PaymentManager({
  onUsersUpdated,
}: PaymentManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] =
    useState<PaymentModalPayment | null>(null);

  // ===== Payments table data =====
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [packageFilter, setPackageFilter] = useState("all");

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // ===== Top summary state =====
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryErr, setSummaryErr] = useState<string | null>(null);
  const [monthsCount, setMonthsCount] = useState<number>(2); // ברירת מחדל: 2 חודשים מלאים

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthsCount]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payments", { cache: "no-store" });
      const data = await res.json();
      setPayments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("שגיאה בשליפת תשלומים:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      setSummaryLoading(true);
      setSummaryErr(null);
      const mc = Math.max(1, Math.min(36, Number(monthsCount) || 2)); // הגנה
      const res = await fetch(`/api/payments/summary?months=${mc}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as SummaryResponse | { error?: string };
      if (!("ok" in data) || !data.ok) {
        throw new Error((data as any)?.error || "Summary API failed");
      }
      setSummary(data as SummaryResponse);
    } catch (err: any) {
      console.error("summary error", err);
      setSummary(null);
      setSummaryErr(err?.message || "שגיאה בשליפת סיכומים");
    } finally {
      setSummaryLoading(false);
    }
  };

  function openPayment(p: Payment) {
    // ה-Payment שלך הוא תת-קבוצה מהטיפוס שמודל מקבל — זה בסדר.
    setSelectedPayment(p as unknown as PaymentModalPayment);
    setModalOpen(true);
  }

  /** מחשב מע״מ ונטו לשורה בודדת */
  function computeVatAndNet(p: Payment): { vat: number; net: number } {
    // קדימות 1: אם השרת כבר סיפק taxAmount/ taxBaseAmount – נשתמש בהם
    if (typeof p.taxAmount === "number" && p.taxAmount >= 0) {
      const vat = p.taxAmount;
      const net =
        typeof p.taxBaseAmount === "number" && p.taxBaseAmount >= 0
          ? p.taxBaseAmount
          : Math.max(0, (Number(p.moneyAmount) || 0) - vat);
      return { vat, net };
    }
    // קדימות 2: במתנות – אם יש platformFeeVat, זה המע״מ לתשלום שלך
    if (typeof p.platformFeeVat === "number" && p.platformFeeVat >= 0) {
      const vat = p.platformFeeVat;
      const net = Math.max(0, (Number(p.moneyAmount) || 0) - vat);
      return { vat, net };
    }
    // קדימות 3: אם יש appliedVatRate ונניח כסף ברוטו – נגזור ממנו מע״מ
    if (typeof p.appliedVatRate === "number" && p.appliedVatRate > 0) {
      const r = p.appliedVatRate / 100;
      const gross = Number(p.moneyAmount) || 0;
      const vat = gross * (r / (1 + r));
      const net = gross - vat;
      return { vat, net };
    }
    // ברירת מחדל: אין מע״מ
    return { vat: 0, net: Number(p.moneyAmount) || 0 };
  }

  // חישוב תצוגה מסוננת + סכומים (לטבלה) + סך מע״מ לפי סינון
  const {
    filteredSorted,
    totalAmount,
    totalSms,
    totalVatFiltered,
    packageNames,
    vatByYm,
  } = useMemo(() => {
    let list = payments.slice();

    // חיפוש טקסטואלי
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.email.toLowerCase().includes(q) ||
          p.transactionId.toLowerCase().includes(q)
      );
    }

    // חבילה
    if (packageFilter !== "all") {
      list = list.filter((p) => p.itemName === packageFilter);
    }

    // תאריכים
    const df = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
    const dt = dateTo ? new Date(dateTo + "T23:59:59.999") : null;
    if (df || dt) {
      list = list.filter((p) => {
        const d = parseDateSafe(p.createdAt);
        if (!d) return false;
        if (df && d < df) return false;
        if (dt && d > dt) return false;
        return true;
      });
    }

    // מיון
    list.sort((a, b) => {
      switch (sortKey) {
        case "email":
          return cmp(a.email, b.email, sortDir);
        case "itemName":
          return cmp(a.itemName, b.itemName, sortDir);
        case "moneyAmount":
          return cmp(a.moneyAmount, b.moneyAmount, sortDir);
        case "smsAmount":
          return cmp(a.smsAmount ?? 0, b.smsAmount ?? 0, sortDir);
        case "transactionId":
          return cmp(a.transactionId, b.transactionId, sortDir);
        case "createdAt":
        default:
          return cmp(
            parseDateSafe(a.createdAt)?.getTime() ?? 0,
            parseDateSafe(b.createdAt)?.getTime() ?? 0,
            sortDir
          );
      }
    });

    // סיכומים
    const totals = list.reduce(
      (acc, p) => {
        acc.amount += Number(p.moneyAmount) || 0;
        acc.sms += Number(p.smsAmount ?? 0) || 0;
        const { vat } = computeVatAndNet(p);
        acc.vat += vat;
        return acc;
      },
      { amount: 0, sms: 0, vat: 0 }
    );

    // צבירת מע״מ לפי חודש (YYYY-MM) לכלל התשלומים שנטענו
    const vatByMonth = new Map<string, number>();
    for (const p of payments) {
      const ym = ymKey(p.createdAt);
      if (!ym) continue;
      const { vat } = computeVatAndNet(p);
      vatByMonth.set(ym, (vatByMonth.get(ym) || 0) + vat);
    }

    // שמות חבילות ייחודיים
    const uniqueNames = Array.from(new Set(payments.map((p) => p.itemName)));

    return {
      filteredSorted: list,
      totalAmount: totals.amount,
      totalSms: totals.sms,
      totalVatFiltered: totals.vat,
      packageNames: uniqueNames,
      vatByYm: vatByMonth,
    };
  }, [payments, query, dateFrom, dateTo, packageFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const resetFilters = () => {
    setQuery("");
    setDateFrom("");
    setDateTo("");
    setPackageFilter("all");
    setSortKey("createdAt");
    setSortDir("desc");
  };

  // יצירת תשלום בדוי (לבדיקות)
  const createDummyPayment = async () => {
    try {
      const itemName = "basic";
      const input = window.prompt(
        'סכום לתשלום בדיקה עבור "basic" (חייב להתאים למחיר החבילה ב-DB):',
        "80"
      );
      if (input == null) return;
      const amount = Number(input);
      if (!Number.isFinite(amount) || amount < 0) {
        alert("סכום לא תקין");
        return;
      }
      const transactionId = "dummy-" + Date.now();

      const res = await fetch("/api/payments/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, itemName, amount }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert("שגיאה ביצירת תשלום: " + (data?.error || res.status));
        return;
      }

      alert("תשלום בדיקה נשמר בהצלחה 🎉");
      fetchPayments(); // ריענון הטבלה
      fetchSummary(); // ריענון הסיכומים למעלה
      onUsersUpdated?.(); // רענון טבלת המשתמשים
    } catch (err) {
      console.error(err);
      alert("שגיאת רשת/דפדפן");
    }
  };

  // עוזר לשליפת סכום מע״מ לחודש מסוים מתוך המפה שחישבנו
  const vatForYm = (ym?: string) =>
    ym ? fmtCurrency.format(vatByYm.get(ym) || 0) : fmtCurrency.format(0);

  // חישוב מצטבר מע״מ ל-N החודשים המלאים האחרונים (נשתמש ב-summary אם קיים)
  const rollingVatLabelAndSum = useMemo(() => {
    if (!summary) return { label: "", sum: 0 };
    // אם ה-API מחזיר fromYm/toYm — נשתמש בהם לצבירה
    const months: string[] = [];
    if (summary.rolling.fromYm && summary.rolling.toYm) {
      const [yFrom, mFrom] = summary.rolling.fromYm.split("-").map(Number);
      const [yTo, mTo] = summary.rolling.toYm.split("-").map(Number);
      let y = yFrom;
      let m = mFrom;
      while (y < yTo || (y === yTo && m <= mTo)) {
        months.push(`${y}-${String(m).padStart(2, "0")}`);
        m++;
        if (m > 12) {
          m = 1;
          y++;
        }
      }
    }
    // fallback: אם אין from/to — ניקח פשוט N חודשים אחורה כולל הנוכחי
    if (months.length === 0) {
      const now = new Date();
      let y = now.getFullYear();
      let m = now.getMonth() + 1;
      for (let i = 0; i < summary.rolling.months; i++) {
        months.unshift(`${y}-${String(m).padStart(2, "0")}`);
        m--;
        if (m < 1) {
          m = 12;
          y--;
        }
      }
    }
    const sum = months.reduce((acc, ym) => acc + (vatByYm.get(ym) || 0), 0);
    return { label: summary.rolling.label || "", sum };
  }, [summary, vatByYm]);

  function fmtPct(v: number) {
    return `${v.toFixed(1)}%`;
  }

  function deriveAppliedVatRate(p: Payment): number | null {
    // 1) אם השרת כבר החזיר appliedVatRate — נשתמש בו
    if (typeof p.appliedVatRate === "number" && p.appliedVatRate >= 0) {
      return p.appliedVatRate;
    }
    // 2) אם יש לנו taxAmount ו־taxBaseAmount – נגזור ישירות
    if (
      typeof p.taxAmount === "number" &&
      typeof p.taxBaseAmount === "number" &&
      p.taxBaseAmount > 0
    ) {
      return (p.taxAmount / p.taxBaseAmount) * 100;
    }
    // 3) אם יש taxAmount ו־moneyAmount (ברוטו) – נגזור דרך נטו = ברוטו - מע״מ
    if (typeof p.taxAmount === "number" && typeof p.moneyAmount === "number") {
      const net = p.moneyAmount - p.taxAmount;
      if (net > 0) return (p.taxAmount / net) * 100;
    }
    return null;
  }

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
          <span className="text-sm font-semibold">ניהול תשלומים</span>
        </div>

        <span className="text-xs text-gray-600">
          סה״כ: <b>{filteredSorted.length}</b> מתוך <b>{payments.length}</b>
        </span>
      </button>

      {isOpen && (
        <div className="p-4">
          {/* ===== סיכומי חודשים – מוצג בראש מעל הסינון ===== */}
          <div className="mb-3 p-3 border rounded bg-gray-50">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-sm font-semibold">סיכומי חודשים</span>
              <div className="ml-auto flex items-center gap-2">
                <label className="text-[12px] text-gray-600">
                  חודשים מלאים אחרונים:
                </label>
                <input
                  type="number"
                  min={1}
                  max={36}
                  value={monthsCount}
                  onChange={(e) =>
                    setMonthsCount(
                      Math.max(1, Math.min(36, Number(e.target.value) || 1))
                    )
                  }
                  className="h-8 text-[12px] px-2 border rounded w-20"
                />
                <button
                  onClick={fetchSummary}
                  className="h-8 text-[12px] px-2 border rounded cursor-pointer hover:bg-gray-100"
                >
                  רענן סיכומים
                </button>
              </div>
            </div>

            {summaryLoading ? (
              <div className="text-[12px] text-gray-600">טוען סיכומים…</div>
            ) : summaryErr ? (
              <div className="text-[12px] text-red-700">
                שגיאה: {summaryErr}
              </div>
            ) : summary ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-[12px]">
                <SummaryCard
                  title={`חודש עכשווי — ${summary.currentMonth.label}`}
                  amount={summary.currentMonth.sum}
                  count={summary.currentMonth.count}
                  vatLine={`מע״מ לתשלום: ${vatForYm(summary.currentMonth.ym)}`}
                />
                <SummaryCard
                  title={`חודש קודם — ${summary.lastMonth.label}`}
                  amount={summary.lastMonth.sum}
                  count={summary.lastMonth.count}
                  vatLine={`מע״מ לתשלום: ${vatForYm(summary.lastMonth.ym)}`}
                />
                <SummaryCard
                  title={`חודש קודם־קודם — ${summary.prevMonth.label}`}
                  amount={summary.prevMonth.sum}
                  count={summary.prevMonth.count}
                  vatLine={`מע״מ לתשלום: ${vatForYm(summary.prevMonth.ym)}`}
                />
                <SummaryCard
                  title={
                    summary.rolling.label
                      ? `מצטבר ${summary.rolling.months} (${summary.rolling.label})`
                      : `מצטבר ${summary.rolling.months} חודשים מלאים`
                  }
                  amount={summary.rolling.sum}
                  count={summary.rolling.count}
                  vatLine={`מע״מ לתשלום: ${fmtCurrency.format(
                    rollingVatLabelAndSum.sum || 0
                  )}`}
                />
              </div>
            ) : (
              <div className="text-[12px] text-gray-600">אין נתונים להצגה.</div>
            )}
          </div>

          {/* ===== סינון ===== */}
          <div className="mb-2 flex flex-wrap gap-2 items-center">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 text-[12px] px-2 border rounded w-48"
              placeholder="חיפוש לפי אימייל או מזהה עסקה"
            />

            {/* טווח תאריכים */}
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 text-[12px] px-2 border rounded"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 text-[12px] px-2 border rounded"
            />

            {/* חבילה */}
            <select
              value={packageFilter}
              onChange={(e) => setPackageFilter(e.target.value)}
              className="h-8 text-[12px] px-2 border rounded"
            >
              <option value="all">כל החבילות</option>
              {packageNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            <button
              onClick={resetFilters}
              className="h-8 px-2 text-[12px] border rounded cursor-pointer hover:bg-gray-100"
            >
              איפוס סינון
            </button>

            <button
              onClick={createDummyPayment}
              className="h-8 px-2 text-[12px] border rounded cursor-pointer bg-blue-50 hover:bg-blue-100"
            >
              צור תשלום בדוי
            </button>
          </div>

          {/* סיכומים של התצוגה המסוננת (בטבלה) */}
          <div className="mb-2 p-2 border rounded bg-gray-50 text-[12px] flex flex-wrap gap-6">
            <span>
              סה״כ סכום (לפי הסינון): <b>{fmtCurrency.format(totalAmount)}</b>
            </span>
            <span>
              סה״כ מע״מ (לפי הסינון):{" "}
              <b>{fmtCurrency.format(totalVatFiltered)}</b>
            </span>
            <span>
              סה״כ SMS (לפי הסינון): <b>{totalSms}</b>
            </span>
          </div>

          <div className="overflow-y-auto" dir="ltr">
            {/* ===== טבלה ===== */}
            <div className="max-h-[60vh]  border rounded text-[12px]" dir="rtl">
              {loading ? (
                <div className="p-3">טוען…</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100 text-right">
                      <Th
                        label="אימייל"
                        sortKey="email"
                        activeKey={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                      />
                      <Th
                        label="חבילה"
                        sortKey="itemName"
                        activeKey={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                      />
                      <Th
                        label="סכום (ברוטו)"
                        sortKey="moneyAmount"
                        activeKey={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                      />
                      {/* עמודות חדשות */}
                      <th className="border p-1.5">ללא מע״מ</th>
                      <th className="border p-1.5">מעמ</th>
                      <th className="border p-1.5">שיעור מע״מ</th>
                      <Th
                        label="מס׳ SMS"
                        sortKey="smsAmount"
                        activeKey={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                      />
                      <Th
                        label="מזהה עסקה"
                        sortKey="transactionId"
                        activeKey={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                      />
                      <Th
                        label="תאריך"
                        sortKey="createdAt"
                        activeKey={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSorted.map((p) => {
                      const { vat, net } = computeVatAndNet(p);
                      const rate = deriveAppliedVatRate(p);
                      return (
                        <tr
                          key={p._id}
                          onClick={() => openPayment(p)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ")
                              openPayment(p);
                          }}
                          role="button"
                          tabIndex={0}
                          className="hover:bg-gray-50 cursor-pointer"
                        >
                          <td className="border p-1.5">{p.email}</td>
                          <td className="border p-1.5">{p.itemName}</td>
                          <td className="border p-1.5">
                            {fmtCurrency.format(p.moneyAmount)}
                          </td>
                          <td className="border p-1.5">
                            {fmtCurrency.format(net)}
                          </td>
                          <td className="border p-1.5">
                            {fmtCurrency.format(vat)}
                          </td>
                          <td className="border p-1.5">
                            {typeof rate === "number" ? fmtPct(rate) : "—"}
                          </td>
                          <td className="border p-1.5">{p.smsAmount ?? 0}</td>
                          <td className="border p-1.5">{p.transactionId}</td>
                          <td className="border p-1.5">
                            {hebDate(p.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredSorted.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="p-3 text-center text-gray-500"
                        >
                          אין תשלומים תואמים לסינון.
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
      <PaymentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        payment={selectedPayment}
      />
    </div>
  );
}

// כותרת עם מיון
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

/** כרטיס תקציר קטן */
function SummaryCard({
  title,
  amount,
  count,
  vatLine,
}: {
  title: string;
  amount: number;
  count: number;
  vatLine?: string;
}) {
  return (
    <div className="border rounded bg-white p-2 flex flex-col gap-1">
      <div className="text-[12px] text-gray-700 font-medium">{title}</div>
      <div className="text-[13px]">
        סכום: <b>{fmtCurrency.format(amount || 0)}</b>
      </div>
      {vatLine && <div className="text-[12px] text-gray-700">{vatLine}</div>}
      <div className="text-[12px] text-gray-600">
        עסקאות: <b>{count || 0}</b>
      </div>
    </div>
  );
}
