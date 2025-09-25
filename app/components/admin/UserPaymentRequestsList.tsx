"use client";

import React, { useEffect, useMemo, useState } from "react";

const fmtILS = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 2,
});

type PRStatus = "draft" | "active" | "paid" | "expired" | "canceled";
type FeeMode = "included" | "add_on";

export interface PaymentRequestListItem {
  _id: string;
  token: string;
  type: "payment" | "gift";
  title: string;
  currency: string;
  amount?: number | null;
  minAmount?: number | null;
  vatRate?: number | null;
  vatAmount?: number | null;
  feeMode?: FeeMode;
  feeFixed?: number | null;
  feePercent?: number | null;
  showFeeBreakdown?: boolean;
  status: PRStatus;
  usageLimit: number;
  uses: number;
  shortUrl?: string | null;
  expiresAt?: string | null; // ISO
  createdAt?: string | null; // ISO
}

export interface UserPaymentRequestsListProps {
  /** לפי מי לסנן את הבקשות */
  ownerUserId: string;

  /** פתיחת דיאלוג עריכה (קיים אצלך) */
  onOpenEdit?: (token: string) => void;

  /** ריענון חיצוני (כשהורה רוצה) */
  refreshKey?: number;
}

export default function UserPaymentRequestsList({
  ownerUserId,
  onOpenEdit,
  refreshKey,
}: UserPaymentRequestsListProps) {
  const [items, setItems] = useState<PaymentRequestListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function fetchList() {
    setLoading(true);
    setErr(null);
    try {
      // מניח שקיים GET עם פרמטר ownerUserId
      const res = await fetch(
        `/api/payment-requests?ownerUserId=${encodeURIComponent(ownerUserId)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) {
        throw new Error(data?.error || "שגיאה בשליפת בקשות");
      }
      setItems(data);
    } catch (e: any) {
      setErr(e.message || "שגיאה בשליפה");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ownerUserId) fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerUserId]);

  useEffect(() => {
    if (refreshKey !== undefined) fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      return (
        (it.title || "").toLowerCase().includes(q) ||
        (it.token || "").toLowerCase().includes(q) ||
        (it.shortUrl || "").toLowerCase().includes(q)
      );
    });
  }, [items, query]);

  return (
    <div className="mt-3 border rounded-lg p-3" dir="rtl">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">בקשות תשלום של המשתמש</h3>
        <input
          className="border rounded px-2 py-1 text-xs"
          placeholder="חיפוש לפי כותרת / token / קישור"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading && <div className="text-xs text-gray-600">טוען…</div>}
      {err && (
        <div className="text-xs bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2">
          {err}
        </div>
      )}
      {!loading && !err && filtered.length === 0 && (
        <div className="text-xs text-gray-600">אין בקשות להצגה.</div>
      )}

      <div className="space-y-2 overflow-auto max-h-56">
        {filtered.map((it) => {
          const amt = it.amount || 0;
          const vat = it.vatAmount || 0;
          const net = amt - vat;
          const isExpired = it.expiresAt && new Date(it.expiresAt) < new Date();

          return (
            <button
              key={it._id}
              onClick={() => onOpenEdit?.(it.token)}
              className="w-full text-right border rounded p-2 hover:bg-gray-50 cursor-pointer"
              title="פתח עריכה"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100">
                  {it.type === "payment" ? "תשלום" : "מתנה"}
                </span>
                <b className="text-sm">{it.title || "—"}</b>
                <span className="text-xs text-gray-600">
                  סטטוס: <b>{it.status}</b>
                </span>
                {isExpired && (
                  <span className="text-xs text-red-600">· פג תוקף</span>
                )}
                <span className="ml-auto text-xs text-gray-500">
                  {it.createdAt
                    ? new Date(it.createdAt).toLocaleString("he-IL")
                    : ""}
                </span>
              </div>

              <div className="mt-1 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                <div className="text-gray-700">
                  <span>ברוטו: </span>
                  <b>{fmtILS.format(amt || 0)}</b>
                  <span className="mx-1">·</span>
                  <span>לפני מע״מ: </span>
                  <b>{fmtILS.format(net || 0)}</b>
                  <span className="mx-1">·</span>
                  <span>מע״מ: </span>
                  <b>{fmtILS.format(vat || 0)}</b>
                  {typeof it.vatRate === "number" && (
                    <>
                      <span className="mx-1">·</span>
                      <span>שיעור: </span>
                      <b>{it.vatRate}%</b>
                    </>
                  )}
                </div>

                <div className="text-gray-700">
                  <span>שימושים: </span>
                  <b>
                    {it.uses}/{it.usageLimit}
                  </b>
                  {it.expiresAt && (
                    <>
                      <span className="mx-1">·</span>
                      <span>תוקף: </span>
                      <b>{new Date(it.expiresAt).toLocaleString("he-IL")}</b>
                    </>
                  )}
                </div>

                <div className="text-gray-700">
                  <span>קישור: </span>
                  <a
                    href={it.shortUrl || `/pay/${it.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                    dir="ltr"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {it.shortUrl || `/pay/${it.token}`}
                  </a>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
