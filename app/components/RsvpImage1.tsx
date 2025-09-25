"use client";

import { useState } from "react";
import ImageUploader from "./ImageUploader";
import RsvpView from "./RsvpView";
import type { EventDetails, Guest } from "../types/types";

type Props = {
  event: EventDetails | null;
  guest: Guest | null;
  onUpdate: (updatedEvent: EventDetails) => void;
};

const RsvpImage = ({ event, guest, onUpdate }: Props) => {
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // ✅ עדכון תמונה במסד הנתונים
  const handleUploadSuccess = async (url: string, path: string) => {
    if (!event) return;
    setSaving(true);

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...event,
          imageUrl: url,
          imagePath: path,
        }),
      });

      const updated = await res.json();

      if (!res.ok) {
        console.error("❌ Error saving updated image URL");
        alert("שגיאה בשמירת התמונה");
      } else {
        onUpdate(updated);
      }
    } catch (err) {
      console.error("Error updating event image:", err);
      alert("שגיאה כללית");
    } finally {
      setSaving(false);
    }
  };

  // ✅ מיפוי תמונת ברירת מחדל לפי סוג אירוע
  const defaultImageMap: Record<string, string> = {
    חתונה: "/images/wedding-3d.jpg",
    "בר מצווה": "/images/jewish.jpg",
    "בת מצווה": "/images/birthday-3d.jpg",
    "יום הולדת": "/images/birthday-3d.jpg",
    "אירוע עסקי": "/images/buisiness-3d.jpg",
    "ברית/ה": "/images/baby-3d.jpg",
  };

  const imageToShow =
    event?.imageUrl ||
    (event?.eventType ? defaultImageMap[event.eventType] : null);

  return (
    <div
      className="bg-white p-1 rounded-2xl max-w-5xl mx-auto w-full mb-1"
      dir="rtl"
    >
      <div className="max-w-5xl mx-auto w-full" dir="rtl">
        {/* ================= HEADER של הסקשן ================= */}
        <div
          onClick={() => setIsOpen(!isOpen)}
          style={{ cursor: "pointer" }}
          className={`w-full border border-gray-300 rounded-md shadow p-2 mb-0 
            text-blue-600 transition-all duration-300 
            ${isOpen ? "border-b-4 border-blue-500" : ""} 
            grid grid-cols-1 md:grid-cols-[180px_1fr_160px] gap-4 items-start`}
        >
          {/* טור 1 – כותרת */}
          <div className="flex flex-row items-center gap-2">
            <div
              className={`text-base transform transition-transform duration-300 ${
                isOpen ? "rotate-180" : "rotate-0"
              }`}
            >
              {isOpen ? "−" : "+"}
            </div>
            <div className="font-bold text-blue-600 text-base min-w-[150px]">
              אישור הגעה
            </div>
          </div>

          {/* טור 2 – תוכן (תקציר או פירוט מלא) */}
          <div className="w-full">
            {/* כשהסקשן סגור */}
            {!isOpen && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-2 text-sm text-gray-700 font-semibold flex flex-col md:flex-row items-center gap-4 text-center md:text-right w-full mx-auto justify-center">
                <div>לחץ כאן כדי לראות כיצד יראה אישור ההזמנה</div>
                <div className="w-[80px] h-[60px] rounded border overflow-hidden flex items-center justify-center bg-gray-100">
                  {event && imageToShow ? (
                    <img
                      src={imageToShow}
                      alt="תמונת האירוע"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-gray-400">אין תמונה</span>
                  )}
                </div>
              </div>
            )}

            {/* כשהסקשן פתוח ואין אירוע */}
            {isOpen && !event && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 shadow-sm text-center text-sm text-red-600 font-semibold w-full">
                <h1>כדי להמשיך לחץ על הכפתור צור אירוע חדש</h1>
              </div>
            )}

            {/* כשהסקשן פתוח ויש אירוע */}
            {isOpen && event && (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-700 font-semibold  text-center">
                תצוגה מקדימה של אישור הזמנה
              </div>
            )}
          </div>

          {/* טור 3 – העלאת תמונה */}
          {event && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-start justify-end md:justify-center "
            >
              <ImageUploader
                currentImageUrl={event.imageUrl}
                currentImagePath={event.imagePath}
                onUploadSuccess={handleUploadSuccess}
              />
            </div>
          )}
        </div>
        {/* =============== סוף HEADER של הסקשן =============== */}

        {/* ================= תוכן נפתח ================= */}
        {isOpen && (
          <div className="flex flex-col justify-center mt-4">
            {event && (
              <>
                {saving && (
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    שומר תמונה...
                  </p>
                )}

                {/* תצוגת ההזמנה */}
                {guest && (
                  <RsvpView event={event} guest={guest} readOnly={true} />
                )}
              </>
            )}
          </div>
        )}
        {/* =============== סוף תוכן נפתח =============== */}
      </div>
    </div>
  );
};

export default RsvpImage;
