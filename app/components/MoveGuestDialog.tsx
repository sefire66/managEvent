import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

import TableSelector from "./TableSelector";
import { Guest, Table } from "../types/types";

interface MoveGuestModalProps {
  guest: Guest;
  tables: Table[];
  guests: Guest[];
  onClose: () => void;
  onMove: (guest: Guest, newTable: string) => void;
}

export default function MoveGuestModal({
  guest,
  tables,
  guests,
  onClose,
  onMove,
}: MoveGuestModalProps) {
  return (
    <Dialog open={!!guest} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>העבר אורח לשולחן אחר</DialogTitle>
        </DialogHeader>

        <div className="text-right space-y-3">
          <div>
            <span className="font-semibold">{guest.name}</span> — ×
            {guest.count || 1}
          </div>
          <div className="text-sm text-gray-600">
            שולחן נוכחי: {guest.table || "לא משויך"}
          </div>

          <div>
            <TableSelector
              tables={tables}
              guests={guests}
              selectedTableNumber={guest.table}
              onSelect={(tableNumber) => {
                onMove(guest, tableNumber);
                onClose();
              }}
            />
          </div>

          <button
            className="text-blue-600 text-sm mt-3 hover:underline"
            onClick={onClose}
          >
            ביטול
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
