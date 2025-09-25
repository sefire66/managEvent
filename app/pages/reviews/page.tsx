import React from "react";

export default function Reviews() {
  return (
    <div dir="rtl" className="flex flex-col items-center justify-center min-h-screen py-8">
      <h1 className="text-4xl font-bold mb-8">חוות דעת</h1>
      <div className="w-full max-w-2xl space-y-8">
        <div className="bg-white text-black rounded-lg shadow p-6">
          <p className="mb-2">"פלטפורמה מדהימה! הפכה את תכנון האירוע שלי לקל ומהנה."</p>
          <span className="font-semibold">- שרה ל.</span>
        </div>
        <div className="bg-white text-black rounded-lg shadow p-6">
          <p className="mb-2">"שירות מעולה ועיצוב יפהפה. ממליץ בחום!"</p>
          <span className="font-semibold">- דניאל ר.</span>
        </div>
        <div className="bg-white text-black rounded-lg shadow p-6">
          <p className="mb-2">"עזר לי לארגן הכל במקום אחד. אהבתי מאוד!"</p>
          <span className="font-semibold">- מאיה ט.</span>
        </div>
      </div>
    </div>
  );
}
