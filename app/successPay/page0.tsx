"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function SuccessPayPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [smsBalance, setSmsBalance] = useState<number | null>(null);

  useEffect(() => {
    const sendPayment = async () => {
      const itemName = searchParams.get("item_name");
      const amount = searchParams.get("amt");
      const transactionId = searchParams.get("tx");

      console.log("Paypay payment:", itemName, amount, transactionId);

      if (!itemName || !amount || !transactionId) {
        setStatus("error");
        return;
      }

      const res = await fetch("/api/payments/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName,
          amount,
          transactionId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatus("success");
        setSmsBalance(data.smsBalance);
        console.log("success Paypay payment:", itemName, amount, transactionId);
      } else {
        setStatus("error");
        console.log("error Paypay payment:", itemName, amount, transactionId);
      }
    };

    sendPayment();
  }, [searchParams]);

  return (
    <div className="p-10 text-center mt-16">
      <h2 className="text-2xl font-bold mb-4">🎉 תשלום הושלם</h2>
      {status === "loading" && <p>טוען נתוני רכישה...</p>}
      {status === "success" && (
        <p>
          תודה על הרכישה! כמות ההודעות שלך עודכנה ל־
          <strong> {smsBalance}</strong> הודעות.
        </p>
      )}
      {status === "error" && <p>❌ שגיאה בעיבוד התשלום</p>}
    </div>
  );
}
