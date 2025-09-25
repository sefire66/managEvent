"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useEffect, useState } from "react";
import type { EventDetails } from "../types/types";
import { Button } from "./ui/button";
import EventDetailsFields from "./EventDetailsFields";

interface EditEventDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  details: EventDetails;
  onSave: (updated: EventDetails) => void;
}

export default function EditEventDetailsDialog({
  open,
  onClose,
  details,
  onSave,
}: EditEventDetailsDialogProps) {
  const [editedDetails, setEditedDetails] = useState<EventDetails>(details);
  console.log("🧩 EditEventDetailsDialog loaded. open =", open); // ← שים פה
  // console.log("🧩 onSave prop is:", typeof onSave);

  useEffect(() => {
    if (open) {
      setEditedDetails(details);
    }
  }, [open, details]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setEditedDetails((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[500px] bg-gray-50 rounded-xl shadow p-4">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-blue-700 text-center">
            עריכת פרטי האירוע
          </DialogTitle>
        </DialogHeader>

        <div
          className="flex flex-col items-center justify-center gap-3 mt-4   max-w-[500px] "
          dir="rtl"
        >
          <EventDetailsFields details={editedDetails} onChange={handleChange} />
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            ביטול
          </Button>

          <Button
            onClick={() => {
              console.log("🟡 Save button clicked!");
              alert("נלחץ שמור"); // ← סימן ויזואלי מיידי
              onSave(editedDetails);
            }}
          >
            שמור
          </Button>

          {/* <Button onClick={() => onSave(editedDetails)}>שמור</Button> */}
        </div>
      </DialogContent>
    </Dialog>
  );
}
