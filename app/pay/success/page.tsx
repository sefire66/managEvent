"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, FileText } from "lucide-react";

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

export default function PaySuccessPage() {
  const sp = useSearchParams();
  const router = useRouter();

  const [data, setData] = useState<PaymentStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);

  // מזהים אפשריים שמגיעים ב-ReturnUrl (אתה יכול להוסיף עוד aliases אם צריך)
  const orderId =
    sp.get("orderId") || sp.get("order_id") || sp.get("oid") || "";
  const paymentId =
    sp.get("paymentId") ||
    sp.get("PaymentId") ||
    sp.get("tx") ||
    sp.get("transactionId") ||
    "";

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (orderId) params.set("orderId", orderId);
    if (paymentId) params.set("paymentId", paymentId);
    return params.toString();
  }, [orderId, paymentId]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let stop = false;

    async function fetchStatus() {
      try {
        setError(null);
        const url = query
          ? `/api/payments/status?${query}`
          : `/api/payments/status`;
        const res = await fetch(url, { cache: "no-store" });
        const json: PaymentStatusResponse = await res.json();
        setData(json);

        // תנאי עצירה: נמצא והסטטוס כבר לא pending
        if (
          json.ok &&
          "found" in json &&
          json.found &&
          json.status !== "pending"
        ) {
          setPolling(false);
          return;
        }
        // אם לא נמצא, נמשיך עוד קצת לנסות (ייתכן ש-callback יגיע באיחור)
      } catch (e: any) {
        setError(e?.message || "שגיאה בשליפת סטטוס התשלום");
      }
      if (!stop) {
        timer = setTimeout(fetchStatus, 2500); // poll כל 2.5 שניות
      }
    }

    fetchStatus();
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, [query]);

  const isPending =
    !data || (data.ok && "status" in data && data.status === "pending");

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
            אנו ממתינים לאישור מהסליקה. זה עשוי לקחת מספר שניות. העמוד ירענן
            אוטומטית.
          </p>
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
              <b>
                {data.moneyAmount} {data.currency || "ILS"}
              </b>
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
          <h1 className="text-2xl font-bold mb-2 text-red-600">
            לא אותר תשלום מאושר
          </h1>
          <p className="text-gray-600 mb-6">
            ייתכן שהעסקה נכשלה או שבוטלה. אם ביצעת תשלום, המתן עוד כמה שניות
            ונסה לרענן.
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/pay/fail")}
              className="px-4 py-2 rounded border hover:bg-gray-50"
            >
              למסך כישלון
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              חזרה לדף הבית
            </button>
          </div>
          {error ? <p className="text-sm text-red-600 mt-4">{error}</p> : null}
        </>
      )}
    </div>
  );
}
