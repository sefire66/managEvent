"use client";

import { useState } from "react";

export default function TestSavePage() {
  const [result, setResult] = useState<string | null>(null);

  const handleSave = async () => {
    const res = await fetch("/api/payments/test", {
      method: "POST",
    });

    const data = await res.json();
    if (data.success) {
      setResult(`✅ נשמר למסד! כמות SMS חדשה: ${data.updatedSmsBalance}`);
    } else {
      setResult("❌ שגיאה בשמירה");
    }
  };

  return (
    <div className="p-10 text-center mt-16">
      <h2 className="text-2xl font-bold mb-4">בדיקת שמירה ועדכון SMS</h2>
      <button
        onClick={handleSave}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
      >
        שמור למסד הנתונים
      </button>

      {result && <p className="mt-4">{result}</p>}
    </div>
  );
}
