"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  guestId: string;
  guestName: string;
  currentStatus: string;
  initialCount?: number;
  readOnly?: boolean;
};

export default function RsvpForm({
  guestId,
  guestName,
  currentStatus,
  initialCount = 1,
  readOnly = false,
}: Props) {
  const [status, setStatus] = useState(currentStatus);
  const [count, setCount] = useState(initialCount);
  const [message, setMessage] = useState("");

  // אם המשתמש עובר ל"לא בא"/"אולי" – מצמצמים את count ל-1 (UI בלבד)
  useEffect(() => {
    if (status !== "בא") setCount(1);
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;

    const res = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestId,
        status,
        count: status === "בא" ? count : 0,
      }),
    });

    const result = await res.json();
    if (result.success) {
      setMessage("🎉 התשובה התקבלה בהצלחה, תודה!");
    } else {
      setMessage("שגיאה בשליחה. נסו שוב מאוחר יותר.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      dir="rtl"
      className="
        max-w-md mx-auto bg-[#f9f1e7] border border-[#e7d3b8]
        p-2 rounded-xl shadow text-right font-serif text-[#4b2e1e] 
      "
    >
      {/* כותרות – קומפקטי */}
      <p className="text-xl text-center mb-1">שלום {guestName}!</p>
      <p className="text-sm text-center mb-1">האם תאשר/י הגעה?</p>

      {/* שורת סטטוס – “מס' משתתפים” ליד “כן” ורק אם “בא” */}
      <div className="flex flex-col  items-start gap-2 mb-0.5 mr-2 text-sm">
        {/* כן (בא) */}
        <label className="inline-flex items-center gap-2">
          <input
            type="radio"
            name="status"
            value="בא"
            checked={status === "בא"}
            onChange={() => setStatus("בא")}
            className="accent-[#b6653b]"
            disabled={readOnly}
          />
          <span>כן</span>

          {status === "בא" && (
            <span className="inline-flex items-center gap-1 ms-2">
              <span className="text-xs text-gray-600">מס&apos; משתתפים</span>
              <input
                type="number"
                min={1}
                className="w-14 p-1 border border-[#e7d3b8] rounded text-right text-xs text-gray-800"
                value={count}
                onChange={(e) =>
                  setCount(Math.max(1, Number(e.target.value || 1)))
                }
                disabled={readOnly}
              />
            </span>
          )}
        </label>

        {/* לא (לא בא) */}
        <label className="inline-flex items-center gap-2">
          <input
            type="radio"
            name="status"
            value="לא בא"
            checked={status === "לא בא"}
            onChange={() => setStatus("לא בא")}
            className="accent-[#b6653b]"
            disabled={readOnly}
          />
          <span>לא</span>
        </label>

        {/* אולי */}
        <label className="inline-flex items-center gap-2 mb-2">
          <input
            type="radio"
            name="status"
            value="אולי"
            checked={status === "אולי"}
            onChange={() => setStatus("אולי")}
            className="accent-[#b6653b]"
            disabled={readOnly}
          />
          <span>אולי</span>
        </label>
      </div>

      <button
        type="submit"
        style={{ cursor: "pointer" }}
        className={`w-full text-white py-2 rounded-2xl shadow transition
    ${
      readOnly
        ? "bg-gray-300 cursor-not-allowed opacity-70"
        : "bg-[#b6653b] hover:bg-[#a35630] focus:outline-none focus:ring-2 focus:ring-[#b6653b]/40"
    }`}
        disabled={readOnly}
      >
        שלח אישור
      </button>

      {/* {readOnly && (
        <p className="text-xs text-center text-gray-500 mt-3">
          אינך יכול לשלוח אישור במצב תצוגה בלבד.
        </p>
      )} */}

      {message && (
        <p className="text-green-700 mt-3 text-center font-semibold text-sm">
          {message}
        </p>
      )}
    </form>
  );
}
