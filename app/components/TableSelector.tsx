import React, { useEffect, useRef } from "react";
import type { Table, Guest } from "../types/types";
import {
  getGuestsAtTable,
  getOccupiedSeats,
  getAvailableSeats,
} from "../utilityFunctions/tableFunctions";

interface TableSelectorProps {
  tables: Table[];
  guests: Guest[];
  onSelect: (tableNumber: string) => void;
  selectedTableNumber?: string;
}

export default function TableSelector({
  tables,
  guests,
  onSelect,
  selectedTableNumber,
}: TableSelectorProps) {
  const selectedRef = useRef<HTMLDivElement | null>(null);

  // 🟧 כשנטען, גולל אוטומטית לשולחן הנוכחי
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [selectedTableNumber]);

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
      {tables
        .slice()
        .sort((a, b) => parseInt(a.number) - parseInt(b.number))
        .map((table) => {
          const guestsAtTable = getGuestsAtTable(guests, table.number);
          const occupied = getOccupiedSeats(guests, table.number);
          const available = getAvailableSeats(table, guests);
          const isSelected = table.number === selectedTableNumber;

          return (
            <div
              key={table.number}
              ref={isSelected ? selectedRef : null} // 🟧 שמירת ref לשולחן הנבחר
              onClick={() => onSelect(table.number)}
              className={`border p-3 rounded cursor-pointer transition hover:bg-gray-100 ${
                isSelected ? "bg-blue-100 border-blue-400" : "bg-white"
              }`}
            >
              <div className="font-bold text-sm">
                שולחן {table.number} — תפוסים: {occupied} / {table.totalSeats} —
                פנויים: <span dir="ltr">{available}</span>
              </div>

              {table.note && (
                <div className="text-xs text-yellow-700 mt-1 italic">
                  הערה: {table.note}
                </div>
              )}

              <div className="text-xs text-gray-600 mt-1">
                {guestsAtTable.length > 0
                  ? guestsAtTable.map((g) => g.name).join(", ")
                  : "אין אורחים בשולחן"}
              </div>
            </div>
          );
        })}
    </div>
  );
}
