"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useState, useMemo } from "react";
import type { EventDetails } from "../types/types";
import { Button } from "./ui/button";
import EventDetailsFields from "./EventDetailsFields";
import { useSession } from "next-auth/react";
import { requiredFieldsMap } from "@/lib/requiredFieldsMap";

interface NewEventDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (newEvent: EventDetails) => void;
}

const defaultEventDetails: EventDetails = {
  eventType: "",
  brideFirst: "",
  brideLast: "",
  groomFirst: "",
  groomLast: "",
  date: "",
  time: "",
  venue: "",
  address: "",
};

// 🟢 טבלת שדות חובה לפי סוג אירוע (ללא שינוי)
// const requiredFieldsMap: Record<string, (keyof EventDetails)[]> = {
//   חתונה: [
//     "brideFirst",
//     "brideLast",
//     "groomFirst",
//     "groomLast",
//     "date",
//     "time",
//     "venue",
//     "address",
//   ],
//   "בר מצווה": ["groomFirst", "groomLast", "date", "time", "venue", "address"],
//   "בת מצווה": ["brideFirst", "brideLast", "date", "time", "venue", "address"],
//   "יום הולדת": ["brideFirst", "brideLast", "date", "venue", "time", "address"],
//   "אירוע עסקי": ["brideFirst", "date", "venue", "time", "address"],
// };

export default function NewEventDialog({
  open,
  onClose,
  onCreate,
}: NewEventDialogProps) {
  const [newEvent, setNewEvent] = useState<EventDetails>(defaultEventDetails);
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  // ✅ הודעת שגיאה מקומית לתאריך
  const [dateError, setDateError] = useState<string>("");

  // ✅ מחרוזת "היום" ל-min של אינפוט תאריך (YYYY-MM-DD, לפי זמן מקומי)
  const todayStr = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }, []);

  // 🔴 האם שדה מסוים הוא חובה? (ללא שינוי)
  const isRequired = (field: string) => {
    const required = requiredFieldsMap[newEvent.eventType || ""];
    return required?.includes(field as keyof EventDetails) ?? false;
  };

  // ✅ האם כל השדות הדרושים מולאו? (ללא שינוי)
  const isFormValid = () => {
    const requiredFields = requiredFieldsMap[newEvent.eventType || ""] || [];
    return requiredFields.every(
      (field) => newEvent[field]?.toString().trim() !== ""
    );
  };

  // ✅ בודק אם תאריך עבר (YYYY-MM-DD) — נשאר אצלך, משתמש בו
  const isPastDate = (yyyyMmDd: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) return false;
    const [y, m, d] = yyyyMmDd.split("-").map(Number);
    const picked = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return picked < today;
  };

  // ✅ שינוי נקודתי: חוסם תאריך עבר ומציג הודעה. שדות אחרים — ללא שינוי.
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    // טיפול רק בתאריך
    if (name === "date") {
      if (value && isPastDate(value)) {
        setDateError("התאריך שנבחר כבר עבר. אנא בחר תאריך עתידי.");
        return; // לא מעדכן state
      }
      // תאריך תקין או ריק → מנקה הודעה (אם תרצה לא לאפשר ריק, אפשר לשנות כאן)
      setDateError("");
    }

    setNewEvent((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!session?.user?.email) return alert("User not logged in");
    setLoading(true);

    // 🔐 בדיקה חוזרת לפני שליחה: אם התאריך עבר — חסימה
    if (newEvent.date && isPastDate(newEvent.date)) {
      alert("התאריך שנבחר כבר עבר. אנא בחר תאריך עתידי.");
      setLoading(false);
      return;
    }

    // בדיקת שדות חובה (ללא שינוי)
    const requiredFields = requiredFieldsMap[newEvent.eventType || ""] || [];
    const missingFields = requiredFields.filter(
      (field) => !newEvent[field as keyof EventDetails]
    );

    if (missingFields.length > 0) {
      alert("אנא מלא את כל שדות החובה לפני המשך");
      setLoading(false);
      return;
    }

    const payload = { ...newEvent, ownerEmail: session.user.email };

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const createdEvent = await response.json();
        onCreate(createdEvent);
        setNewEvent(defaultEventDetails);
      } else {
        const error = await response.json();
        alert(error.error || "אירעה שגיאה ביצירת האירוע");
      }
    } catch (err) {
      console.error("Error creating event:", err);
      alert("שגיאה בשרת");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="w-[420px] max-w-[400px] max-h-[90vh] bg-gray-50 rounded-xl shadow p-4">
          <div className="overflow-y-auto max-h-[70vh]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-green-700 text-center mb-1">
                יצירת אירוע חדש
              </DialogTitle>
            </DialogHeader>

            {/* ✅ מעבירים minDate + dateError לשדה התאריך בקומפוננטת השדות */}
            <EventDetailsFields
              details={newEvent}
              onChange={handleChange}
              isRequired={isRequired}
              minDate={todayStr} // ← הוסף prop זה בקומפוננטת EventDetailsFields לשדה ה-date
              dateError={dateError} // ← הצג הודעה מתחת לשדה התאריך שם
            />

            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                ביטול
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !isFormValid() || !newEvent.eventType}
              >
                {loading ? "שולח..." : "צור"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🔔 מודאל שגיאה גלובלי לתאריך */}
      <Dialog open={!!dateError} onOpenChange={(o) => !o && setDateError("")}>
        <DialogContent className="max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle className="text-red-600 text-right">
              תאריך לא תקין
            </DialogTitle>
          </DialogHeader>

          <p className="text-right">
            התאריך שנבחר כבר עבר. אנא בחר תאריך עתידי.
          </p>

          <div className="flex justify-end mt-3">
            <Button onClick={() => setDateError("")}>הבנתי</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
