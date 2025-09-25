"use client";

import { useState } from "react";

type Props = {
  guestId: string;
  guestName: string;
  currentStatus: string;
  initialCount?: number;
};

export default function RsvpForm({
  guestId,
  guestName,
  currentStatus,
  initialCount = 1,
}: Props) {
  const [status, setStatus] = useState(currentStatus);
  const [count, setCount] = useState(initialCount);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      className="max-w-md mx-auto bg-[#f9f1e7] border border-[#e7d3b8] p-6 rounded-xl shadow text-right font-serif text-[#4b2e1e]"
    >
      <h2 className="text-2xl font-bold text-center mb-4">אישור הגעה</h2>
      <p className="text-lg text-center mb-2">שלום {guestName}!</p>
      <p className="text-lg text-center mb-6">האם תאשר/י הגעה?</p>

      <div className="space-y-3 mb-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="status"
            value="בא"
            checked={status === "בא"}
            onChange={() => setStatus("בא")}
            className="accent-[#b6653b]"
          />
          כן
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="status"
            value="לא בא"
            checked={status === "לא בא"}
            onChange={() => setStatus("לא בא")}
            className="accent-[#b6653b]"
          />
          לא
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="status"
            value="אולי"
            checked={status === "אולי"}
            onChange={() => setStatus("אולי")}
            className="accent-[#b6653b]"
          />
          אולי
        </label>
      </div>

      {status === "בא" && (
        <>
          <label className="block mb-2 font-medium">מספר משתתפים:</label>
          <input
            type="number"
            min={1}
            className="w-full p-2 border border-[#e7d3b8] rounded text-right"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </>
      )}

      <button
        type="submit"
        className="w-full mt-6 bg-[#b6653b] text-white py-2 rounded shadow hover:bg-[#a35630] transition"
      >
        שלח אישור
      </button>

      {message && (
        <p className="text-green-700 mt-4 text-center font-semibold">
          {message}
        </p>
      )}
    </form>
  );
}
