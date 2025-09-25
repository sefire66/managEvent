"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, FileText } from "lucide-react";

type PaymentStatus =
  | "pending"
  | "authorized"
  | "captured"
  | "failed"
  | "refunded"
  | "chargeback";

type PaymentStatusResponse =
  | {
      ok: true;
      found: true;
      status: PaymentStatus;
      itemName: string;
      moneyAmount: number;
      currency: string;
      transactionId: string;
      providerRefs?: Record<string, string>;
      docId?: string | null;
      docNumber?: string | null;
      docUrl?: string | null;
      createdAt?: string;
    }
  | { ok: true; found: false; status: "pending" }
  | { ok: false; error: string };

const MAX_WAIT_MS = 30000; // 30 שניות עד שנציג "לא התקבל אישור"
const POLL_INTERVAL_MS = 2500;

export default function PayResultPage() {
  const sp = useSearchParams();
  const router = useRouter();

  // מזהים אפשריים שיגיעו ב-ReturnUrl
  const orderId =
    sp.get("orderId") || sp.get("order_id") || sp.get("oid") || "";
  const paymentId =
    sp.get("paymentId") ||
    sp.get("PaymentId") ||
    sp.get("tx") ||
    sp.get("transactionId") ||
    "";

  // יש ספקים שמחזירים הודעת שגיאה ב-ReturnUrl (לא חובה)
  const errorMsg = sp.get("error") || sp.get("message") || "";

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (orderId) p.set("orderId", orderId);
    if (paymentId) p.set("paymentId", paymentId);
    return p.toString();
  }, [orderId, paymentId]);

  const [data, setData] = useState<PaymentStatusResponse | null>(null);
  const [polling, setPolling] = useState(true);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const formatMoney = (amt: number, ccy: string) =>
    new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: (ccy || "ILS").toUpperCase(),
      currencyDisplay: "symbol",
      maximumFractionDigits: 2,
    }).format(amt);

  // Polling לסטטוס התשלום עד הצלחה/כישלון או timeout
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stop = false;
    const start = Date.now();
    const controller = new AbortController();

    async function fetchStatus() {
      try {
        setFetchErr(null);
        const url = query
          ? `/api/payments/status?${query}`
          : `/api/payments/status`;
        const res = await fetch(url, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json: PaymentStatusResponse = await res.json();
        setData(json);

        // עצירה כשהתשלום התקבל/נכשל (אם יש תמיכה ב-failed ב-API זה יעבוד; אם לא—'captured' יספיק)
        if (
          json.ok &&
          "found" in json &&
          json.found &&
          (json.status === "captured" ||
            json.status === "failed" ||
            json.status === "refunded" ||
            json.status === "chargeback")
        ) {
          setPolling(false);
          return;
        }
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setFetchErr(e?.message || "שגיאה בשליפת סטטוס התשלום");
        }
      }

      // טיים־אאוט: אם לא התקבלה הצלחה בזמן המותר → נעצור polling ונציג "לא הושלם"
      if (!stop) {
        if (Date.now() - start >= MAX_WAIT_MS) {
          setTimedOut(true);
          setPolling(false);
          return;
        }
        timer = setTimeout(fetchStatus, POLL_INTERVAL_MS);
      }
    }

    setTimedOut(false);
    setPolling(true);
    fetchStatus();

    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const isPending =
    !timedOut &&
    (!data ||
      (data.ok &&
        "status" in data &&
        (data.status === "pending" || data.status === "authorized")));

  return (
    <div
      dir="rtl"
      className="min-h-[65vh] max-w-2xl mx-auto px-6 py-16 text-center"
    >
      {isPending ? (
        <>
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-blue-600" />
          <h1 className="text-2xl font-bold mb-2">מאשרים תשלום…</h1>
          <p className="text-gray-600 mb-6">
            אנו ממתינים לאישור מהסליקה (ייתכן עיכוב של מספר שניות). העמוד ירענן
            אוטומטית.
          </p>
          {!orderId && !paymentId ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              לא הועבר מזהה עסקה בכתובת (orderId/paymentId). מומלץ להעביר{" "}
              <b>orderId</b> ב־ReturnUrl ולשמור אותו גם ב־OrderIdClientUsage.
            </p>
          ) : null}
          {fetchErr ? (
            <p className="text-sm text-red-600 mt-2">{fetchErr}</p>
          ) : null}
        </>
      ) : data &&
        data.ok &&
        "found" in data &&
        data.found &&
        data.status === "captured" ? (
        <>
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-600" />
          <h1 className="text-2xl font-bold mb-2">התשלום התקבל בהצלחה 🎉</h1>

          <div className="mt-4 grid gap-2 text-right bg-gray-50 border rounded-lg p-4">
            <div>
              <span className="text-gray-600">פריט: </span>
              <b>{data.itemName}</b>
            </div>
            <div>
              <span className="text-gray-600">סכום: </span>
              <b>{formatMoney(data.moneyAmount, data.currency)}</b>
            </div>
            <div>
              <span className="text-gray-600">מזהה עסקה: </span>
              <code dir="ltr" className="px-1.5 py-0.5 rounded bg-white border">
                {data.transactionId}
              </code>
            </div>

            {data.docUrl ? (
              <a
                href={data.docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-2 text-blue-700 underline"
              >
                <FileText className="h-5 w-5" />
                צפייה במסמך (חשבונית/קבלה)
              </a>
            ) : (
              <p className="text-sm text-gray-500 mt-2">
                המסמך החשבונאי טרם התקבל. אם לא יופיע תוך דקה—רענן את הדף.
              </p>
            )}
          </div>

          <div className="mt-8 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              חזרה לדף הבית
            </button>
          </div>
        </>
      ) : (
        <>
          <XCircle className="mx-auto mb-4 h-12 w-12 text-red-600" />
          <h1 className="text-2xl font-bold mb-2">התשלום לא הושלם</h1>
          <p className="text-gray-600 mb-6">
            נראה שהעסקה נכשלה או בוטלה. אם ביצעת תשלום, ייתכן עיכוב בעדכון—נסה
            לרענן בעוד כמה שניות.
          </p>

          {(orderId || paymentId || errorMsg) && (
            <div className="text-right bg-gray-50 border rounded-lg p-4 grid gap-1">
              {orderId ? (
                <div>
                  <span className="text-gray-600">הזמנה (orderId): </span>
                  <code
                    dir="ltr"
                    className="px-1.5 py-0.5 rounded bg-white border"
                  >
                    {orderId}
                  </code>
                </div>
              ) : null}
              {paymentId ? (
                <div>
                  <span className="text-gray-600">מזהה תשלום: </span>
                  <code
                    dir="ltr"
                    className="px-1.5 py-0.5 rounded bg-white border"
                  >
                    {paymentId}
                  </code>
                </div>
              ) : null}
              {errorMsg ? (
                <div>
                  <span className="text-gray-600">שגיאה: </span>
                  <span className="text-red-700">{errorMsg}</span>
                </div>
              ) : null}
            </div>
          )}

          <div className="mt-8 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              חזרה לדף הבית
            </button>
          </div>
        </>
      )}
    </div>
  );
}
