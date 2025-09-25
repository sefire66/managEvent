"use client";

import { useEffect, useState } from "react";

export default function SuccessPayPage() {
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [smsBalance, setSmsBalance] = useState<number | null>(null);

  useEffect(() => {
    // בדף זה לא מתבצעת קריאה אוטומטית — כי התשלום נעשה דרך SDK
    // נשתמש בו רק להצגת הצלחה לאחר התשלום
    const storedStatus = sessionStorage.getItem("paymentStatus");
    const storedBalance = sessionStorage.getItem("newSmsBalance");

    if (storedStatus === "success" && storedBalance) {
      setStatus("success");
      setSmsBalance(parseInt(storedBalance));
      console.log("✅ הצגת דף הצלחה עם יתרה חדשה:", storedBalance);
    } else {
      console.error("❌ אין מידע על רכישה או שלא הצליחה");
      setStatus("error");
    }

    // ניקוי sessionStorage אחרי ההצגה
    sessionStorage.removeItem("paymentStatus");
    sessionStorage.removeItem("newSmsBalance");
  }, []);

  return (
    <div className="p-10 text-center mt-16">
      <h2 className="text-2xl font-bold mb-4">🎉 תשלום הושלם</h2>

      {status === "idle" || status === "loading" ? (
        <p>טוען נתוני רכישה...</p>
      ) : status === "success" ? (
        <p>
          תודה על הרכישה! כמות ההודעות שלך עודכנה ל־
          <strong> {smsBalance}</strong> הודעות.
        </p>
      ) : (
        <p>❌ שגיאה בעיבוד התשלום או שלא בוצעה רכישה</p>
      )}
    </div>
  );
}
