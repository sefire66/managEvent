"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useEffect, useMemo, useState, type FocusEvent } from "react";
import type { EventDetails } from "../types/types";
import { Button } from "./ui/button";
import EventDetailsFields from "./EventDetailsFields";
import { requiredFieldsMap } from "@/lib/requiredFieldsMap";

interface EditEventDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  details: EventDetails;
  onSave: (updated: EventDetails) => void;
}

// 🟢 same centralized required fields map as in NewEventDialog
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

// 🔴 past-date checker (same behavior you used)
const isPastDate = (yyyyMmDd: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) return false;
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const picked = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return picked < today;
};

export default function EditEventDetailsDialog({
  open,
  onClose,
  details,
  onSave,
}: EditEventDetailsDialogProps) {
  const [editedDetails, setEditedDetails] = useState<EventDetails>(details);

  // local date error (like NewEventDialog)
  const [dateError, setDateError] = useState<string>("");
  const [lastValidDate, setLastValidDate] = useState<string>(
    details.date || ""
  );

  // yyyy-mm-dd for <input type="date" min=...>
  const todayStr = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }, []);

  // (optional) constrain max if you want parity with your previous code
  const MAX_DATE_STR = "2100-12-31";

  // Normalize to ISO if you want to keep internal consistency
  const isValidYMD = (yStr: string, mStr: string, dStr: string): boolean => {
    if (!/^\d{4}$/.test(yStr)) return false;
    const y = Number(yStr),
      m = Number(mStr),
      d = Number(dStr);
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const dt = new Date(y, m - 1, d);
    return (
      dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
    );
  };

  const normalizeToISO = (input: string): string | null => {
    const trimmed = input.trim();

    // ISO: YYYY-MM-DD
    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
      const [, y, m, d] = iso;
      return isValidYMD(y, m, d) ? `${y}-${m}-${d}` : null;
    }

    // DMY: DD/MM/YYYY or DD-MM-YYYY
    const dmy = trimmed.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
    if (dmy) {
      const [, d, m, y] = dmy;
      return isValidYMD(y, m, d) ? `${y}-${m}-${d}` : null;
    }

    return null;
  };

  // 🔴 isRequired helper (parity with NewEventDialog)
  const isRequired = (field: string) => {
    const required = requiredFieldsMap[editedDetails.eventType || ""];
    return required?.includes(field as keyof EventDetails) ?? false;
  };

  // ✅ exact same “enable Save” logic as NewEventDialog
  const isFormValid = () => {
    const requiredFields =
      requiredFieldsMap[editedDetails.eventType || ""] || [];
    return requiredFields.every(
      (field) => editedDetails[field]?.toString().trim() !== ""
    );
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === "date") {
      // block past dates (same as NewEventDialog)
      if (value && isPastDate(value)) {
        setDateError("התאריך שנבחר כבר עבר. אנא בחר תאריך עתידי.");
        return; // do not update state
      }
      setDateError("");
    }

    setEditedDetails((prev) => ({ ...prev, [name]: value }));
  };

  // Optional: keep your blur normalization (store back ISO if valid)
  const handleDateBlur = (e: FocusEvent<HTMLInputElement>) => {
    if (e.target.name !== "date") return;
    const raw = e.target.value.trim();
    if (!raw) return;

    const normalized = normalizeToISO(raw);
    if (!normalized) {
      setDateError(
        "תאריך לא תקין. הזן YYYY-MM-DD או DD/MM/YYYY (שנה: 4 ספרות)."
      );
      setEditedDetails((prev) => ({ ...prev, date: lastValidDate }));
      return;
    }
    if (isPastDate(normalized)) {
      setDateError("התאריך שנבחר כבר עבר. אנא בחר תאריך עתידי.");
      setEditedDetails((prev) => ({ ...prev, date: lastValidDate }));
      return;
    }

    setEditedDetails((prev) => ({ ...prev, date: normalized }));
    setLastValidDate(normalized);
    setDateError("");
  };

  const handleSave = () => {
    // block invalid date
    if (editedDetails.date && isPastDate(editedDetails.date)) {
      alert("התאריך שנבחר כבר עבר. אנא בחר תאריך עתידי.");
      return;
    }

    // block missing required fields (same as NewEventDialog)
    const requiredFields =
      requiredFieldsMap[editedDetails.eventType || ""] || [];
    const missingFields = requiredFields.filter(
      (field) => !editedDetails[field as keyof EventDetails]
    );
    if (missingFields.length > 0) {
      alert("אנא מלא את כל שדות החובה לפני המשך");
      return;
    }

    // optional: normalize date to ISO before save
    let next: EventDetails = editedDetails;
    if (editedDetails.date) {
      const normalized = normalizeToISO(editedDetails.date);
      if (!normalized || isPastDate(normalized)) {
        alert("התאריך שנבחר כבר עבר או אינו תקין.");
        return;
      }
      if (normalized !== editedDetails.date) {
        next = { ...editedDetails, date: normalized };
        setEditedDetails(next);
      }
    }

    onSave(next);
  };

  useEffect(() => {
    if (open) {
      setEditedDetails(details);
      setDateError("");
      setLastValidDate(details.date || "");
    }
  }, [open, details]);

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="w-[480px] max-w-[480px] bg-gray-50 rounded-xl shadow p-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-blue-700 text-center">
              עריכת פרטי האירוע
            </DialogTitle>
          </DialogHeader>

          <div
            className="flex flex-col items-center justify-center gap-3 mt-4 max-w-[500px]"
            dir="rtl"
          >
            <EventDetailsFields
              details={editedDetails}
              onChange={handleChange}
              // optional parity with NewEventDialog (if your fields component uses it)
              isRequired={isRequired}
              minDate={todayStr}
              maxDate={MAX_DATE_STR}
              dateError={dateError}
              onDateBlur={handleDateBlur}
            />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => onClose()}>
              ביטול
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !!dateError || !isFormValid() || !editedDetails.eventType
              }
            >
              שמור
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* same lightweight date error modal as your NewEventDialog */}
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
