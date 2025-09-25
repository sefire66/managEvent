"use client";

import { useEffect, useMemo, useState } from "react";
import ImageUploader from "./ImageUploader";
import RsvpView from "./RsvpView";
import RsvpPreferencesPanel from "./RsvpPreferencesPanel";
import PreferencesSaveBar from "./PreferencesSaveBar";
import type { EventDetails, Guest, EventPreferences } from "../types/types";

type Props = {
  event: EventDetails | null;
  guest: Guest | null;
  onUpdate: (updatedEvent: EventDetails) => void;
};

const defaultPrefs: EventPreferences = {
  hideDetails: false,
  imageRatio: "auto",
};

const RsvpImage = ({ event, guest, onUpdate }: Props) => {
  const [savingImage, setSavingImage] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [saveError, setSaveError] = useState<string | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);

  // ====== העדפות (state לוקאלי) ======
  const [prefs, setPrefs] = useState<EventPreferences>(defaultPrefs);

  // סנכרון state כשמגיע אירוע חדש/רענון מהשרת
  useEffect(() => {
    if (!event?.preferences) {
      setPrefs(defaultPrefs);
    } else {
      setPrefs({
        hideDetails: !!event.preferences.hideDetails,
        imageRatio: event.preferences.imageRatio ?? "auto",
        version: event.preferences.version,
        updatedAt: event.preferences.updatedAt,
      });
    }
  }, [
    event?._id,
    event?.preferences?.hideDetails,
    event?.preferences?.imageRatio,
  ]);

  // בדיקת "מלוכלך" (Dirty) – האם יש שינוי ביחס לערכי האירוע
  const dirty = useMemo(() => {
    const base = event?.preferences ?? defaultPrefs;
    return (
      (base.hideDetails ?? false) !== (prefs.hideDetails ?? false) ||
      (base.imageRatio ?? "auto") !== (prefs.imageRatio ?? "auto")
    );
  }, [event?.preferences, prefs]);

  // ✅ שמירת העדפות לשרת (PATCH /api/events/:id/preferences)
  const handleSavePreferences = async () => {
    if (!event?._id) return;
    setSavingPrefs(true);
    setSaveError(undefined);

    try {
      const res = await fetch(`/api/events/${event._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hideDetails: prefs.hideDetails,
          imageRatio: prefs.imageRatio,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSaveError(data?.error || "שגיאה בשמירת ההעדפות");
        return;
      }

      // עדכון האירוע אצל ההורה + state לוקאלי (כולל updatedAt)
      const updatedPreferences: EventPreferences = data.preferences ?? {
        hideDetails: prefs.hideDetails,
        imageRatio: prefs.imageRatio,
        version: 1,
        updatedAt: new Date().toISOString(),
      };

      onUpdate({
        ...(event as EventDetails),
        preferences: updatedPreferences,
      });

      setPrefs(updatedPreferences);
    } catch (err: any) {
      setSaveError(err?.message || "שגיאה כללית");
    } finally {
      setSavingPrefs(false);
    }
  };

  // ====== תמונה: שמירה/מחיקה (השארתי את הלוגיקה שלך) ======
  const handleUploadSuccess = async (url: string, path: string) => {
    if (!event) return;
    setSavingImage(true);

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
      setSavingImage(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!event) return;
    setSavingImage(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...event,
          imageUrl: null,
          imagePath: null,
        }),
      });

      const updated = await res.json();

      if (!res.ok) {
        console.error("❌ Error clearing image URL");
        alert("שגיאה במחיקת התמונה");
        return;
      }
      onUpdate(updated);
    } catch (err) {
      console.error("Error deleting event image:", err);
      alert("שגיאה כללית");
    } finally {
      setSavingImage(false);
    }
  };

  // ברירת תמונה לתצוגה מקדימה ב-header
  const defaultImageMap: Record<string, string> = {
    חתונה: "/images/wedding-3d.jpg",
    חינה: "/images/wedding-3d.jpg",
    "בר מצווה": "/images/jewish.jpg",
    "בת מצווה": "/images/birthday-3d.jpg",
    ברית: "/images/baby-3d.jpg",
    בריתה: "/images/baby-3d.jpg",
    "יום הולדת": "/images/birthday-3d.jpg",
    "אירוע עסקי": "/images/buisiness-3d.jpg",
  };
  const fallbackImage = "/images/wedding-3d.jpg";
  const cleanUrl = (event?.imageUrl ?? "").trim();
  const cleanType = (event?.eventType ?? "").trim();
  const imageToShow = cleanUrl || defaultImageMap[cleanType] || fallbackImage;

  return (
    <div
      className="bg-white p-0 rounded-2xl max-w-5xl mx-auto w-full my-1 transition-all hover:scale-[1.03] duration-300"
      dir="rtl"
    >
      <div className="max-w-5xl mx-auto w-full" dir="rtl">
        {/* ================= HEADER ================= */}
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full border border-gray-300 rounded-md shadow p-2 mb-0 
            text-blue-600 transition-all duration-300 cursor-pointer
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

          {/* טור 2 – תקציר/פירוט */}
          <div className="w-full">
            {!isOpen && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-2 text-sm text-gray-700 font-semibold flex flex-col md:flex-row items-center gap-4 text-center md:text-right w-full mx-auto justify-center">
                <div>לחץ כאן כדי לראות כיצד יראה אישור ההזמנה</div>
                <div className="w-[80px] h-[60px] rounded border overflow-hidden flex items-center justify-center bg-gray-100">
                  {event && imageToShow ? (
                    <img
                      src={imageToShow}
                      alt={`תמונת ${event.eventType ?? "אירוע"}`}
                      className="w-full h-full object-cover"
                      width={80}
                      height={60}
                    />
                  ) : (
                    <span className="text-xs text-gray-400">אין תמונה</span>
                  )}
                </div>
              </div>
            )}

            {isOpen && !event && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 shadow-sm text-center text-sm text-red-600 font-semibold w-full">
                <h1>כדי להמשיך לחץ על הכפתור צור אירוע חדש</h1>
              </div>
            )}

            {isOpen && event && (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-700 font-semibold text-center">
                תצוגה מקדימה של אישור הזמנה + אפשרויות עיצוב
              </div>
            )}
          </div>

          {/* טור 3 – העלאת תמונה */}
          {event && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-start justify-end md:justify-center"
            >
              <ImageUploader
                currentImageUrl={event.imageUrl}
                currentImagePath={event.imagePath}
                onUploadSuccess={handleUploadSuccess}
                onDelete={handleDeleteImage}
              />
            </div>
          )}
        </div>
        {/* =============== סוף HEADER =============== */}

        {/* ================= תוכן נפתח ================= */}
        {isOpen && event && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-[360px_1fr] gap-4">
            {/* צד ימין: פאנל העדפות + שמירה */}
            <div className="flex flex-col">
              <RsvpPreferencesPanel
                value={prefs}
                onChange={setPrefs}
                disabled={savingPrefs}
              />
              <PreferencesSaveBar
                dirty={dirty}
                saving={savingPrefs}
                error={saveError}
                lastSavedAt={prefs.updatedAt}
                onSave={handleSavePreferences}
              />
              {savingImage && (
                <p className="text-xs text-gray-500 mt-2">שומר תמונה…</p>
              )}
            </div>

            {/* צד שמאל: Preview */}
            <div className="flex flex-col items-center">
              {guest && (
                <RsvpView
                  event={event}
                  guest={guest}
                  readOnly={true}
                  // אם RsvpView עודכן לקבל design – נעביר מפה:
                  // @ts-ignore (הסר אם יש לך את הפרופ ב-RsvpView)
                  design={{
                    hideDetails: prefs.hideDetails,
                    imageRatio: prefs.imageRatio,
                  }}
                />
              )}
            </div>
          </div>
        )}
        {/* =============== סוף תוכן נפתח =============== */}
      </div>
    </div>
  );
};

export default RsvpImage;
