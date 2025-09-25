"use client";

import { useEffect, useState } from "react";

type PackageType = {
  _id: string;
  name: string;
  price: number;
  smsAmount: number;
};

export default function PackageManager() {
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false); // מצב אקורדיון
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/packages")
      .then((res) => res.json())
      .then(setPackages)
      .catch(console.error);
  }, []);

  const handleUpdate = async (pkg: PackageType) => {
    setSavingId(pkg._id);
    try {
      const res = await fetch(`/api/packages/${pkg._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: pkg.price, smsAmount: pkg.smsAmount }),
      });

      if (res.ok) {
        alert("החבילה עודכנה בהצלחה");
      } else {
        const error = await res.json();
        alert("העדכון נכשל: " + (error.error || "Unknown error"));
      }
    } catch (e) {
      alert("העדכון נכשל");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="bg-white rounded shadow text-[12px]" dir="rtl">
      {/* כותרת אקורדיון */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="w-full border-b p-2.5 text-right flex items-center justify-between hover:bg-gray-50 transition cursor-pointer"
        title="פתח/סגור ניהול חבילות"
      >
        <div className="flex items-center gap-2">
          <span
            className={`text-lg transform transition-transform duration-300 ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
          >
            {isOpen ? "−" : "+"}
          </span>
          <span className="text-sm font-semibold">ניהול חבילות</span>
        </div>

        <span className="text-[11px] text-gray-600">
          סה״כ חבילות: <b>{packages.length}</b>
        </span>
      </button>

      {/* גוף האקורדיון */}
      {isOpen && (
        <div className="p-3">
          <div className="overflow-x-auto">
            <table className="w-full border mb-4 text-[14px] font-bold leading-tight">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-1.5 text-right whitespace-nowrap">
                    שם חבילה
                  </th>
                  <th className="border p-1.5 text-right whitespace-nowrap">
                    מחיר
                  </th>
                  <th className="border p-1.5 text-right whitespace-nowrap">
                    כמות SMS
                  </th>
                  <th className="border p-1.5 text-right whitespace-nowrap">
                    פעולה
                  </th>
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg) => (
                  <tr key={pkg._id} className="align-middle">
                    <td className="border p-1.5 whitespace-nowrap">
                      {pkg.name}
                    </td>
                    <td className="border p-1.5 whitespace-nowrap">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min={0}
                        value={pkg.price}
                        onChange={(e) =>
                          setPackages((prev) =>
                            prev.map((p) =>
                              p._id === pkg._id
                                ? { ...p, price: Number(e.target.value) }
                                : p
                            )
                          )
                        }
                        className="border rounded px-1 py-1 h-7 w-24 text-right"
                        title="מחיר החבילה"
                      />
                    </td>
                    <td className="border p-1.5 whitespace-nowrap">
                      <input
                        type="number"
                        inputMode="numeric"
                        step="1"
                        min={0}
                        value={pkg.smsAmount}
                        onChange={(e) =>
                          setPackages((prev) =>
                            prev.map((p) =>
                              p._id === pkg._id
                                ? { ...p, smsAmount: Number(e.target.value) }
                                : p
                            )
                          )
                        }
                        className="border rounded px-1 py-1 h-7 w-24 text-right"
                        title="מספר ההודעות בחבילה"
                      />
                    </td>
                    <td className="border p-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleUpdate(pkg)}
                        className="px-2.5 py-1 h-7 rounded bg-blue-600 text-white hover:bg-blue-700 text-[12px] cursor-pointer disabled:opacity-50"
                        disabled={savingId === pkg._id}
                        title="עדכון החבילה"
                      >
                        {savingId === pkg._id ? "מעדכן…" : "עדכן"}
                      </button>
                    </td>
                  </tr>
                ))}

                {packages.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-3 text-center text-gray-500">
                      אין חבילות להצגה.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* הערה קטנה/עזר (אופציונלי) */}
          <div className="text-[11px] text-gray-500">
            טיפ: אפשר להקטין/להגדיל את הערכים עם חיצי המקלדת בתוך תיבות המספר.
          </div>
        </div>
      )}
    </div>
  );
}
