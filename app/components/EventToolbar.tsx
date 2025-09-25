"use client";

import React from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import EventList from "./EventList";
import NewEventDialog from "./NewEventDialog";
import type { EventDetails } from "../types/types";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";

interface EventToolbarProps {
  details: EventDetails | null;
  setDetails: (details: EventDetails) => void;
  onDeleteEvent?: () => void;
  showNewEvent: boolean;
  setShowNewEvent: (show: boolean) => void;
}

export const EventToolbar = ({
  details,
  setDetails,
  onDeleteEvent,
  showNewEvent,
  setShowNewEvent,
}: EventToolbarProps) => {
  const [showEventList, setShowEventList] = React.useState(false);

  // ביטול אירוע
  const [showCancelDialog, setShowCancelDialog] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [confirmText, setConfirmText] = React.useState("");
  const [cancelLoading, setCancelLoading] = React.useState(false);

  // ✅ חדש: טעינת "החזר אירוע לפעילות"
  const [uncancelLoading, setUncancelLoading] = React.useState(false);

  const { data: session } = useSession();

  const handleSelectEvent = (event: EventDetails) => {
    setDetails(event);
    setShowEventList(false);
    console.log("אירוע נבחר:", event);
  };

  const handleCreateEvent = (newEvent: EventDetails) => {
    setDetails(newEvent);
    setShowNewEvent(false);
    console.log("אירוע נוצר:", newEvent);
  };

  // שליחת בקשת ביטול לשרת
  const confirmCancelEvent = async () => {
    if (!details?._id) return;

    const email = session?.user?.email;
    if (!email) {
      alert("לא נמצא אימייל משתמש (ownerEmail).");
      return;
    }

    setCancelLoading(true);
    try {
      const res = await fetch(`/api/events/${details._id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerEmail: email,
          reason: cancelReason || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "Cancel failed");
      }

      if (typeof data?.deletedScheduledCount === "number") {
        alert(`נמחקו ${data.deletedScheduledCount} תיזמוני SMS עתידיים.`);
      }

      const refreshedRes = await fetch(`/api/events/${details._id}`, {
        cache: "no-store",
      });
      if (!refreshedRes.ok) throw new Error("Failed to refetch event");
      const refreshed = await refreshedRes.json();

      setDetails(refreshed);

      setShowCancelDialog(false);
      setCancelReason("");
      setConfirmText("");
    } catch (e) {
      alert((e as Error).message || "שגיאה בביטול האירוע.");
      console.error(e);
    } finally {
      setCancelLoading(false);
    }
  };

  // ✅ חדש: החזרת אירוע לפעילות עם ספינר
  const handleUncancelEvent = async () => {
    if (!details?._id) return;
    const email = session?.user?.email;
    if (!email) {
      alert("לא נמצא אימייל משתמש (ownerEmail).");
      return;
    }

    setUncancelLoading(true);
    try {
      const res = await fetch(`/api/events/${details._id}/uncancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerEmail: email }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "שגיאה בהחזרת האירוע לפעילות");
      }

      const refreshedRes = await fetch(`/api/events/${details._id}`, {
        cache: "no-store",
      });
      if (!refreshedRes.ok) throw new Error("כשל ברענון נתוני האירוע");
      const refreshed = await refreshedRes.json();
      setDetails(refreshed);
    } catch (e) {
      alert((e as Error).message || "שגיאה בהחזרת האירוע לפעילות.");
      console.error(e);
    } finally {
      setUncancelLoading(false);
    }
  };

  return (
    <div className="mt-2 sm:mt-8 md:mt-6 xl:mt-4 mb-3 rounded" dir="rtl">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowEventList(true)}
        className="rounded-2xl mx-2"
        style={{ cursor: "pointer" }}
      >
        בחר ארוע קיים
      </Button>

      <Button
        className="rounded-2xl"
        variant="outline"
        size="sm"
        onClick={() => setShowNewEvent(true)}
        style={{ cursor: "pointer" }}
      >
        צור ארוע חדש
      </Button>

      {/* אם האירוע מבוטל — הצג כפתור החזר אירוע לפעילות עם ספינר בזמן טעינה */}
      {details?.isCanceled && (
        <Button
          variant="outline"
          size="sm"
          style={{ cursor: "pointer" }}
          onClick={handleUncancelEvent}
          disabled={uncancelLoading}
          aria-busy={uncancelLoading}
          className="ml-2 rounded-2xl inline-flex items-center gap-2"
        >
          {uncancelLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          החזר אירוע לפעילות
        </Button>
      )}

      {/* כפתור ביטול אירוע (מופיע תמיד כשיש אירוע; מנוטרל אם כבר מבוטל) */}
      {details && (
        <>
          <Button
            variant="destructive"
            size="sm"
            className="mx-2 rounded-2xl py-1"
            onClick={() => setShowCancelDialog(true)}
            disabled={details.isCanceled || cancelLoading}
            style={{ cursor: "pointer" }}
            aria-busy={cancelLoading}
          >
            {cancelLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                מבטל…
              </span>
            ) : (
              "בטל אירוע"
            )}
          </Button>

          {details.isCanceled && (
            <span className="ml-2 inline-block rounded-full bg-red-100 text-red-700 px-3 py-1 text-xs">
              אירוע בוטל
            </span>
          )}
        </>
      )}

      {/* מודאל: בחירת אירוע קיים */}
      <Dialog open={showEventList} onOpenChange={setShowEventList}>
        <DialogContent className="max-w-[600px] max-h-[80vh] overflow-y-auto bg-gray-50 rounded-xl shadow p-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-blue-700 text-center">
              בחירת ארוע קיים
            </DialogTitle>
          </DialogHeader>
          <EventList onSelect={handleSelectEvent} />
        </DialogContent>
      </Dialog>

      {/* מודאל: יצירת אירוע חדש */}
      <NewEventDialog
        open={showNewEvent}
        onClose={() => setShowNewEvent(false)}
        onCreate={handleCreateEvent}
      />

      {/* מודאל: ביטול אירוע */}
      <Dialog
        open={showCancelDialog}
        onOpenChange={(open) => {
          setShowCancelDialog(open);
          if (!open) {
            setCancelReason("");
            setConfirmText("");
          }
        }}
      >
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle>אישור ביטול אירוע</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-right">
            <p className="text-sm text-gray-700">
              פעולה זו תסמן את האירוע כ־<strong>בוטל</strong> ותעצור תיזמוני SMS
              עתידיים. אין מחיקה של אורחים/תמונות/טבלאות.
            </p>

            <label className="block text-sm">
              סיבה (אופציונלי):
              <input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full border rounded p-2 mt-1"
                placeholder="למשל: שיפוץ באולם"
              />
            </label>

            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-sm text-red-700">
                לצורך אישור, הקלד/י <strong>בוטל</strong> בתיבה:
              </p>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full border rounded p-2 mt-1"
                placeholder="בוטל"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(false)}
              >
                סגור
              </Button>
              <Button
                variant="destructive"
                onClick={confirmCancelEvent}
                disabled={cancelLoading || confirmText !== "בוטל"}
              >
                {cancelLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    מבטל…
                  </span>
                ) : (
                  "אשר ביטול"
                )}
              </Button>
            </div>

            {/* טיפ: אפשר להוסיף בהמשך כפתור "שליחת הודעת ביטול" מכאן ישירות */}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
