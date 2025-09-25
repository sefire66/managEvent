import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Table, Guest } from "../types/types";
import { useState, useEffect } from "react";
import TableSelector from "./TableSelector";

interface EditGuestDialogProps {
  guest: Guest | null;
  onClose: () => void;
  onSave: (updatedGuest: Guest) => void;
  onDelete: (guestId: string) => void;
  tables: Table[]; // 🆕 רשימת שולחנות
  guests: Guest[]; // 🆕 כל האורחים (כדי לחשב תפוסים בשולחנות)
}

const EditGuestDialog = ({
  guest,
  onClose,
  onSave,
  onDelete,
  tables,
  guests,
}: EditGuestDialogProps) => {
  const [editedGuest, setEditedGuest] = useState<Guest | null>(guest);
  const [phoneError, setPhoneError] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isTableSelectorOpen, setIsTableSelectorOpen] = useState(false);

  useEffect(() => {
    setEditedGuest(guest);
    setPhoneError(false);
  }, [guest]);

  const handleChange = (field: keyof Guest, value: string | number) => {
    if (!editedGuest) return;

    let updated = { ...editedGuest, [field]: value };

    // אפס כמות ושולחן אם הסטטוס אינו "בא"
    if (field === "status" && value !== "בא") {
      updated.count = 0;
      updated.table = "";
    }

    setEditedGuest(updated);

    if (field === "status" && value == "בא") {
      updated.count = 1;
      updated.table = "";
    }

    setEditedGuest(updated);

    // בדיקת טלפון
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

  const handleDelete = () => {
    if (editedGuest) {
      const confirmed = window.confirm("האם אתה בטוח שברצונך למחוק את האורח?");
      if (confirmed) {
        onDelete(editedGuest._id);
        setConfirmDeleteOpen(false);
        onClose();
      }
    }
  };

  return (
    <>
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
                  <option value="אולי">אולי</option>
                </select>
              </div>

              <div>
                <label>מס׳ משתתפים:</label>
                <Input
                  type="number"
                  min={0}
                  value={editedGuest.count ?? ""}
                  onChange={(e) =>
                    handleChange("count", parseInt(e.target.value) || 0)
                  }
                  disabled={editedGuest.status !== "בא"}
                />
              </div>
              {/* ======    ==== הכנסת בחירת שולחן =============== */}
              {/* <div>
                <label>שולחן:</label>
                <Input
                  value={editedGuest.table}
                  onChange={(e) => handleChange("table", e.target.value)}
                />
              </div> */}

              <div>
                <label>שולחן:</label>
                <div
                  className={`border rounded px-2 py-1 bg-white text-right ${
                    editedGuest.status !== "בא"
                      ? "opacity-50 pointer-events-none"
                      : "cursor-pointer"
                  }`}
                  onClick={() => {
                    if (editedGuest.status === "בא") {
                      setIsTableSelectorOpen(true);
                    }
                  }}
                >
                  {editedGuest.table ? `${editedGuest.table}` : "בחר שולחן"}
                </div>

                {/* 🔽 Dialog עם TableSelector */}
                <Dialog
                  open={isTableSelectorOpen}
                  onOpenChange={setIsTableSelectorOpen}
                >
                  <DialogContent className="max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>בחר שולחן</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      <TableSelector
                        tables={tables}
                        guests={guests}
                        selectedTableNumber={editedGuest.table}
                        onSelect={(tableNumber) => {
                          handleChange("table", tableNumber);
                          setIsTableSelectorOpen(false);
                        }}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* End סוף בחירת שולחן  */}

              {/* ========Delete button=========== */}
              <div className="flex justify-between items-center pt-4">
                <Button
                  //  ===?????????????????? ask
                  variant="destructive"
                  onClick={() => setConfirmDeleteOpen(true)}
                  className="text-sm"
                >
                  מחק אורח
                </Button>
                {/* ============================= */}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={onClose}>
                    ביטול
                  </Button>
                  <Button onClick={handleSave} disabled={phoneError}>
                    שמור
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* =========================================================== */}

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">אישור מחיקת אורח</DialogTitle>
          </DialogHeader>
          <p className="text-right text-sm text-gray-700">
            האם אתה בטוח שברצונך למחוק את האורח? פעולה זו אינה ניתנת לשחזור.
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
                if (editedGuest) {
                  onDelete(editedGuest._id);
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
};

export default EditGuestDialog;
