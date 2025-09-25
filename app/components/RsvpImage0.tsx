"use client";

import { useState } from "react";
import ImageUploader from "./ImageUploader";
import type { EventDetails } from "../types/types";

type Props = {
  event: EventDetails | null;
  onUpdate: (updatedEvent: EventDetails) => void;
};

const RsvpImage = ({ event, onUpdate }: Props) => {
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

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

  // קביעת תמונה להצגה
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
    <div className="bg-white p-1 rounded-2xl max-w-4xl mx-auto w-full mb-1">
      {/* כפתור פתיחה/סגירה */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full border border-gray-300 rounded-md shadow p-4 mb-2 text-blue-600 font-bold text-xl text-right transition-all duration-300 ${
          isOpen ? "border-b-4 border-blue-500" : ""
        }`}
        dir="rtl"
      >
        <div className="flex flex-row items-center gap-2">
          <div
            className={`text-2xl transform transition-transform duration-300 ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
          >
            {isOpen ? "−" : "+"}
          </div>
          <div className="min-w-[220px]">תמונת הארוע</div>

          {/* תצוגת תמונות לדוגמה אם אין אירוע כלל */}
          {!event && (
            <div className="flex flex-row flex-wrap items-start gap-4 p-2">
              {["wedding-3d", "birthday-3d", "buisiness-3d", "baby-3d"].map(
                (name) => (
                  <div
                    key={name}
                    className="w-[100px] h-[100px] overflow-hidden border rounded-lg"
                  >
                    <img
                      src={`/images/${name}.jpg`}
                      alt="תמונת הארוע"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )
              )}
            </div>
          )}

          {/* אם יש אירוע - מראים תמונה מתאימה (מועלת או דיפולטית) */}
          {event && imageToShow && (
            <div className="max-h-[100px] overflow-hidden rounded-lg border">
              <img
                src={imageToShow}
                alt="תמונת הארוע"
                className="w-[160px] h-[160px] object-cover rounded"
              />
            </div>
          )}
        </div>
      </button>

      {/* התראה כשאין סוג אירוע */}
      {isOpen && !event && (
        <div className="text-center bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-4 shadow-sm">
          <h2 className="text-lg font-semibold">
            יש לבחור סוג אירוע לפני המשך
          </h2>
          <p className="text-sm mt-1">
            לא ניתן להעלות תמונה או להמשיך מבלי להגדיר את סוג האירוע.
          </p>
        </div>
      )}

      {/* אפשרות העלאה אם יש אירוע */}
      {event && isOpen && (
        <>
          <ImageUploader
            currentImageUrl={event.imageUrl}
            currentImagePath={event.imagePath}
            onUploadSuccess={handleUploadSuccess}
          />
          {saving && (
            <p className="text-sm text-gray-500 mt-2 text-center">
              שומר תמונה...
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default RsvpImage;
