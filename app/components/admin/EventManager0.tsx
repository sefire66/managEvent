"use client";

import { useEffect, useState } from "react";

type Event = {
  _id: string;
  eventType: string;
  ownerEmail: string;
  date: string;
  createdAt: string;
};

export default function EventManager() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    fetch("/api/events")
      .then((res) => res.json())
      .then((data) => setEvents(data))
      .catch(console.error);
  }, []);

  const handleDeleteEvent = async (id: string) => {
    if (
      !confirm("האם אתה בטוח שברצונך למחוק את האירוע וכל הנתונים הקשורים אליו?")
    )
      return;

    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });

    if (res.ok) {
      alert("האירוע וכל הנתונים הקשורים נמחקו בהצלחה.");
      setEvents((prev) => prev.filter((e) => e._id !== id));
    } else {
      const error = await res.json();
      alert("שגיאה במחיקת האירוע: " + (error.error || "Unknown error"));
    }
  };

  return (
    <div className="p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-semibold mb-4">ניהול אירועים</h2>
      <div className="max-h-[60vh] overflow-y-auto">
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">שם האירוע</th>
              <th className="border p-2">אימייל הלקוח</th>
              <th className="border p-2">תאריך האירוע</th>
              <th className="border p-2">נוצר בתאריך</th>
              <th className="border p-2">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event._id}>
                <td className="border p-2">{event.eventType}</td>
                <td className="border p-2">{event.ownerEmail || "לא ידוע"}</td>
                <td className="border p-2">
                  {new Date(event.date).toLocaleDateString()}
                </td>
                <td className="border p-2">
                  {new Date(event.createdAt).toLocaleDateString()}
                </td>
                <td className="border p-2">
                  <button
                    onClick={() => handleDeleteEvent(event._id)}
                    className="text-red-600 underline"
                  >
                    מחק
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
