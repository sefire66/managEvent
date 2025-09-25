"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Guest } from "../types/types";
import { useState, useEffect } from "react";

interface EditGuestDialogProps {
  guest: Guest | null;
  onClose: () => void;
  onSave: (updatedGuest: Guest) => void;
}

const EditGuestDialog = ({ guest, onClose, onSave }: EditGuestDialogProps) => {
  const [editedGuest, setEditedGuest] = useState<Guest | null>(guest);
  const [phoneError, setPhoneError] = useState(false);

  useEffect(() => {
    setEditedGuest(guest);
    setPhoneError(false);
  }, [guest]);

  const handleChange = (field: keyof Guest, value: string | number) => {
    if (!editedGuest) return;
    const updated = { ...editedGuest, [field]: value };
    setEditedGuest(updated);

    if (field === "phone") {
      const isValid = /^05\d{8}$/.test(String(value));
      setPhoneError(!isValid);
    }
  };

  const handleSave = () => {
    if (editedGuest && !phoneError) {
      onSave({ ...editedGuest });
      onClose();
    }
  };

  return (
    <Dialog open={!!guest} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>עריכת אורח</DialogTitle>
        </DialogHeader>

        {editedGuest && (
          <div className="space-y-3 text-right">
            <div>
              <label>שם:</label>
              <Input
                value={editedGuest.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </div>

            <div>
              <label>טלפון:</label>
              <Input
                value={editedGuest.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className={phoneError ? "border-red-500" : ""}
              />
              {phoneError && (
                <p className="text-red-600 text-sm">מספר טלפון לא תקין</p>
              )}
            </div>

            <div>
              <label>סטטוס:</label>
              <select
                value={editedGuest.status}
                onChange={(e) => handleChange("status", e.target.value)}
                className="w-full border rounded px-2 py-1"
              >
                <option value="לא ענה">לא ענה</option>
                <option value="בא">בא</option>
                <option value="לא בא">לא בא</option>
                <option value="אולי בא">אולי בא</option>
              </select>
            </div>

            <div>
              <label>מס׳ משתתפים:</label>
              <Input
                type="number"
                value={editedGuest.count ?? ""}
                onChange={(e) =>
                  handleChange("count", parseInt(e.target.value) || 0)
                }
              />
            </div>

            <div>
              <label>שולחן:</label>
              <Input
                value={editedGuest.table}
                onChange={(e) => handleChange("table", e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={onClose}>
                ביטול
              </Button>
              <Button onClick={handleSave} disabled={phoneError}>
                שמור
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditGuestDialog;
