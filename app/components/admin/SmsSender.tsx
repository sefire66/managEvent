"use client";

import React, { useState } from "react";

type SmsSenderProps = {
  onSmsSent?: () => void;
};

export default function SmsSender({ onSmsSent }: SmsSenderProps) {
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // מצב אקורדיון (פתוח/סגור)
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/inforUsms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, message }),
      });

      setLoading(false);

      if (res.ok) {
        alert("הודעה נשלחה בהצלחה!");
        setTo("");
        setMessage("");
        onSmsSent?.();
      } else {
        const error = await res.json();
        alert("שליחה נכשלה: " + (error.error || "שגיאה לא ידועה"));
      }
    } catch (err) {
      setLoading(false);
      alert("שליחה נכשלה (שגיאת רשת)");
      console.error("SMS Error:", err);
    }
  };

  return (
    <div className="bg-white rounded shadow text-[12px]" dir="rtl">
      {/* כותרת אקורדיון */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="w-full border-b p-2.5 text-right flex items-center justify-between hover:bg-gray-50 transition cursor-pointer"
        title="פתח/סגור שליחת SMS"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <span
            className={`text-lg transform transition-transform duration-300 ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
          >
            {isOpen ? "−" : "+"}
          </span>
          <span className="text-sm font-semibold">שליחת SMS</span>
        </div>
      </button>

      {/* גוף האקורדיון */}
      {isOpen && (
        <div className="p-3">
          <form onSubmit={handleSendSms} className="space-y-3">
            <div>
              <label className="block mb-1 text-[11px] text-gray-700">
                מספר יעד
              </label>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="0521234567"
                className="border rounded w-full px-2 py-1 h-8 text-[12px]"
                required
                dir="rtl"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="block mb-1 text-[11px] text-gray-700">
                הודעה
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="הקלד את ההודעה שלך..."
                className="border rounded w-full px-2 py-1 text-[12px] leading-snug"
                rows={3}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 h-8 rounded cursor-pointer disabled:opacity-50 text-[12px]"
            >
              {loading ? "שולח..." : "שלח SMS"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
