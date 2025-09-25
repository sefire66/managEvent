"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { XCircle } from "lucide-react";

export default function PayFailPage() {
  const sp = useSearchParams();
  const router = useRouter();

  // אפשר לקבל הודעת שגיאה/קוד אם הספק מחזיר ב-ReturnUrl
  const error = sp.get("error") || sp.get("message") || "";
  const orderId = sp.get("orderId") || sp.get("oid") || "";
  const paymentId =
    sp.get("paymentId") || sp.get("PaymentId") || sp.get("tx") || "";

  return (
    <div
      dir="rtl"
      className="min-h-[65vh] max-w-2xl mx-auto px-6 py-16 text-center"
    >
      <XCircle className="mx-auto mb-4 h-12 w-12 text-red-600" />
      <h1 className="text-2xl font-bold mb-2">התשלום לא הושלם</h1>
      <p className="text-gray-600 mb-6">נראה שהעסקה נכשלה או בוטלה.</p>

      {(orderId || paymentId || error) && (
        <div className="text-right bg-gray-50 border rounded-lg p-4 grid gap-1">
          {orderId ? (
            <div>
              <span className="text-gray-600">הזמנה (orderId): </span>
              <code dir="ltr" className="px-1.5 py-0.5 rounded bg-white border">
                {orderId}
              </code>
            </div>
          ) : null}
          {paymentId ? (
            <div>
              <span className="text-gray-600">מזהה תשלום: </span>
              <code dir="ltr" className="px-1.5 py-0.5 rounded bg-white border">
                {paymentId}
              </code>
            </div>
          ) : null}
          {error ? (
            <div>
              <span className="text-gray-600">שגיאה: </span>
              <span className="text-red-700">{error}</span>
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
    </div>
  );
}
