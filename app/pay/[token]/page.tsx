// app/pay/[token]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type FeeMode = "included" | "add_on";
type PRType = "payment" | "gift";
type PRStatus = "draft" | "active" | "paid" | "expired" | "canceled";

type PaymentRequestDTO = {
  _id: string;
  token: string;
  type: PRType;
  title: string;
  description?: string | null;
  imageUrl?: string | null;

  currency: string;
  amount?: number | null; // payment או gift-קבוע
  minAmount?: number | null; // gift פתוח

  // מתנות – עמלות
  feeMode?: FeeMode;
  feeFixed?: number | null;
  feePercent?: number | null; // 0..100 (אחוזים)
  vatRateForFee?: number | null; // 0..100 (אחוזים)
  showFeeBreakdown?: boolean;

  status: PRStatus;
  usageLimit: number;
  uses: number;
  expiresAt: string | null;

  ownerUserId: string | null;
  eventId: string | null;
  shortUrl: string | null;
};

const ils = (v: number, ccy = "ILS") =>
  new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: ccy,
    maximumFractionDigits: 2,
  }).format(v);

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export default function PayTokenPage() {
  const { token } = useParams<{ token: string }>();
  const sp = useSearchParams();
  const isMarkedPaid = sp.get("mark-paid") === "1";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [pr, setPr] = useState<PaymentRequestDTO | null>(null);

  // ערך סכום שהאורח מזין (ל–gift פתוח) או סכום קבוע (לנוחיות תצוגה)
  const [enteredAmount, setEnteredAmount] = useState<number | "">("");

  // סטטוס תשלום (לשימוש כשחוזרים עם מסמכים)
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState<null | {
    paymentId: string;
    docUrl?: string | null;
    feeDocUrl?: string | null;
  }>(null);

  // טעינת בקשת התשלום
  useEffect(() => {
    let cancelled = false;
    async function fetchPR() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/payment-requests/${token}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "שגיאה בטעינת בקשת תשלום");
        if (!cancelled) {
          setPr(json);
          // אתחול סכום ברירת מחדל בהתאם לסוג
          if (json.type === "payment" && typeof json.amount === "number") {
            setEnteredAmount(json.amount);
          } else if (json.type === "gift") {
            if (typeof json.amount === "number") {
              setEnteredAmount(json.amount);
            } else if (typeof json.minAmount === "number") {
              setEnteredAmount(json.minAmount);
            } else {
              setEnteredAmount("");
            }
          }
        }
      } catch (e: any) {
        if (!cancelled) setErr(e.message || "שגיאה");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchPR();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const currency = pr?.currency || "ILS";

  // חישוב עמלה (ל–gift) והסכום לתשלום — מתוקן לאחוזים (0..100)
  const breakdown = useMemo(() => {
    if (!pr) return null;

    const type = pr.type;
    const feeMode = (pr.feeMode || "add_on") as FeeMode;
    const feeFixed = pr.feeFixed ?? 0; // ₪
    const feePercent = pr.feePercent ?? 0; // באחוזים 0..100
    const vatRate = pr.vatRateForFee ?? 0; // באחוזים 0..100

    let g: number | null = null;

    if (type === "payment") {
      g = typeof pr.amount === "number" ? pr.amount : null;
      return g != null
        ? {
            toPay: round2(g),
            gift: null,
            feeBase: null,
            feeVat: null,
            feeTotal: null,
            feeMode,
          }
        : null;
    }

    // gift:
    const input = typeof enteredAmount === "number" ? enteredAmount : NaN;
    if (typeof pr.amount === "number") g = pr.amount;
    else if (!isNaN(input)) g = input;

    if (g == null) return null;

    const feePercentDec = (feePercent || 0) / 100; // ← אחוז -> שבר
    const vatRateDec = (vatRate || 0) / 100; // ← אחוז -> שבר

    const feeBase = round2((feeFixed || 0) + g * feePercentDec);
    const feeVat = round2(feeBase * vatRateDec);
    const feeTotal = round2(feeBase + feeVat);

    if (feeMode === "add_on") {
      return {
        toPay: round2(g + feeTotal),
        gift: round2(g),
        feeBase,
        feeVat,
        feeTotal,
        feeMode,
      };
    } else {
      return {
        toPay: round2(g),
        gift: round2(g),
        feeBase,
        feeVat,
        feeTotal,
        feeMode,
      };
    }
  }, [pr, enteredAmount]);

  async function handlePay() {
    if (!pr || !breakdown) return;
    setPaying(true);
    setErr(null);

    try {
      // מינימום למתנה: אם הוגדר בבקשה נשתמש בו, אחרת 1 ₪ כברירת מחדל
      const MIN_GIFT = typeof pr.minAmount === "number" ? pr.minAmount : 1;

      // אם זה gift סכום-פתוח — ודא שיש סכום תקין
      if (pr.type === "gift" && typeof pr.amount !== "number") {
        const g =
          typeof enteredAmount === "number" ? Number(enteredAmount) : NaN;

        if (!Number.isFinite(g) || g < MIN_GIFT) {
          setErr(`יש להזין סכום מתנה תקין (מינימום ${MIN_GIFT} ₪)`);
          setPaying(false);
          return;
        }
      }

      // קריאה לשרת ליצירת קישור תשלום ב-Invoice4U (ProcessApiRequestV2)
      const res = await fetch(
        `/api/invoice4u/checkout?token=${encodeURIComponent(pr.token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // אם זו מתנה עם סכום פתוח — שולחים את הסכום שהוזן
            giftAmount:
              pr.type === "gift" && typeof pr.amount !== "number"
                ? Number(enteredAmount)
                : undefined,
          }),
        }
      );

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.checkoutUrl) {
        throw new Error(json?.error || "יצירת קישור תשלום נכשלה");
      }

      // מעבר לדף התשלום של Invoice4U
      window.location.href = json.checkoutUrl;
    } catch (e: any) {
      setErr(e?.message || "שגיאה בתשלום");
      setPaying(false);
    }
  }

  // ולידציה בסיסית להזנת סכום (gift פתוח)
  const amountInputError = useMemo(() => {
    if (!pr) return null;
    if (pr.type === "payment") return null;

    if (typeof pr.amount === "number") return null; // קבוע — אין הזנה
    const v = enteredAmount;
    if (v === "") return "נא להזין סכום";
    if (typeof v !== "number" || Number.isNaN(v)) return "סכום לא תקין";
    if (v < 1) return "מינימום 1 ₪";
    if (typeof pr.minAmount === "number" && v < pr.minAmount) {
      return `מינימום ${ils(pr.minAmount, currency)}`;
    }
    return null;
  }, [pr, enteredAmount, currency]);

  // ---- מסך “שולם” מוקדם: אם הסטטוס כבר paid או שסומן דרך הפרמטר ----
  if (!loading && !err && pr && (pr.status === "paid" || isMarkedPaid)) {
    return (
      <div className="min-h-screen bg-gray-100 py-10" dir="rtl">
        <div className="max-w-xl mx-auto bg-white rounded-xl shadow p-6 mt-20 text-center">
          <div className="text-2xl font-bold mb-2">תשלום שולם ✔️</div>
          <div className="text-gray-700">תודה רבה!</div>

          {/* אם שמרת מסמכים/קישורים ב-state (paid) תוכל להציג כאן */}
          {paid?.docUrl && (
            <div className="mt-3">
              <a
                href={paid.docUrl}
                target="_blank"
                rel="noreferrer"
                className="underline text-green-700"
              >
                צפייה במסמך החשבונאי
              </a>
            </div>
          )}
          {paid?.feeDocUrl && (
            <div className="mt-1">
              <a
                href={paid.feeDocUrl}
                target="_blank"
                rel="noreferrer"
                className="underline text-green-700"
              >
                צפייה בחשבונית העמלה
              </a>
            </div>
          )}

          <div className="text-xs text-gray-500 mt-6">
            סטטוס בקשה: paid
            {pr.expiresAt
              ? ` · בתוקף עד ${new Date(pr.expiresAt).toLocaleString("he-IL")}`
              : ""}
            {typeof pr.usageLimit === "number"
              ? ` · שימושים: ${pr.uses}/${pr.usageLimit}`
              : ""}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-10" dir="rtl">
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow p-5 mt-20">
        {loading && <div className="text-center py-10">טוען…</div>}
        {!loading && err && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
            {err}
          </div>
        )}
        {!loading && !err && pr && (
          <>
            {/* כותרת + תמונה */}
            <div className="flex flex-col items-center gap-3 mb-4">
              {pr.imageUrl && (
                <img
                  src={pr.imageUrl}
                  alt="תמונת אירוע"
                  className="w-full h-48 object-cover rounded-lg"
                />
              )}
              <h1 className="text-2xl font-bold text-center">{pr.title}</h1>
              {pr.description && (
                <p className="text-gray-600 text-center">{pr.description}</p>
              )}
            </div>

            {/* סכום */}
            <div className="mb-4">
              {pr.type === "payment" ? (
                <div className="text-lg">
                  סכום לתשלום: <b>{ils(pr.amount || 0, currency)}</b>
                </div>
              ) : (
                <div className="space-y-2">
                  {typeof pr.amount === "number" ? (
                    <div className="text-lg">
                      סכום מתנה: <b>{ils(pr.amount, currency)}</b>
                    </div>
                  ) : (
                    <label className="block">
                      <span className="text-sm text-gray-700">סכום מתנה</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={pr.minAmount ?? 1}
                        step="1"
                        value={enteredAmount}
                        onChange={(e) =>
                          setEnteredAmount(
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        className="mt-1 block w-full border rounded px-3 py-2"
                        placeholder={
                          pr.minAmount
                            ? `מינימום ${ils(pr.minAmount, currency)}`
                            : "מינימום 1 ₪"
                        }
                      />
                      {amountInputError && (
                        <div className="text-xs text-red-600 mt-1">
                          {amountInputError}
                        </div>
                      )}
                    </label>
                  )}
                </div>
              )}
            </div>

            {/* פירוט עמלה (ל–gift) */}
            {pr.type === "gift" && breakdown && (
              <div className="mb-4 border rounded p-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span>סכום מתנה</span>
                  <b>{ils(breakdown.gift ?? 0, currency)}</b>
                </div>

                {pr.showFeeBreakdown !== false && (
                  <>
                    <div className="flex items-center justify-between text-sm text-gray-700 mt-1">
                      <span>עמלה</span>
                      <b>{ils(breakdown.feeBase ?? 0, currency)}</b>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-700">
                      <span>מע״מ על עמלה</span>
                      <b>{ils(breakdown.feeVat ?? 0, currency)}</b>
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between border-t pt-2 mt-2">
                  <span>
                    לתשלום {breakdown.feeMode === "add_on" ? "(כולל עמלה)" : ""}
                  </span>
                  <b>{ils(breakdown.toPay, currency)}</b>
                </div>
              </div>
            )}

            {/* פייד/מצב (אם חזרת עם מסמכים דרך flow עתידי) */}
            {paid ? (
              <div className="bg-green-50 border border-green-200 rounded p-3 text-sm mb-3">
                <div className="font-semibold mb-1">תשלום הושלם ✔️</div>
                <div>מס׳ תשלום: {paid.paymentId}</div>
                {paid.docUrl && (
                  <div className="mt-1">
                    <a
                      href={paid.docUrl}
                      target="_blank"
                      className="underline text-green-700"
                      rel="noreferrer"
                    >
                      צפייה במסמך החשבונאי
                    </a>
                  </div>
                )}
                {paid.feeDocUrl && (
                  <div className="mt-1">
                    <a
                      href={paid.feeDocUrl}
                      target="_blank"
                      className="underline text-green-700"
                      rel="noreferrer"
                    >
                      צפייה בחשבונית העמלה
                    </a>
                  </div>
                )}
              </div>
            ) : null}

            {/* כפתור תשלום */}
            {!paid && (
              <button
                onClick={handlePay}
                disabled={
                  paying ||
                  !breakdown ||
                  (pr.type === "gift" &&
                    typeof pr.amount !== "number" &&
                    !!amountInputError)
                }
                className={`w-full rounded-lg py-2.5 text-white text-base transition
                ${
                  paying ||
                  !breakdown ||
                  (pr.type === "gift" &&
                    typeof pr.amount !== "number" &&
                    !!amountInputError)
                    ? "bg-gray-400"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {paying
                  ? "מעבד תשלום…"
                  : `שלם עכשיו (${ils(breakdown?.toPay || 0, currency)})`}
              </button>
            )}

            {/* הערת מצב/תוקף */}
            <div className="text-xs text-gray-500 mt-3 text-center">
              סטטוס בקשה: {pr.status}
              {pr.expiresAt
                ? ` · בתוקף עד ${new Date(pr.expiresAt).toLocaleString("he-IL")}`
                : ""}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
