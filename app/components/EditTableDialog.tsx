import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import type { Table, Guest } from "../types/types";

interface EditTableDialogProps {
  table: Table | null;
  onClose: () => void;
  onSave: (table: Table) => void;
  onDelete: (number: string) => void;
  guests: Guest[];
  isNew?: boolean;
  existingTables: Table[]; // ← חובה לוולידציה
}

export default function EditTableDialog({
  table,
  onClose,
  onSave,
  onDelete,
  guests,
  isNew = false,
  existingTables,
}: EditTableDialogProps) {
  const [editedTable, setEditedTable] = useState<Table | null>(table);
  const [numberError, setNumberError] = useState(false);
  const [seatsError, setSeatsError] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDuplicateNumber, setIsDuplicateNumber] = useState(false);

  useEffect(() => {
    setEditedTable(table);
    setNumberError(false);
    setSeatsError(false);
    setIsDuplicateNumber(false);
  }, [table]);

  const handleChange = (field: keyof Table, value: string | number) => {
    if (!editedTable) return;

    const updated = { ...editedTable, [field]: value };
    setEditedTable(updated);

    if (field === "number") {
      const isValid =
        /^\d+$/.test(String(value)) && parseInt(String(value)) >= 1;
      setNumberError(!isValid);

      const numberExists = existingTables.some(
        (t) => t.number === String(value) && t.number !== table?.number
      );

      setIsDuplicateNumber(numberExists);
    }

    if (field === "totalSeats") {
      const isValid = !isNaN(Number(value)) && Number(value) >= 1;
      setSeatsError(!isValid);
    }
  };

  const handleSave = () => {
    if (editedTable && !numberError && !seatsError && !isDuplicateNumber) {
      onSave(editedTable);
      onClose();
    }
  };

  return (
    <>
      <Dialog open={!!editedTable} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isNew ? "הוספת שולחן" : "עריכת שולחן"}</DialogTitle>
          </DialogHeader>

          {editedTable && (
            <div className="space-y-4 text-right">
              <div>
                <label>מספר שולחן:</label>
                <Input
                  value={editedTable.number}
                  readOnly={!isNew} // ← נועל עריכה כשזה לא חדש
                  onChange={(e) => handleChange("number", e.target.value)}
                  className={`w-full rounded px-2 py-1 ${
                    numberError || isDuplicateNumber ? "border-red-500" : ""
                  }`}
                />
                {numberError && (
                  <p className="text-sm text-red-500">
                    יש להזין מספר חוקי (1 ומעלה)
                  </p>
                )}
                {isDuplicateNumber && !numberError && (
                  <p className="text-sm text-red-500">מספר זה כבר קיים</p>
                )}
              </div>

              <div>
                <label>מספר מקומות:</label>
                <Input
                  type="number"
                  value={editedTable.totalSeats}
                  onChange={(e) =>
                    handleChange("totalSeats", parseInt(e.target.value) || 0)
                  }
                  className={`w-full rounded px-2 py-1 ${
                    seatsError ? "border-red-500" : ""
                  }`}
                />
                {seatsError && (
                  <p className="text-sm text-red-500">
                    מספר מושבים חייב להיות 1 ומעלה
                  </p>
                )}
              </div>

              <div>
                <label>הערה:</label>
                <Input
                  value={editedTable.note || ""}
                  onChange={(e) => handleChange("note", e.target.value)}
                />
              </div>

              <div className="flex justify-between items-center pt-4">
                {!isNew &&
                  editedTable.number &&
                  (guests.some(
                    (guest) => guest.table === editedTable.number
                  ) ? (
                    <p className="text-sm text-red-500">
                      לא ניתן למחוק שולחן שיש בו אורחים.
                    </p>
                  ) : (
                    <Button
                      variant="destructive"
                      onClick={() => setConfirmDeleteOpen(true)}
                      className="text-sm"
                    >
                      מחק שולחן
                    </Button>
                  ))}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={onClose}>
                    ביטול
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={numberError || seatsError || isDuplicateNumber}
                  >
                    שמור
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">
              אישור מחיקת שולחן
            </DialogTitle>
          </DialogHeader>
          <p className="text-right text-sm text-gray-700">
            האם אתה בטוח שברצונך למחוק את השולחן? פעולה זו אינה ניתנת לשחזור.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteOpen(false)}
            >
              ביטול
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (editedTable) {
                  onDelete(editedTable.number);
                  setConfirmDeleteOpen(false);
                  onClose();
                }
              }}
            >
              מחק סופית
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
