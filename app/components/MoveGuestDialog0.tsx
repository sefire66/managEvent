import React from "react";
import type { Guest, Table } from "../types/types";
import TableSelector from "./TableSelector";

interface MoveGuestDialogProps {
  guest: Guest;
  tables: Table[];
  guests: Guest[];
  onClose: () => void;
  onMove: (guest: Guest, newTableNumber: string) => void;
}

export default function MoveGuestDialog({
  guest,
  tables,
  guests,
  onClose,
  onMove,
}: MoveGuestDialogProps) {
  return (
    <div className="fixed inset-0  bg-black/30 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-bold text-center mb-4">העבר אורח</h2>

        <div className="text-sm mb-4">
          <div>
            <strong>שם:</strong> {guest.name}
          </div>
          <div>
            <strong>כמות:</strong> {guest.count || 1}
          </div>
          <div>
            <strong>שולחן נוכחי:</strong> {guest.table || "לא מוקצה"}
          </div>
        </div>

        <div className="mb-4">
          <TableSelector
            tables={tables}
            guests={guests}
            selectedTableNumber={guest.table}
            onSelect={(newTableNumber) => {
              onMove(guest, newTableNumber);
              onClose();
            }}
          />
        </div>

        <div className="text-center">
          <button
            className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400 text-sm"
            onClick={onClose}
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
