"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useState } from "react";
import type { EventDetails } from "../types/types";
import { Button } from "./ui/button";
import EventDetailsFields from "./EventDetailsFields";
import { useSession } from "next-auth/react";

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

const requiredFieldsForWedding = [
  "brideFirst",
  "brideLast",
  "groomFirst",
  "groomLast",
  "date",
  "venue",
];

export default function NewEventDialog({
  open,
  onClose,
  onCreate,
}: NewEventDialogProps) {
  const [newEvent, setNewEvent] = useState<EventDetails>(defaultEventDetails);
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  const isRequired = (field: string) =>
    newEvent.eventType === "חתונה" && requiredFieldsForWedding.includes(field);

  const isFormValid = () => {
    if (newEvent.eventType === "חתונה") {
      return requiredFieldsForWedding.every(
        (field) =>
          newEvent[field as keyof EventDetails]?.toString().trim() !== ""
      );
    }

    return !!newEvent.eventType; // לפחות סוג האירוע נבחר
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setNewEvent((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!session?.user?.email) return alert("User not logged in");
    setLoading(true);

    // בדיקת שדות חובה
    const missingFields = requiredFieldsForWedding.filter(
      (field) =>
        newEvent.eventType === "חתונה" && !newEvent[field as keyof EventDetails]
    );

    if (missingFields.length > 0) {
      alert("אנא מלא את כל שדות החובה לפני המשך");
      setLoading(false);
      return;
    }

    const payload = { ...newEvent, ownerEmail: session.user.email };
    console.log("נשלח לשרת:", payload);

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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[420px] max-w-[400px] max-h-[90vh] bg-gray-50 rounded-xl shadow p-4">
        <div className="overflow-y-auto max-h-[70vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-green-700 text-center">
              יצירת אירוע חדש
            </DialogTitle>
          </DialogHeader>

          {/* <div
            className="flex flex-col items-center justify-center gap-3 mt-1 max-w-[300px]"
            dir="rtl"           > */}
          <EventDetailsFields
            details={newEvent}
            onChange={handleChange}
            isRequired={isRequired} // ← חדש
          />
          {/* </div> */}

          <div className="flex justify-end  gap-2 mt-3">
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
  );
}
